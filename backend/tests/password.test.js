const { test } = require('node:test');
const assert = require('node:assert/strict');

// Dùng cost thấp để test chạy nhanh
process.env.BCRYPT_ROUNDS = '4';
const { hashPassword, comparePassword } = require('../src/utils/password');

test('hashPassword: hash khác với plaintext', async () => {
    const plain = 'Admin@123';
    const hash = await hashPassword(plain);
    assert.notEqual(hash, plain);
    assert.ok(hash.startsWith('$2'));
});

test('comparePassword: đúng mật khẩu → true', async () => {
    const plain = 'Str0ngP@ssword!';
    const hash = await hashPassword(plain);
    const ok = await comparePassword(plain, hash);
    assert.equal(ok, true);
});

test('comparePassword: sai mật khẩu → false', async () => {
    const hash = await hashPassword('correct-horse');
    const ok = await comparePassword('battery-staple', hash);
    assert.equal(ok, false);
});

test('hashPassword: cùng plaintext → ra 2 hash khác (salt ngẫu nhiên)', async () => {
    const plain = 'same-password';
    const h1 = await hashPassword(plain);
    const h2 = await hashPassword(plain);
    assert.notEqual(h1, h2);
    assert.equal(await comparePassword(plain, h1), true);
    assert.equal(await comparePassword(plain, h2), true);
});
