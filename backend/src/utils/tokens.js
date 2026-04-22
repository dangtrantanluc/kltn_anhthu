const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_REMEMBER_EXPIRES =
    process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN || '30d';

/**
 * Payload: { userId, employeeCode, email, role }
 */
const signAccessToken = (payload) =>
    jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRES,
    });

const signRefreshToken = (payload, remember = false) => {
    const jti = crypto.randomBytes(16).toString('hex');
    const expiresIn = remember ? REFRESH_REMEMBER_EXPIRES : REFRESH_EXPIRES;
    const token = jwt.sign(
        { userId: payload.userId, type: 'refresh', jti },
        REFRESH_SECRET,
        { expiresIn }
    );
    return { token, jti };
};

const verifyAccess = (token) => {
    const d = jwt.verify(token, ACCESS_SECRET);
    if (d.type && d.type !== 'access') throw new Error('Not an access token');
    return d;
};

const verifyRefresh = (token) => {
    const d = jwt.verify(token, REFRESH_SECRET);
    if (d.type !== 'refresh') throw new Error('Not a refresh token');
    return d;
};

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

const randomUrlToken = (bytes = 32) =>
    crypto.randomBytes(bytes).toString('hex');

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccess,
    verifyRefresh,
    hashToken,
    randomUrlToken,
};
