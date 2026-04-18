const service = require('./shifts.service');

const getAll = async (req, res) => {
    try {
        const shifts = await service.getAllShifts();
        return res.json({ shifts });
    } catch (err) {
        console.error('[Shifts] getAll error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const create = async (req, res) => {
    const { shift_name, start_time, end_time, allowed_late_mins = 0 } = req.body;
    if (!shift_name || !start_time || !end_time) {
        return res.status(400).json({ message: 'shift_name, start_time, end_time là bắt buộc.' });
    }
    try {
        const id = await service.createShift(shift_name, start_time, end_time, allowed_late_mins);
        return res.status(201).json({ message: 'Tạo ca làm việc thành công.', id });
    } catch (err) {
        console.error('[Shifts] create error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const update = async (req, res) => {
    const { shift_name, start_time, end_time, allowed_late_mins } = req.body;
    try {
        await service.updateShift(req.params.id, shift_name, start_time, end_time, allowed_late_mins ?? 0);
        return res.json({ message: 'Cập nhật ca làm việc thành công.' });
    } catch (err) {
        console.error('[Shifts] update error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { getAll, create, update };
