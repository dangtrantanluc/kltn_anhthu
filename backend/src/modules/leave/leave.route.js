const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const db = require('../../config/db');

// GET /api/leave  — User sees own, HR/Admin sees all
router.get('/', verifyToken, async (req, res) => {
    try {
        const { userId, role } = req.user;
        let rows;

        if (['admin', 'hr', 'manager'].includes(role)) {
            [rows] = await db.execute(
                `SELECT lr.*, u.full_name, u.employee_code
         FROM leave_requests lr JOIN users u ON u.id = lr.user_id
         ORDER BY lr.created_at DESC`
            );
        } else {
            [rows] = await db.execute(
                `SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );
        }
        return res.json({ leaveRequests: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// POST /api/leave — User submits a leave request
router.post('/', verifyToken, async (req, res) => {
    const { leave_type, start_date, end_date, reason } = req.body;
    if (!start_date || !end_date) {
        return res.status(400).json({ message: 'start_date and end_date are required.' });
    }
    try {
        const [result] = await db.execute(
            `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?)`,
            [req.user.userId, leave_type || 'other', start_date, end_date, reason || null]
        );
        return res.status(201).json({ message: 'Leave request submitted.', id: result.insertId });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// PUT /api/leave/:id/approve — HR/Admin approves/rejects
router.put('/:id/approve', verifyToken, checkRole(['admin', 'hr', 'manager']), async (req, res) => {
    const { status } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'status must be approved or rejected.' });
    }
    try {
        await db.execute(
            `UPDATE leave_requests SET status=?, approved_by=?, approved_at=NOW() WHERE id=?`,
            [status, req.user.userId, req.params.id]
        );
        return res.json({ message: `Leave request ${status}.` });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

module.exports = router;
