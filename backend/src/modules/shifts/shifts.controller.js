const service = require('./shifts.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const getAll = asyncHandler(async (req, res) => {
    const shifts = await service.getAllShifts();
    res.json({ shifts });
});

const create = asyncHandler(async (req, res) => {
    const { shift_name, start_time, end_time, allowed_late_mins } = req.body;
    const id = await service.createShift(shift_name, start_time, end_time, allowed_late_mins);
    res.status(201).json({ message: 'Tạo ca làm việc thành công.', id });
});

const update = asyncHandler(async (req, res) => {
    const { shift_name, start_time, end_time, allowed_late_mins } = req.body;
    await service.updateShift(req.params.id, shift_name, start_time, end_time, allowed_late_mins ?? 0);
    res.json({ message: 'Cập nhật ca làm việc thành công.' });
});

const remove = asyncHandler(async (req, res) => {
    try {
        const ok = await service.removeShift(req.params.id);
        if (!ok) return res.status(404).json({ message: 'Không tìm thấy ca.' });
        res.json({ message: 'Đã xoá ca làm việc.' });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        throw err;
    }
});

module.exports = { getAll, create, update, remove };
