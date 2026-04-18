const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const service = require('./auth.service');

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc.' });
    }

    try {
        const user = await service.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị vô hiệu hoá.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        const payload = {
            userId: user.id,
            employeeCode: user.employee_code,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        });

        return res.status(200).json({
            message: 'Đăng nhập thành công.',
            token,
            user: {
                id: user.id,
                employeeCode: user.employee_code,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                department: user.department,
                position: user.position,
            },
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await service.getMe(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        return res.json({ user });
    } catch (err) {
        console.error('[Auth] getMe error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { login, getMe };
