const rateLimit = require('express-rate-limit');

// Chặn brute force /auth/login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15'
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
    },
});

// Forgot password: ngăn spam email
const forgotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1h
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
    },
});

module.exports = { loginLimiter, forgotLimiter };
