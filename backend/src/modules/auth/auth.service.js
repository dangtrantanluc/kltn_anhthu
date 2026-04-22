const db = require('../../config/db');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefresh,
    hashToken,
    randomUrlToken,
} = require('../../utils/tokens');
const { sendMail } = require('../../integrations/mailer');

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES) || 15;
const RESET_EXPIRES_MIN =
    parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 60;

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

const buildAuthPayload = (u) => ({
    userId: u.id,
    employeeCode: u.employee_code,
    email: u.email,
    role: u.role,
});

const buildUserResponse = (u) => ({
    id: u.id,
    employeeCode: u.employee_code,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    department: u.department || null,
    position: u.position || null,
});

const getUserByEmail = async (email) => {
    const [rows] = await db.execute(
        `SELECT u.id, u.employee_code, u.full_name, u.email, u.password_hash,
            u.is_active, u.role, u.failed_login_count, u.locked_until,
            d.name AS department, p.name AS position
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions   p ON p.id = u.position_id
     WHERE u.email = ?
     LIMIT 1`,
        [email]
    );
    return rows[0] || null;
};

const getUserById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id, employee_code, email, full_name, role, is_active, password_hash
     FROM users WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

const getMe = async (userId) => {
    const [rows] = await db.execute(
        `SELECT u.id, u.employee_code, u.full_name, u.email, u.role, u.gender,
            u.birthdate, u.base_hourly_wage, u.salary_multiplier, u.is_active,
            u.created_at, u.last_login_at,
            d.name AS department, p.name AS position,
            s.shift_name, m.full_name AS manager_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions   p ON p.id = u.position_id
     LEFT JOIN shifts      s ON s.id = u.shift_id
     LEFT JOIN users       m ON m.id = u.manager_id
     WHERE u.id = ?`,
        [userId]
    );
    return rows[0] || null;
};

// ────────────────────────────────────────────────────────
// Login flow
// ────────────────────────────────────────────────────────

const recordFailedLogin = async (userId) => {
    await db.execute(
        `UPDATE users
       SET failed_login_count = failed_login_count + 1,
           locked_until = IF(failed_login_count + 1 >= ?,
                             DATE_ADD(NOW(), INTERVAL ? MINUTE),
                             locked_until)
     WHERE id = ?`,
        [MAX_ATTEMPTS, LOCK_MINUTES, userId]
    );
};

const resetFailedLogin = async (userId) => {
    await db.execute(
        `UPDATE users
       SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW()
     WHERE id = ?`,
        [userId]
    );
};

