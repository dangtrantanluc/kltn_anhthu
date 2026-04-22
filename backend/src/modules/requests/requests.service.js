const db = require('../../config/db');

const SELECT_BASE = `
  r.id, r.user_id, r.request_type, r.leave_type, r.target_date,
  r.requested_check_in, r.requested_check_out, r.reason, r.status,
  r.reject_reason, r.reviewer_id, r.created_at, r.updated_at,
  u.full_name, u.employee_code, u.department_id,
  d.name AS department,
  rv.full_name AS reviewer_name
`;

const JOIN_BASE = `
  FROM requests r
  JOIN users u ON u.id = r.user_id
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN users rv ON rv.id = r.reviewer_id
`;

// ──────────────────────────────────────────────────────────
// List với scope
// scope = 'me' | 'pending' | 'all'
// Manager luôn bị filter theo department
// ──────────────────────────────────────────────────────────
const listRequests = async ({
    userId,
    role,
    scope = 'me',
    status,
    request_type,
    page = 1,
    limit = 20,
    departmentId,
}) => {
    const where = [];
    const params = [];

    if (role === 'USER' || scope === 'me') {
        where.push('r.user_id = ?');
        params.push(userId);
    } else if (role === 'MANAGER') {
        where.push('u.department_id = ?');
        params.push(departmentId);
    }
    // ADMIN/HR + scope in ('all','pending') → không thêm filter

    if (scope === 'pending') {
        where.push("r.status = 'PENDING'");
    } else if (status) {
        where.push('r.status = ?');
        params.push(status);
    }

    if (request_type) {
        where.push('r.request_type = ?');
        params.push(request_type);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total ${JOIN_BASE} ${whereSql}`,
        params
    );
    const [rows] = await db.query(
        `SELECT ${SELECT_BASE} ${JOIN_BASE} ${whereSql}
     ORDER BY r.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    return { items: rows, total, page, limit };
};

const countPending = async ({ role, userId, departmentId }) => {
    const where = ["r.status = 'PENDING'"];
    const params = [];
    if (role === 'MANAGER') {
        where.push('u.department_id = ?');
        params.push(departmentId);
    } else if (!['ADMIN', 'HR'].includes(role)) {
        return 0;
    }
    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total ${JOIN_BASE} WHERE ${where.join(' AND ')}`,
        params
    );
    return total;
};

const getById = async (id) => {
    const [rows] = await db.query(
        `SELECT ${SELECT_BASE} ${JOIN_BASE} WHERE r.id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

// ──────────────────────────────────────────────────────────
// Create — validate overlap
// ──────────────────────────────────────────────────────────
const createRequest = async (userId, data) => {
    // Overlap check: đơn PENDING hoặc APPROVED cùng user+ngày+loại
    const [dup] = await db.execute(
        `SELECT id FROM requests
      WHERE user_id = ? AND target_date = ? AND request_type = ?
        AND status IN ('PENDING','APPROVED')
      LIMIT 1`,
        [userId, data.target_date, data.request_type]
    );
    if (dup.length) {
        const e = new Error(
            'Bạn đã có đơn cùng loại (đang chờ hoặc đã duyệt) cho ngày này.'
        );
        e.status = 409;
        throw e;
    }

    // Với MISSING_PUNCH: nếu ngày đó đã có attendance PRESENT → không cho tạo
    if (data.request_type === 'MISSING_PUNCH') {
        const [att] = await db.execute(
            `SELECT id, status FROM attendances
        WHERE user_id = ? AND work_date = ?`,
            [userId, data.target_date]
        );
        if (att.length && att[0].status === 'PRESENT') {
            const e = new Error(
                'Ngày này đã có chấm công đầy đủ, không thể xin bổ sung.'
            );
            e.status = 409;
            throw e;
        }
    }

    const [result] = await db.execute(
        `INSERT INTO requests
       (user_id, request_type, leave_type, target_date, requested_check_in, requested_check_out, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            data.request_type,
            data.leave_type || null,
            data.target_date,
            data.requested_check_in || null,
            data.requested_check_out || null,
            data.reason,
        ]
    );
    return result.insertId;
};

// ──────────────────────────────────────────────────────────
// Approve / Reject
// ──────────────────────────────────────────────────────────
const approveRequest = async (id, reviewer) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT r.*, u.department_id
         FROM requests r JOIN users u ON u.id = r.user_id
        WHERE r.id = ? LIMIT 1`,
            [id]
        );
        const req = rows[0];
        if (!req) throw withStatus(new Error('Không tìm thấy đơn.'), 404);
        if (req.status !== 'PENDING') {
            throw withStatus(
                new Error(`Đơn đã ở trạng thái ${req.status}, không thể duyệt lại.`),
                409
            );
        }
        // Manager scope
        if (reviewer.role === 'MANAGER' && reviewer.departmentId !== req.department_id) {
            throw withStatus(
                new Error('Bạn chỉ có thể duyệt đơn của phòng ban mình.'),
                403
            );
        }

        // Với MISSING_PUNCH: cập nhật bảng attendances
        if (req.request_type === 'MISSING_PUNCH') {
            const checkInDt = req.requested_check_in
                ? `${req.target_date} ${req.requested_check_in}`
                : null;
            const checkOutDt = req.requested_check_out
                ? `${req.target_date} ${req.requested_check_out}`
                : null;

            // Lookup shift để tính lại late_mins
            const [shiftRows] = await conn.execute(
                `SELECT s.start_time, s.end_time, s.allowed_late_mins
           FROM users u LEFT JOIN shifts s ON s.id = u.shift_id
          WHERE u.id = ?`,
                [req.user_id]
            );
            const shift = shiftRows[0] || {};

            let lateMins = 0;
            if (checkInDt && shift.start_time) {
                const [sh, sm] = shift.start_time.split(':').map(Number);
                const shiftStart = new Date(`${req.target_date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
                const diff = new Date(checkInDt) - shiftStart;
                const allowed = (shift.allowed_late_mins || 0) * 60 * 1000;
                if (diff > allowed) lateMins = Math.floor(diff / 60000);
            }

            let total = 0;
            if (checkInDt && checkOutDt) {
                total = parseFloat(
                    ((new Date(checkOutDt) - new Date(checkInDt)) / 3600000).toFixed(2)
                );
            }

            let status = 'MISSING_CHECKOUT';
            if (checkInDt && checkOutDt) status = lateMins > 0 ? 'LATE' : 'PRESENT';

            await conn.execute(
                `INSERT INTO attendances
           (user_id, work_date, check_in_time, check_out_time,
            late_mins, early_leave_mins, total_worked_hours, status)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)
         ON DUPLICATE KEY UPDATE
           check_in_time      = IFNULL(VALUES(check_in_time), check_in_time),
           check_out_time     = IFNULL(VALUES(check_out_time), check_out_time),
           late_mins          = VALUES(late_mins),
           total_worked_hours = VALUES(total_worked_hours),
           status             = VALUES(status)`,
                [req.user_id, req.target_date, checkInDt, checkOutDt, lateMins, total, status]
            );
        }
        // LEAVE_REQUEST: không tạo ngay — khi tính lương sẽ cộng vào total_paid_leave_hours

        await conn.execute(
            `UPDATE requests SET status='APPROVED', reviewer_id=?, reject_reason=NULL
        WHERE id = ?`,
            [reviewer.userId, id]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const rejectRequest = async (id, reviewer, reason) => {
    const [rows] = await db.execute(
        `SELECT r.*, u.department_id
       FROM requests r JOIN users u ON u.id = r.user_id
      WHERE r.id = ? LIMIT 1`,
        [id]
    );
    const req = rows[0];
    if (!req) throw withStatus(new Error('Không tìm thấy đơn.'), 404);
    if (req.status !== 'PENDING') {
        throw withStatus(
            new Error(`Đơn đã ở trạng thái ${req.status}, không thể từ chối lại.`),
            409
        );
    }
    if (reviewer.role === 'MANAGER' && reviewer.departmentId !== req.department_id) {
        throw withStatus(
            new Error('Bạn chỉ có thể duyệt đơn của phòng ban mình.'),
            403
        );
    }

    await db.execute(
        `UPDATE requests SET status='REJECTED', reviewer_id=?, reject_reason=?
      WHERE id = ?`,
        [reviewer.userId, reason, id]
    );
};

// Owner có thể huỷ đơn khi còn PENDING
const cancelOwnRequest = async (id, userId) => {
    const [rows] = await db.execute(
        `SELECT id, status, user_id FROM requests WHERE id = ? LIMIT 1`,
        [id]
    );
    const req = rows[0];
    if (!req || req.user_id !== userId) {
        throw withStatus(new Error('Không tìm thấy đơn.'), 404);
    }
    if (req.status !== 'PENDING') {
        throw withStatus(new Error('Đơn đã được xử lý, không thể huỷ.'), 409);
    }
    await db.execute('DELETE FROM requests WHERE id = ?', [id]);
};

function withStatus(err, status) {
    err.status = status;
    return err;
}

module.exports = {
    listRequests,
    countPending,
    getById,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelOwnRequest,
};
