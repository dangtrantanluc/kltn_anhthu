const service = require('./attendance.service');

const syncPunchLogs = async (req, res) => {
    const logs = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ message: 'Body phải là mảng không rỗng.' });
    }

    try {
        const { inserted, skipped } = await service.syncPunchLogs(logs);
        return res.status(201).json({ message: 'Đồng bộ hoàn tất.', inserted, skipped });
    } catch (err) {
        console.error('[Attendance] syncPunchLogs error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const triggerProcess = async (req, res) => {
    try {
        const count = await service.processPunchLogs();
        return res.json({ message: `Xử lý hoàn tất.`, processedLogs: count });
    } catch (err) {
        console.error('[Attendance] triggerProcess error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const getMyAttendance = async (req, res) => {
    const userId = req.user.userId;
    const now = new Date();
    const targetMonth = parseInt(req.query.month) || now.getMonth() + 1;
    const targetYear = parseInt(req.query.year) || now.getFullYear();

    try {
        const attendances = await service.getMyAttendance(userId, targetMonth, targetYear);
        return res.json({ month: targetMonth, year: targetYear, attendances });
    } catch (err) {
        console.error('[Attendance] getMyAttendance error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const getAllAttendance = async (req, res) => {
    const now = new Date();
    const targetMonth = parseInt(req.query.month) || now.getMonth() + 1;
    const targetYear = parseInt(req.query.year) || now.getFullYear();
    const { user_id } = req.query;

    try {
        const attendances = await service.getAllAttendance(targetMonth, targetYear, user_id);
        return res.json({ month: targetMonth, year: targetYear, attendances });
    } catch (err) {
        console.error('[Attendance] getAllAttendance error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { syncPunchLogs, triggerProcess, getMyAttendance, getAllAttendance };
