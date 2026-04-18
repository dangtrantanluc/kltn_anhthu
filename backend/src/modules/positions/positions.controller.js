const service = require('./positions.service');

const getAll = async (req, res) => {
    try {
        const positions = await service.getAllPositions();
        return res.json({ positions });
    } catch (err) {
        console.error('[Positions] getAll error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const create = async (req, res) => {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code và name là bắt buộc.' });
    try {
        const id = await service.createPosition(code, name);
        return res.status(201).json({ message: 'Tạo chức vụ thành công.', id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Mã chức vụ đã tồn tại.' });
        console.error('[Positions] create error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const update = async (req, res) => {
    const { name } = req.body;
    try {
        await service.updatePosition(req.params.id, name);
        return res.json({ message: 'Cập nhật chức vụ thành công.' });
    } catch (err) {
        console.error('[Positions] update error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { getAll, create, update };
