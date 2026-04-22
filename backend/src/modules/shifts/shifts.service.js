const db = require('../../config/db');

const getAllShifts = async () => {
    const [rows] = await db.execute(
        `SELECT * FROM shifts ORDER BY shift_name`
    );
    return rows;
};

const createShift = async (shift_name, start_time, end_time, allowed_late_mins) => {
    const [result] = await db.execute(
        `INSERT INTO shifts (shift_name, start_time, end_time, allowed_late_mins) VALUES (?, ?, ?, ?)`,
        [shift_name, start_time, end_time, allowed_late_mins]
    );
    return result.insertId;
};

const updateShift = async (id, shift_name, start_time, end_time, allowed_late_mins) => {
    await db.execute(
        `UPDATE shifts SET shift_name=?, start_time=?, end_time=?, allowed_late_mins=? WHERE id=?`,
        [shift_name, start_time, end_time, allowed_late_mins, id]
    );
};

const removeShift = async (id) => {
    // Chặn xoá nếu đang được dùng
    const [[{ count }]] = await db.query(
        'SELECT COUNT(*) AS count FROM users WHERE shift_id = ?',
        [id]
    );
    if (count > 0) {
        const err = new Error(`Ca đang được gán cho ${count} nhân viên, không thể xoá.`);
        err.status = 409;
        throw err;
    }
    const [r] = await db.execute('DELETE FROM shifts WHERE id = ?', [id]);
    return r.affectedRows > 0;
};

module.exports = { getAllShifts, createShift, updateShift, removeShift };
