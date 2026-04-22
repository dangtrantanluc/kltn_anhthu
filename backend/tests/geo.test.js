const { test } = require('node:test');
const assert = require('node:assert/strict');

const { distanceMeters, findNearestLocation } = require('../src/utils/geo');

test('distanceMeters: 2 điểm trùng nhau → 0', () => {
    const d = distanceMeters(10.776, 106.700, 10.776, 106.700);
    assert.equal(d, 0);
});

test('distanceMeters: xấp xỉ Haversine cho khoảng cách ngắn (~111m cho 0.001 độ vĩ)', () => {
    const d = distanceMeters(10.000, 106.000, 10.001, 106.000);
    // ~111m với sai số <1m
    assert.ok(Math.abs(d - 111.195) < 2, `expected ~111m, got ${d}`);
});

test('distanceMeters: khoảng cách lớn (Hà Nội ↔ TP.HCM ~ 1150 km)', () => {
    const HANOI = { lat: 21.0285, lng: 105.8542 };
    const HCM = { lat: 10.7769, lng: 106.7009 };
    const d = distanceMeters(HANOI.lat, HANOI.lng, HCM.lat, HCM.lng);
    // Ground truth ~1147 km — cho phép sai số 20km
    assert.ok(d > 1_120_000 && d < 1_170_000, `distance out of range: ${d}m`);
});

test('findNearestLocation: chọn đúng location gần nhất', () => {
    const locations = [
        { id: 1, name: 'A', latitude: 10.000, longitude: 106.000, radius_m: 100 },
        { id: 2, name: 'B', latitude: 10.100, longitude: 106.100, radius_m: 100 },
        { id: 3, name: 'C', latitude: 10.200, longitude: 106.200, radius_m: 100 },
    ];
    const r = findNearestLocation(locations, 10.099, 106.100);
    assert.equal(r.location.id, 2);
    assert.ok(r.distance < 200);
});

test('findNearestLocation: locations rỗng → null', () => {
    assert.equal(findNearestLocation([], 10, 106), null);
});
