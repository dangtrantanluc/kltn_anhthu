const db = require('../../config/db');

const getAllRequests = async (userId, role) => {
    let rows;
    if (['ADMIN', 'HR', 'MANAGER'].includes(role)) {
        [rows] = await db.execute(
            `SELECT r.*, u.full_name, u.employee_code, rv.full_name AS reviewer_name
       FROM requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users rv ON rv.id = r.reviewer_id
       ORDER BY r.created_at DESC`
        );
    } else {
        [rows] = await db.execute(
            `SELECT r.*, rv.full_name AS reviewer_name
       FROM requests r
       LEFT JOIN users rv ON rv.id = r.reviewer_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
            [userId]
        );
    }
    return rows;
};

const createRequest = async (userId, data) => {
    const [result] = await db.execute(
        `INSERT INTO requests
       (user_id, request_type, leave_type, target_date, requested_check_in, requested_check_out, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            data.request_type.toUpperCase(),
            data.leave_type ? data.leave_type.toUpperCase() : null,
            data.target_date,
            data.requested_check_in || null,
            data.requested_check_out || null,
            data.reason,
        ]
    );
    return result.insertId;
};

const reviewRequest = async (id, reviewerId, status, rejectReason) => {
    await db.execute(
        `UPDATE requests SET status=?, reviewer_id=?, reject_reason=? WHERE id=?`,
        [status.toUpperCase(), reviewerId, rejectReason || null, id]
    );
};

module.exports = {
    getAllRequests,
    createRequest,
    reviewRequest
};
