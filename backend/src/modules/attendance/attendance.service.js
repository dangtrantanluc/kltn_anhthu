const db = require('../../config/db');
const { findNearestLocation } = require('../../utils/geo');

// ──────────────────────────────────────────────────────────
// Core computation helpers
// ──────────────────────────────────────────────────────────

const computeAttendanceFromPunches = (punchTimes, shift) => {
    const checkIn = new Date(Math.min(...punchTimes));
    const checkOut =
        punchTimes.length > 1 ? new Date(Math.max(...punchTimes)) : null;

    let lateMins = 0;
    if (shift?.start_time) {
        const [sh, sm] = shift.start_time.split(':').map(Number);
        const shiftStart = new Date(checkIn);
        shiftStart.setHours(sh, sm, 0, 0);
        const diffMs = checkIn - shiftStart;
        const allowed = (shift.allowed_late_mins || 0) * 60 * 1000;
        if (diffMs > allowed) lateMins = Math.floor(diffMs / 60000);
    }

    let earlyLeaveMins = 0;
    if (checkOut && shift?.end_time) {
        const [eh, em] = shift.end_time.split(':').map(Number);
        const shiftEnd = new Date(checkOut);
        shiftEnd.setHours(eh, em, 0, 0);
        const diffMs = shiftEnd - checkOut;
        if (diffMs > 0) earlyLeaveMins = Math.floor(diffMs / 60000);
    }

    const totalWorkedHours = checkOut
        ? parseFloat(((checkOut - checkIn) / 3600000).toFixed(2))
        : 0;

    let status = 'ABSENT';
    if (checkIn) {
        if (!checkOut) status = 'MISSING_CHECKOUT';
        else if (lateMins > 0) status = 'LATE';
        else status = 'PRESENT';
    }
    return { checkIn, checkOut, lateMins, earlyLeaveMins, totalWorkedHours, status };
};

const upsertAttendance = async (
    conn,
    userId,
    workDate,
    { checkIn, checkOut, lateMins, earlyLeaveMins, totalWorkedHours, status }
) => {
    await conn.execute(
        `INSERT INTO attendances
       (user_id, work_date, check_in_time, check_out_time,
        late_mins, early_leave_mins, total_worked_hours, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       check_in_time      = LEAST(check_in_time, VALUES(check_in_time)),
       check_out_time     = IF(
         VALUES(check_out_time) IS NULL, check_out_time,
         GREATEST(IFNULL(check_out_time, VALUES(check_out_time)), VALUES(check_out_time))
       ),
       late_mins          = VALUES(late_mins),
       early_leave_mins   = VALUES(early_leave_mins),
       total_worked_hours = VALUES(total_worked_hours),
       status             = VALUES(status)`,
        [userId, workDate, checkIn, checkOut, lateMins, earlyLeaveMins, totalWorkedHours, status]
    );
};

// ──────────────────────────────────────────────────────────
// Batch rollup (cron hoặc thủ công)
// ──────────────────────────────────────────────────────────
const processPunchLogs = async () => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [logs] = await conn.execute(
            `SELECT id, employee_code, punch_time, DATE(punch_time) AS work_date
       FROM punch_logs WHERE is_processed = 0 ORDER BY punch_time ASC`
        );
        if (logs.length === 0) {
            await conn.commit();
            conn.release();
            return 0;
        }

        const grouped = {};
        for (const log of logs) {
            const key = `${log.employee_code}||${log.work_date}`;
            if (!grouped[key]) {
                grouped[key] = {
                    employee_code: log.employee_code,
                    work_date: log.work_date,
                    punch_times: [],
                    log_ids: [],
                };
            }
            grouped[key].punch_times.push(new Date(log.punch_time));
            grouped[key].log_ids.push(log.id);
        }

        let processed = 0;
        for (const key of Object.keys(grouped)) {
            const { employee_code, work_date, punch_times, log_ids } = grouped[key];

            const [users] = await conn.execute(
                `SELECT u.id, u.shift_id, s.start_time, s.end_time, s.allowed_late_mins
           FROM users u
           LEFT JOIN shifts s ON s.id = u.shift_id
          WHERE u.employee_code = ? LIMIT 1`,
                [employee_code]
            );
            if (users.length === 0) continue;

            const userRow = users[0];
            const attendance = computeAttendanceFromPunches(punch_times, userRow);
            await upsertAttendance(conn, userRow.id, work_date, attendance);

            const placeholders = log_ids.map(() => '?').join(',');
            await conn.execute(
                `UPDATE punch_logs SET is_processed = 1 WHERE id IN (${placeholders})`,
                log_ids
            );
            processed += log_ids.length;
        }

        await conn.commit();
        console.log(`[rollup] ✅ Processed ${processed} log(s).`);
        return processed;
    } catch (err) {
        await conn.rollback();
        console.error('[rollup] error:', err);
        throw err;
    } finally {
        conn.release();
    }
};

