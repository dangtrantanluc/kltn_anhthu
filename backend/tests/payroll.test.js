const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildPayrollRow } = require('../src/modules/payrolls/payrolls.service');

test('buildPayrollRow: tính lương cơ bản không hệ số', () => {
    const row = buildPayrollRow({
        user_id: 1,
        payroll_month: 3,
        payroll_year: 2026,
        totalActualHours: 160,
        totalPaidLeaveHours: 0,
        base_hourly_wage: 50000,
        salary_multiplier: 1,
    });

    assert.equal(row.total_actual_hours, 160);
    assert.equal(row.total_paid_leave_hours, 0);
    assert.equal(row.base_hourly_wage_snapshot, 50000);
    assert.equal(row.salary_multiplier_snapshot, 1);
    // 160 * 50000 * 1 = 8,000,000
    assert.equal(row.total_calculated_salary, 8000000);
});

test('buildPayrollRow: cộng giờ phép có lương vào công thức', () => {
    const row = buildPayrollRow({
        user_id: 1,
        payroll_month: 3,
        payroll_year: 2026,
        totalActualHours: 152,
        totalPaidLeaveHours: 8,
        base_hourly_wage: 50000,
        salary_multiplier: 1,
    });
    // (152 + 8) * 50000 * 1
    assert.equal(row.total_calculated_salary, 8000000);
});

test('buildPayrollRow: áp dụng hệ số lương (multiplier)', () => {
    const row = buildPayrollRow({
        user_id: 1,
        payroll_month: 3,
        payroll_year: 2026,
        totalActualHours: 100,
        totalPaidLeaveHours: 0,
        base_hourly_wage: 60000,
        salary_multiplier: 1.5,
    });
    // 100 * 60000 * 1.5 = 9,000,000
    assert.equal(row.total_calculated_salary, 9000000);
});

test('buildPayrollRow: giá giờ và hệ số null rơi về 0 và 1 tương ứng', () => {
    const row = buildPayrollRow({
        user_id: 1,
        payroll_month: 3,
        payroll_year: 2026,
        totalActualHours: 100,
        totalPaidLeaveHours: 0,
        base_hourly_wage: null,
        salary_multiplier: null,
    });
    assert.equal(row.base_hourly_wage_snapshot, 0);
    assert.equal(row.salary_multiplier_snapshot, 1);
    assert.equal(row.total_calculated_salary, 0);
});

test('buildPayrollRow: làm tròn đúng 2 chữ số thập phân', () => {
    const row = buildPayrollRow({
        user_id: 1,
        payroll_month: 3,
        payroll_year: 2026,
        totalActualHours: 100.333,
        totalPaidLeaveHours: 0,
        base_hourly_wage: 12345,
        salary_multiplier: 1,
    });
    // round(100.333, 2) = 100.33 → 100.33 * 12345 * 1 = 1_238_573.85
    assert.equal(row.total_actual_hours, 100.33);
    assert.equal(row.total_calculated_salary, 1238573.85);
});

test('buildPayrollRow: snapshot không đổi khi đổi input sau đó', () => {
    const input = {
        user_id: 1,
        payroll_month: 3,
        payroll_year: 2026,
        totalActualHours: 160,
        totalPaidLeaveHours: 0,
        base_hourly_wage: 50000,
        salary_multiplier: 1,
    };
    const row1 = buildPayrollRow(input);
    input.base_hourly_wage = 999999;
    const row2 = buildPayrollRow(input);
    // snapshot cũ không đổi theo input sau
    assert.equal(row1.base_hourly_wage_snapshot, 50000);
    assert.equal(row2.base_hourly_wage_snapshot, 999999);
});
