const bcrypt = require('bcryptjs');
const service = require('./users.service');

const getAllUsers = async (req, res) => {
    try {
        const users = await service.getAllUsers();
        return res.json({ users });
    } catch (err) {
        console.error('[Users] getAllUsers error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await service.getUserById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        return res.json({ user });
    } catch (err) {
        console.error('[Users] getUserById error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const createUser = async (req, res) => {
    const {
        employee_code, full_name, email, password,
        role = 'USER', gender, birthdate,
        department_id, position_id, shift_id, manager_id,
        base_hourly_wage = 0.00, salary_multiplier = 1.00,
    } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({ message: 'full_name, email, password là bắt buộc.' });
    }

    const VALID_ROLES = ['ADMIN', 'HR', 'MANAGER', 'USER'];
    if (!VALID_ROLES.includes(role.toUpperCase())) {
        return res.status(400).json({ message: `Role phải là một trong: ${VALID_ROLES.join(', ')}` });
    }

    try {
        const password_hash = await bcrypt.hash(password, 12);
        const id = await service.createUser({
            employee_code, email, password_hash, full_name, role, gender,
            birthdate, department_id, position_id, shift_id, manager_id,
            base_hourly_wage, salary_multiplier
        });
        return res.status(201).json({ message: 'Tạo người dùng thành công.', userId: id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email hoặc employee_code đã tồn tại.' });
        }
        console.error('[Users] createUser error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const updateUser = async (req, res) => {
    const {
        full_name, gender, birthdate,
        role = 'USER', department_id, position_id, shift_id, manager_id,
        base_hourly_wage = 0, salary_multiplier = 1, is_active,
    } = req.body;

    try {
        await service.updateUser(req.params.id, {
            full_name, gender, birthdate, role,
            department_id, position_id, shift_id, manager_id,
            base_hourly_wage, salary_multiplier, is_active
        });
        return res.json({ message: 'Cập nhật người dùng thành công.' });
    } catch (err) {
        console.error('[Users] updateUser error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser };
