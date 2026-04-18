const service = require('./departments.service');

const getAll = async (req, res) => {
    try {
        const departments = await service.getAllDepartments();
        return res.json({ departments });
    } catch (err) {
        console.error('[Depts] getAll error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const create = async (req, res) => {
    const { code, name, manager_id } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code và name là bắt buộc.' });
    try {
        const id = await service.createDepartment(code, name, manager_id);
        return res.status(201).json({ message: 'Tạo phòng ban thành công.', id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Mã phòng ban đã tồn tại.' });
        console.error('[Depts] create error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const update = async (req, res) => {
    const { name, manager_id } = req.body;
    try {
        await service.updateDepartment(req.params.id, name, manager_id);
        return res.json({ message: 'Cập nhật phòng ban thành công.' });
    } catch (err) {
        console.error('[Depts] update error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const remove = async (req, res) => {
    try {
        await service.removeDepartment(req.params.id);
        return res.json({ message: 'Đã xóa phòng ban.' });
    } catch (err) {
        console.error('[Depts] remove error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { getAll, create, update, remove };
