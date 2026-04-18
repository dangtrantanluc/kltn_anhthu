const db = require('../../config/db');

/**
 * processPunchLogs()
 *
 * 1. Fetch all unprocessed punch_logs
 * 2. Group by employee_code + work_date (DATE part of punch_time)
 * 3. MIN → check_in_time, MAX → check_out_time
 * 4. Calculate late_mins, early_leave_mins, total_worked_hours, status
 * 5. UPSERT into attendances
 * 6. Mark logs as is_processed = TRUE
 */
const processPunchLogs = async () => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Step 1: All unprocessed logs
        const [logs] = await conn.execute(
            `SELECT id, employee_code, punch_time, DATE(punch_time) AS work_date
       FROM punch_logs
       WHERE is_processed = 0
       ORDER BY punch_time ASC`
        );

        if (logs.length === 0) {
            conn.release();
            return 0;
        }

        // Step 2: Group by employee_code + work_date
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

        let processedCount = 0;

        for (const key of Object.keys(grouped)) {
            const { employee_code, work_date, punch_times, log_ids } = grouped[key];

            const checkIn = new Date(Math.min(...punch_times));
            const checkOut = punch_times.length > 1
                ? new Date(Math.max(...punch_times))
                : null;

            // Lookup user with their shift
            const [users] = await conn.execute(
                `SELECT u.id, u.shift_id, s.start_time, s.end_time, s.allowed_late_mins
         FROM users u
         LEFT JOIN shifts s ON s.id = u.shift_id
         WHERE u.employee_code = ?
         LIMIT 1`,
                [employee_code]
            );
            if (users.length === 0) continue;

            const { id: userId, start_time, end_time, allowed_late_mins = 0 } = users[0];

            // Calculate late_mins
            let lateMins = 0;
            if (start_time) {
                const [sh, sm] = start_time.split(':').map(Number);
                const shiftStart = new Date(checkIn);
                shiftStart.setHours(sh, sm, 0, 0);
                const diffMs = checkIn - shiftStart;
                if (diffMs > allowed_late_mins * 60 * 1000) {
                    lateMins = Math.floor(diffMs / 60000);
                }
            }

            // Calculate early_leave_mins
            let earlyLeaveMins = 0;
            if (checkOut && end_time) {
                const [eh, em] = end_time.split(':').map(Number);
                const shiftEnd = new Date(checkOut);
                shiftEnd.setHours(eh, em, 0, 0);
                const diffMs = shiftEnd - checkOut;
                if (diffMs > 0) {
                    earlyLeaveMins = Math.floor(diffMs / 60000);
                }
            }

            // Calculate total_worked_hours
            let totalWorkedHours = 0;
            if (checkOut) {
                totalWorkedHours = parseFloat(((checkOut - checkIn) / 3600000).toFixed(2));
            }

            // Determine status (uppercase enums per schema)
            let status = 'ABSENT';
            if (checkIn) {
                if (!checkOut) {
                    status = 'MISSING_CHECKOUT';
                } else if (lateMins > 0) {
                    status = 'LATE';
                } else {
                    status = 'PRESENT';
                }
            }

            // UPSERT into attendances
            await conn.execute(
                `INSERT INTO attendances
           (user_id, work_date, check_in_time, check_out_time,
            late_mins, early_leave_mins, total_worked_hours, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           check_in_time       = LEAST(check_in_time, VALUES(check_in_time)),
           check_out_time      = IF(
             VALUES(check_out_time) IS NULL, check_out_time,
             GREATEST(IFNULL(check_out_time, VALUES(check_out_time)), VALUES(check_out_time))
           ),
           late_mins           = VALUES(late_mins),
           early_leave_mins    = VALUES(early_leave_mins),
           total_worked_hours  = VALUES(total_worked_hours),
           status              = VALUES(status)`,
                [userId, work_date, checkIn, checkOut, lateMins, earlyLeaveMins, totalWorkedHours, status]
            );

            // Mark logs processed
            if (log_ids.length > 0) {
                const placeholders = log_ids.map(() => '?').join(',');
                await conn.execute(
                    `UPDATE punch_logs SET is_processed = 1 WHERE id IN (${placeholders})`,
                    log_ids
                );
            }

            processedCount += log_ids.length;
        }

        await conn.commit();
        console.log(`[CRON] ✅ Processed ${processedCount} punch log(s) across ${Object.keys(grouped).length} group(s).`);
        return processedCount;
    } catch (err) {
        await conn.rollback();
        console.error('[CRON] processPunchLogs error:', err);
        throw err;
    } finally {
        conn.release();
    }
};

const syncPunchLogs = async (logs) => {
    let inserted = 0;
    let skipped = 0;

    for (const log of logs) {
        const { employee_code, punch_time, punch_type = 'UNKNOWN', device_id = null } = log;
        if (!employee_code || !punch_time) { skipped++; continue; }

        const [result] = await db.execute(
            `INSERT IGNORE INTO punch_logs (employee_code, punch_time, punch_type, device_id)
       VALUES (?, ?, ?, ?)`,
            [employee_code, punch_time, punch_type.toUpperCase(), device_id]
        );
        result.affectedRows > 0 ? inserted++ : skipped++;
    }
    return { inserted, skipped };
};

const getMyAttendance = async (userId, targetMonth, targetYear) => {
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
        [userId, targetMonth, targetYear]
    );
    return rows;
};

const getAllAttendance = async (targetMonth, targetYear, user_id) => {
    let query = `
    SELECT a.id, a.user_id, a.work_date, a.check_in_time, a.check_out_time,
           a.late_mins, a.early_leave_mins, a.total_worked_hours, a.status,
           u.full_name, u.employee_code,
           d.name AS department, s.shift_name
    FROM attendances a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN shifts      s ON s.id = u.shift_id
    WHERE MONTH(a.work_date) = ? AND YEAR(a.work_date) = ?
  `;
    const params = [targetMonth, targetYear];

    if (user_id) { query += ' AND a.user_id = ?'; params.push(user_id); }
    query += ' ORDER BY a.work_date DESC, u.full_name ASC';

    const [rows] = await db.execute(query, params);
    return rows;
};

module.exports = {
    processPunchLogs,
    syncPunchLogs,
    getMyAttendance,
    getAllAttendance
};
