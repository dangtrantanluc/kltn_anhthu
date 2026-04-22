const service = require('./locations.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const list = asyncHandler(async (req, res) => {
    const activeOnly = req.query.active_only === 'true';
    const locations = await service.listAll({ active_only: activeOnly });
    res.json({ locations });
});

const getById = asyncHandler(async (req, res) => {
    const location = await service.getById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Không tìm thấy địa điểm.' });
    res.json({ location });
});

const create = asyncHandler(async (req, res) => {
    const id = await service.create(req.body);
    res.status(201).json({ message: 'Tạo địa điểm thành công.', id });
});

const update = asyncHandler(async (req, res) => {
    const existing = await service.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy địa điểm.' });
    await service.update(req.params.id, req.body);
    res.json({ message: 'Cập nhật thành công.' });
});

const remove = asyncHandler(async (req, res) => {
    const ok = await service.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Không tìm thấy địa điểm.' });
    res.json({ message: 'Đã xoá địa điểm.' });
});

module.exports = { list, getById, create, update, remove };