const issueTokens = async (user, { remember, userAgent, ip }) => {
    const payload = buildAuthPayload(user);
    const accessToken = signAccessToken(payload);
    const { token: refreshToken } = signRefreshToken(payload, remember);

    const tokenHash = hashToken(refreshToken);
    const daysFromJwt = remember ? 30 : 7;
    await db.execute(
        `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [user.id, tokenHash, userAgent || null, ip || null, daysFromJwt]
    );

    return { accessToken, refreshToken };
};

/**
 * login({ email, password, rememberMe, userAgent, ip })
 * Throws errors with .status for controller to handle.
 */
const login = async ({ email, password, rememberMe, userAgent, ip }) => {
    const user = await getUserByEmail(email);
    const genericErr = () => {
        const e = new Error('Email hoặc mật khẩu không đúng.');
        e.status = 401;
        return e;
    };
    if (!user) throw genericErr();
    if (!user.is_active) {
        const e = new Error('Tài khoản của bạn đã bị vô hiệu hoá.');
        e.status = 403;
        throw e;
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const e = new Error(
            `Tài khoản đã bị khoá. Vui lòng thử lại sau ${LOCK_MINUTES} phút.`
        );
        e.status = 423;
        throw e;
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
        await recordFailedLogin(user.id);
        throw genericErr();
    }

    await resetFailedLogin(user.id);
    const tokens = await issueTokens(user, { remember: rememberMe, userAgent, ip });
    return { ...tokens, user: buildUserResponse(user) };
};

// ────────────────────────────────────────────────────────
// Refresh rotation
// ────────────────────────────────────────────────────────

const refresh = async ({ refreshToken, userAgent, ip }) => {
    let decoded;
    try {
        decoded = verifyRefresh(refreshToken);
    } catch {
        const e = new Error('Refresh token không hợp lệ hoặc đã hết hạn.');
        e.status = 401;
        throw e;
    }

    const tokenHash = hashToken(refreshToken);
    const [rows] = await db.execute(
        `SELECT id, user_id, revoked_at, expires_at
       FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
        [tokenHash]
    );
    const record = rows[0];

    if (!record) {
        // Token hợp lệ chữ ký nhưng không có trong DB → có thể bị đánh cắp đã dùng
        await db.execute(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
            [decoded.userId]
        );
        const e = new Error('Refresh token đã bị thu hồi.');
        e.status = 401;
        throw e;
    }

    if (record.revoked_at) {
        // Reuse detected — revoke tất cả token của user
        await db.execute(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
            [record.user_id]
        );
        const e = new Error('Phát hiện refresh token đã bị dùng lại. Đăng nhập lại.');
        e.status = 401;
        throw e;
    }

    if (new Date(record.expires_at) < new Date()) {
        const e = new Error('Refresh token đã hết hạn.');
        e.status = 401;
        throw e;
    }

    const user = await getUserById(record.user_id);
    if (!user || !user.is_active) {
        const e = new Error('Tài khoản không khả dụng.');
        e.status = 401;
        throw e;
    }

    // Rotate: cấp token mới + revoke token cũ
    const payload = buildAuthPayload(user);
    const accessToken = signAccessToken(payload);
    const { token: newRefresh } = signRefreshToken(payload, false);
    const newHash = hashToken(newRefresh);

    const [result] = await db.execute(
        `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [user.id, newHash, userAgent || null, ip || null]
    );
    await db.execute(
        `UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = ? WHERE id = ?`,
        [result.insertId, record.id]
    );

    return { accessToken, refreshToken: newRefresh };
};

// ────────────────────────────────────────────────────────
// Logout
// ────────────────────────────────────────────────────────

const logout = async ({ refreshToken }) => {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    await db.execute(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
        [tokenHash]
    );
};

// ────────────────────────────────────────────────────────
// Forgot / Reset password
// ────────────────────────────────────────────────────────

const forgotPassword = async ({ email }) => {
    const user = await getUserByEmail(email);
    // Luôn trả 200, không tiết lộ có tồn tại hay không
    if (!user || !user.is_active) return;

    const rawToken = randomUrlToken(32);
    const tokenHash = hashToken(rawToken);

    await db.execute(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [user.id, tokenHash, RESET_EXPIRES_MIN]
    );

    const url = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    await sendMail({
        to: user.email,
        subject: '[HRIS] Đặt lại mật khẩu',
        text: `Xin chào ${user.full_name},\n\nVui lòng nhấp vào link sau để đặt lại mật khẩu (hết hạn sau ${RESET_EXPIRES_MIN} phút):\n${url}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: `<p>Xin chào <b>${user.full_name}</b>,</p><p>Nhấp vào link dưới để đặt lại mật khẩu (hết hạn sau ${RESET_EXPIRES_MIN} phút):</p><p><a href="${url}">${url}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    });
};

const resetPassword = async ({ token, password }) => {
    const tokenHash = hashToken(token);
    const [rows] = await db.execute(
        `SELECT id, user_id, expires_at, used_at
       FROM password_resets WHERE token_hash = ? LIMIT 1`,
        [tokenHash]
    );
    const rec = rows[0];
    const invalid = () => {
        const e = new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
        e.status = 400;
        return e;
    };
    if (!rec || rec.used_at || new Date(rec.expires_at) < new Date()) {
        throw invalid();
    }

    const newHash = await hashPassword(password);
    await db.execute('UPDATE users SET password_hash = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?', [
        newHash,
        rec.user_id,
    ]);
    await db.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [rec.id]);
    // Revoke toàn bộ phiên đăng nhập cũ
    await db.execute(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [rec.user_id]
    );
};

// ────────────────────────────────────────────────────────
// Change password (đã đăng nhập)
// ────────────────────────────────────────────────────────

const changePassword = async ({ userId, oldPassword, newPassword }) => {
    const user = await getUserById(userId);
    if (!user) {
        const e = new Error('Không tìm thấy người dùng.');
        e.status = 404;
        throw e;
    }
    const ok = await comparePassword(oldPassword, user.password_hash);
    if (!ok) {
        const e = new Error('Mật khẩu hiện tại không đúng.');
        e.status = 400;
        throw e;
    }
    const newHash = await hashPassword(newPassword);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    // Revoke tất cả refresh token cũ
    await db.execute(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [userId]
    );
};

module.exports = {
    // Flow
    login,
    refresh,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    // Queries
    getUserByEmail,
    getMe,
};
