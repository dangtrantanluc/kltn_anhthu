const db = require('../../config/db');
const service = require('./attendance.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// POST /attendance/punch — USER tự chấm công
const punch = asyncHandler(async (req, res) => {
    try {
        const result = await service.punch({
            userId: req.user.userId,
            employeeCode: req.user.employeeCode,
            type: req.body.type,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            deviceId: req.body.device_id,
        });
        return res.status(201).json({
            message: `Chấm công ${req.body.type === 'IN' ? 'vào' : 'ra'} thành công.`,
            ...result,
        });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        console.error('[Attendance] punch:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
});

// POST /attendance/sync — import từ máy chấm công
const syncPunchLogs = asyncHandler(async (req, res) => {
    const logs = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ message: 'Body phải là mảng không rỗng.' });
    }
    const { inserted, skipped } = await service.syncPunchLogs(logs);
    res.status(201).json({ message: 'Đồng bộ hoàn tất.', inserted, skipped });
});

// POST /attendance/rollup (alias /process)
const triggerProcess = asyncHandler(async (req, res) => {
    const count = await service.processPunchLogs();
    res.json({ message: 'Xử lý hoàn tất.', processedLogs: count });
});

const parseMonthYear = (req) => {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    return { month, year };
};

// GET /attendance/me
const getMyAttendance = asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYear(req);
    const attendances = await service.getMyAttendance(req.user.userId, month, year);
    res.json({ month, year, attendances });
});

// GET /attendance — Admin (all) / Manager (scoped to dept)
const getAllAttendance = asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYear(req);
    const { user_id, department_id } = req.query;

    // MANAGER: chỉ xem phòng ban của mình
    let scopeDepartmentId = null;
    if (req.user.role === 'MANAGER') {
        const [rows] = await db.execute(
            'SELECT department_id FROM users WHERE id = ?',
            [req.user.userId]
        );
        scopeDepartmentId = rows[0]?.department_id;
        if (!scopeDepartmentId) {
            return res.json({ month, year, attendances: [] });
        }
    }

    const attendances = await service.getAllAttendance({
        month,
        year,
        user_id,
        department_id,
        scopeDepartmentId,
    });
    res.json({ month, year, attendances });
});

// PUT /attendance/:id — Admin/Manager sửa thủ công
const editAttendance = asyncHandler(async (req, res) => {
    const existing = await service.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy bản ghi.' });

    // MANAGER chỉ sửa user cùng phòng ban
    if (req.user.role === 'MANAGER') {
        const [rows] = await db.execute(
            'SELECT department_id FROM users WHERE id = ?',
            [req.user.userId]
        );
        if (!rows[0] || rows[0].department_id !== existing.department_id) {
            return res.status(403).json({ message: 'Không có quyền sửa bản ghi này.' });
        }
    }

    const updated = await service.editAttendance(req.params.id, req.body);
    res.json({ message: 'Cập nhật thành công.', attendance: updated });
});

module.exports = {
    punch,
    syncPunchLogs,
    triggerProcess,
    getMyAttendance,
    getAllAttendance,
    editAttendance,
};
