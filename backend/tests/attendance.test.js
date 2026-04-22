const { test } = require('node:test');
const assert = require('node:assert/strict');

const { computeAttendanceFromPunches } = require('../src/modules/attendance/attendance.service');

const SHIFT = {
    start_time: '08:00:00',
    end_time: '17:00:00',
    allowed_late_mins: 0,
};

const ymd = (y, m, d, h = 0, mm = 0) => new Date(y, m - 1, d, h, mm, 0);

test('computeAttendanceFromPunches: PRESENT khi vào đúng giờ và có checkout', () => {
    const r = computeAttendanceFromPunches(
        [ymd(2026, 3, 10, 8, 0), ymd(2026, 3, 10, 17, 0)],
        SHIFT
    );
    assert.equal(r.status, 'PRESENT');
    assert.equal(r.lateMins, 0);
    assert.equal(r.totalWorkedHours, 9);
});

test('computeAttendanceFromPunches: LATE khi vào sau giờ start + allowed_late_mins', () => {
    const r = computeAttendanceFromPunches(
        [ymd(2026, 3, 10, 8, 30), ymd(2026, 3, 10, 17, 0)],
        SHIFT
    );
    assert.equal(r.status, 'LATE');
    assert.equal(r.lateMins, 30);
});

test('computeAttendanceFromPunches: không tính trễ khi trong allowed_late_mins', () => {
    const r = computeAttendanceFromPunches(
        [ymd(2026, 3, 10, 8, 10), ymd(2026, 3, 10, 17, 0)],
        { ...SHIFT, allowed_late_mins: 15 }
    );
    assert.equal(r.status, 'PRESENT');
    assert.equal(r.lateMins, 0);
});

test('computeAttendanceFromPunches: MISSING_CHECKOUT khi chỉ có 1 punch', () => {
    const r = computeAttendanceFromPunches(
        [ymd(2026, 3, 10, 8, 0)],
        SHIFT
    );
    assert.equal(r.status, 'MISSING_CHECKOUT');
    assert.equal(r.totalWorkedHours, 0);
});

test('computeAttendanceFromPunches: tính early_leave_mins khi ra sớm', () => {
    const r = computeAttendanceFromPunches(
        [ymd(2026, 3, 10, 8, 0), ymd(2026, 3, 10, 16, 30)],
        SHIFT
    );
    assert.equal(r.earlyLeaveMins, 30);
});

test('computeAttendanceFromPunches: check_in lấy min, check_out lấy max khi có nhiều punch', () => {
    const r = computeAttendanceFromPunches(
        [
            ymd(2026, 3, 10, 12, 0), // lunch out
            ymd(2026, 3, 10, 8, 0),  // real check-in
            ymd(2026, 3, 10, 13, 0), // lunch back
            ymd(2026, 3, 10, 17, 0), // real check-out
        ],
        SHIFT
    );
    assert.equal(r.checkIn.getHours(), 8);
    assert.equal(r.checkOut.getHours(), 17);
    assert.equal(r.status, 'PRESENT');
});

test('computeAttendanceFromPunches: totalWorkedHours tính theo chênh lệch check_in/check_out (không trừ nghỉ trưa)', () => {
    // Quy ước hiện tại: tính thô theo max-min, acceptance test cho chính quy ước đó
    const r = computeAttendanceFromPunches(
        [ymd(2026, 3, 10, 9, 0), ymd(2026, 3, 10, 18, 0)],
        SHIFT
    );
    assert.equal(r.totalWorkedHours, 9);
});
