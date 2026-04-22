const { hashPassword } = require('../../utils/password');
const service = require('./users.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const mapDuplicateError = (err) => {
    if (err.code !== 'ER_DUP_ENTRY') return null;
    const msg = err.sqlMessage || '';
    if (msg.includes("users.email")) return 'Email đã tồn tại.';
    if (msg.includes('employee_code')) return 'Mã nhân viên đã tồn tại.';
    return 'Dữ liệu bị trùng.';
};

// GET /users
const getAllUsers = asyncHandler(async (req, res) => {
    const data = await service.listUsers(req.query);
    return res.json(data);
});

// GET /users/:id
const getUserById = asyncHandler(async (req, res) => {
    const user = await service.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    return res.json({ user });
});

// POST /users
const createUser = asyncHandler(async (req, res) => {
    try {
        const password_hash = await hashPassword(req.body.password);
        const id = await service.createUser({ ...req.body, password_hash });
        return res.status(201).json({ message: 'Tạo người dùng thành công.', userId: id });
    } catch (err) {
        const dup = mapDuplicateError(err);
        if (dup) return res.status(409).json({ message: dup });
        console.error('[Users] createUser:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
});

// PUT /users/:id
const updateUser = asyncHandler(async (req, res) => {
    try {
        const existing = await service.getUserById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        await service.updateUser(req.params.id, req.body);
        return res.json({ message: 'Cập nhật người dùng thành công.' });
    } catch (err) {
        const dup = mapDuplicateError(err);
        if (dup) return res.status(409).json({ message: dup });
        console.error('[Users] updateUser:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
});

// DELETE /users/:id — soft delete
const deleteUser = asyncHandler(async (req, res) => {
    if (String(req.user.userId) === String(req.params.id)) {
        return res.status(400).json({ message: 'Không thể xoá tài khoản đang đăng nhập.' });
    }
    const ok = await service.softDeleteUser(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    return res.json({ message: 'Đã vô hiệu hoá người dùng.' });
});

// PATCH /users/me — nhân viên tự sửa
const updateMe = asyncHandler(async (req, res) => {
    await service.updateMe(req.user.userId, req.body);
    const user = await service.getUserById(req.user.userId);
    return res.json({ message: 'Cập nhật thành công.', user });
});

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateMe,
};