// Target 1 user + 1 ngày — dùng khi punch
const processLogsForUserOnDate = async (employeeCode, workDate) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [logs] = await conn.execute(
            `SELECT id, punch_time FROM punch_logs
        WHERE employee_code = ? AND DATE(punch_time) = ? AND is_processed = 0`,
            [employeeCode, workDate]
        );
        if (logs.length === 0) {
            await conn.commit();
            conn.release();
            return;
        }

        // Include cả log đã process để tổng hợp đúng min/max
        const [allLogs] = await conn.execute(
            `SELECT punch_time FROM punch_logs
        WHERE employee_code = ? AND DATE(punch_time) = ?`,
            [employeeCode, workDate]
        );

        const [users] = await conn.execute(
            `SELECT u.id, u.shift_id, s.start_time, s.end_time, s.allowed_late_mins
         FROM users u LEFT JOIN shifts s ON s.id = u.shift_id
        WHERE u.employee_code = ? LIMIT 1`,
            [employeeCode]
        );
        if (users.length === 0) {
            await conn.commit();
            conn.release();
            return;
        }

        const punchTimes = allLogs.map((r) => new Date(r.punch_time));
        const attendance = computeAttendanceFromPunches(punchTimes, users[0]);
        await upsertAttendance(conn, users[0].id, workDate, attendance);

        const ids = logs.map((l) => l.id);
        const placeholders = ids.map(() => '?').join(',');
        await conn.execute(
            `UPDATE punch_logs SET is_processed = 1 WHERE id IN (${placeholders})`,
            ids
        );
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// ──────────────────────────────────────────────────────────
// Punch (user chấm công với GPS)
// ──────────────────────────────────────────────────────────
const punch = async ({ userId, employeeCode, type, latitude, longitude, deviceId }) => {
    if (!employeeCode) {
        const e = new Error('Tài khoản chưa có mã nhân viên.');
        e.status = 400;
        throw e;
    }

    // Lấy danh sách location active
    const [locations] = await db.execute(
        `SELECT id, name, latitude, longitude, radius_m
       FROM locations WHERE is_active = 1`
    );
    if (locations.length === 0) {
        const e = new Error('Chưa cấu hình địa điểm chấm công.');
        e.status = 400;
        throw e;
    }

    const nearest = findNearestLocation(locations, latitude, longitude);
    if (!nearest || nearest.distance > Number(nearest.location.radius_m)) {
        const e = new Error(
            `Bạn đang cách "${nearest?.location?.name}" khoảng ${Math.round(
                nearest?.distance
            )}m — ngoài phạm vi cho phép (${nearest?.location?.radius_m}m).`
        );
        e.status = 400;
        throw e;
    }

    const now = new Date();
    // MySQL DATETIME format
    const punchTimeSql = now.toISOString().slice(0, 19).replace('T', ' ');

    try {
        await db.execute(
            `INSERT INTO punch_logs
         (employee_code, punch_time, punch_type, device_id, latitude, longitude, location_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                employeeCode,
                punchTimeSql,
                type,
                deviceId || null,
                latitude,
                longitude,
                nearest.location.id,
            ]
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const e = new Error('Bạn vừa chấm công trong giây này, vui lòng thử lại sau.');
            e.status = 409;
            throw e;
        }
        throw err;
    }

    const workDate = punchTimeSql.slice(0, 10);
    await processLogsForUserOnDate(employeeCode, workDate);

    // Trả lại bản ghi chấm công mới nhất cho hôm nay
    const [attRows] = await db.execute(
        `SELECT id, work_date, check_in_time, check_out_time, status,
            late_mins, total_worked_hours
       FROM attendances WHERE user_id = ? AND work_date = ? LIMIT 1`,
        [userId, workDate]
    );

    return {
        punch: { type, time: now, location: nearest.location.name, distance: Math.round(nearest.distance) },
        attendance: attRows[0] || null,
    };
};

// ──────────────────────────────────────────────────────────
// Existing sync (device import)
// ──────────────────────────────────────────────────────────
const syncPunchLogs = async (logs) => {
    let inserted = 0;
    let skipped = 0;

    for (const log of logs) {
        const { employee_code, punch_time, punch_type = 'UNKNOWN', device_id = null } = log;
        if (!employee_code || !punch_time) {
            skipped++;
            continue;
        }
        const [result] = await db.execute(
            `INSERT IGNORE INTO punch_logs (employee_code, punch_time, punch_type, device_id)
         VALUES (?, ?, ?, ?)`,
            [employee_code, punch_time, punch_type.toUpperCase(), device_id]
        );
        if (result.affectedRows > 0) inserted++;
        else skipped++;
    }
    return { inserted, skipped };
};

// ──────────────────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────────────────
const getMyAttendance = async (userId, month, year) => {
    const [rows] = await db.execute(
        `SELECT a.id, a.work_date, a.check_in_time, a.check_out_time,
            a.late_mins, a.early_leave_mins, a.total_worked_hours, a.status,
            s.shift_name, s.start_time AS shift_start, s.end_time AS shift_end
       FROM attendances a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN shifts s ON s.id = u.shift_id
      WHERE a.user_id = ?
        AND MONTH(a.work_date) = ?
        AND YEAR(a.work_date)  = ?
      ORDER BY a.work_date ASC`,
        [userId, month, year]
    );
    return rows;
};

const getAllAttendance = async ({ month, year, user_id, department_id, scopeDepartmentId }) => {
    const where = ['MONTH(a.work_date) = ?', 'YEAR(a.work_date) = ?'];
    const params = [month, year];

    if (user_id) {
        where.push('a.user_id = ?');
        params.push(user_id);
    }
    // Admin scope filter
    const depId = department_id || scopeDepartmentId;
    if (depId) {
        where.push('u.department_id = ?');
        params.push(depId);
    }

    const [rows] = await db.query(
        `SELECT a.id, a.user_id, a.work_date, a.check_in_time, a.check_out_time,
            a.late_mins, a.early_leave_mins, a.total_worked_hours, a.status,
            u.full_name, u.employee_code, u.department_id,
            d.name AS department, s.shift_name
       FROM attendances a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN shifts      s ON s.id = u.shift_id
      WHERE ${where.join(' AND ')}
      ORDER BY a.work_date DESC, u.full_name ASC`,
        params
    );
    return rows;
};

const getById = async (id) => {
    const [rows] = await db.execute(
        `SELECT a.*, u.full_name, u.department_id FROM attendances a
       JOIN users u ON u.id = a.user_id WHERE a.id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

// Admin/Manager sửa thủ công
const editAttendance = async (id, data) => {
    const existing = await getById(id);
    if (!existing) return null;

    const checkIn = data.check_in_time || existing.check_in_time;
    const checkOut = data.check_out_time || existing.check_out_time;

    // Lấy shift của user để recompute late_mins/total_hours
    const [shifts] = await db.execute(
        `SELECT s.start_time, s.end_time, s.allowed_late_mins
       FROM users u LEFT JOIN shifts s ON s.id = u.shift_id WHERE u.id = ?`,
        [existing.user_id]
    );

    let late_mins = existing.late_mins;
    let early_leave_mins = existing.early_leave_mins;
    let total_worked_hours = existing.total_worked_hours;
    let status = data.status || existing.status;

    if (checkIn) {
        const punchTimes = [new Date(checkIn)];
        if (checkOut) punchTimes.push(new Date(checkOut));
        const computed = computeAttendanceFromPunches(punchTimes, shifts[0] || {});
        late_mins = computed.lateMins;
        early_leave_mins = computed.earlyLeaveMins;
        total_worked_hours = computed.totalWorkedHours;
        if (!data.status) status = computed.status;
    }

    await db.execute(
        `UPDATE attendances
        SET check_in_time=?, check_out_time=?, late_mins=?,
            early_leave_mins=?, total_worked_hours=?, status=?
      WHERE id = ?`,
        [checkIn, checkOut, late_mins, early_leave_mins, total_worked_hours, status, id]
    );

    return getById(id);
};

module.exports = {
    processPunchLogs,
    processLogsForUserOnDate,
    punch,
    syncPunchLogs,
    getMyAttendance,
    getAllAttendance,
    getById,
    editAttendance,
    // Exported for tests
    computeAttendanceFromPunches,
};
