const service = require('./auth.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const handleAuthError = (res, err, fallbackMessage) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('[Auth]', err);
    return res.status(500).json({ message: fallbackMessage });
};

// POST /auth/login
const login = asyncHandler(async (req, res) => {
    const { email, password, rememberMe } = req.body;
    try {
        const { accessToken, refreshToken, user } = await service.login({
            email,
            password,
            rememberMe: !!rememberMe,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
        });
        return res.json({
            message: 'Đăng nhập thành công.',
            accessToken,
            refreshToken,
            // Back-compat với FE cũ
            token: accessToken,
            user,
        });
    } catch (err) {
        return handleAuthError(res, err, 'Lỗi server nội bộ.');
    }
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
    try {
        const { accessToken, refreshToken } = await service.refresh({
            refreshToken: req.body.refreshToken,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
        });
        return res.json({ accessToken, refreshToken, token: accessToken });
    } catch (err) {
        return handleAuthError(res, err, 'Không làm mới được token.');
    }
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
    try {
        await service.logout({ refreshToken: req.body.refreshToken });
        return res.json({ message: 'Đã đăng xuất.' });
    } catch (err) {
        return handleAuthError(res, err, 'Lỗi khi đăng xuất.');
    }
});

// POST /auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
    try {
        await service.forgotPassword({ email: req.body.email });
        return res.json({
            message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.',
        });
    } catch (err) {
        return handleAuthError(res, err, 'Không gửi được email.');
    }
});

// POST /auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
    try {
        await service.resetPassword({
            token: req.body.token,
            password: req.body.password,
        });
        return res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
    } catch (err) {
        return handleAuthError(res, err, 'Không đặt lại được mật khẩu.');
    }
});

// POST /auth/change-password (auth required)
const changePassword = asyncHandler(async (req, res) => {
    try {
        await service.changePassword({
            userId: req.user.userId,
            oldPassword: req.body.oldPassword,
            newPassword: req.body.newPassword,
        });
        return res.json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
    } catch (err) {
        return handleAuthError(res, err, 'Không đổi được mật khẩu.');
    }
});

// GET /auth/me
const getMe = asyncHandler(async (req, res) => {
    try {
        const user = await service.getMe(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        return res.json({ user });
    } catch (err) {
        return handleAuthError(res, err, 'Lỗi server nội bộ.');
    }
});

module.exports = {
    login,
    refresh,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    getMe,
};
