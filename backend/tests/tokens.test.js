const { test } = require('node:test');
const assert = require('node:assert/strict');

// Đảm bảo secret tồn tại cho test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-minimum-length!!';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_r';

const {
    signAccessToken,
    signRefreshToken,
    verifyAccess,
    verifyRefresh,
    hashToken,
    randomUrlToken,
} = require('../src/utils/tokens');

test('signAccessToken + verifyAccess: roundtrip giữ payload', () => {
    const payload = { userId: 42, email: 'u@x.com', role: 'USER' };
    const t = signAccessToken(payload);
    const d = verifyAccess(t);
    assert.equal(d.userId, 42);
    assert.equal(d.email, 'u@x.com');
    assert.equal(d.role, 'USER');
    assert.equal(d.type, 'access');
});

test('verifyAccess: từ chối refresh token', () => {
    const { token } = signRefreshToken({ userId: 1 });
    assert.throws(() => verifyAccess(token));
});

test('verifyRefresh: chấp nhận refresh token, payload đúng', () => {
    const { token, jti } = signRefreshToken({ userId: 7 }, false);
    const d = verifyRefresh(token);
    assert.equal(d.userId, 7);
    assert.equal(d.type, 'refresh');
    assert.equal(typeof d.jti, 'string');
    assert.ok(d.jti.length >= 16);
    assert.ok(jti.length >= 16);
});

test('signRefreshToken: "remember" sinh token có TTL dài hơn', () => {
    const { token: short } = signRefreshToken({ userId: 7 }, false);
    const { token: long } = signRefreshToken({ userId: 7 }, true);
    const a = verifyRefresh(short);
    const b = verifyRefresh(long);
    assert.ok(b.exp > a.exp, 'remember token phải có exp lớn hơn');
});

test('hashToken: deterministic và khác token gốc', () => {
    const t = 'abc123';
    const h1 = hashToken(t);
    const h2 = hashToken(t);
    assert.equal(h1, h2);
    assert.notEqual(h1, t);
    assert.equal(h1.length, 64); // sha256 hex
});

test('randomUrlToken: đủ độ dài và duy nhất giữa các lần gọi', () => {
    const t1 = randomUrlToken(32);
    const t2 = randomUrlToken(32);
    assert.equal(t1.length, 64); // 32 bytes → 64 hex
    assert.notEqual(t1, t2);
});
