const { test } = require('node:test');
const assert = require('node:assert/strict');

const payrollSchemas = require('../src/modules/payrolls/payrolls.schema');
const reportSchemas = require('../src/modules/reports/reports.schema');

test('payroll.generate schema: yêu cầu month/year', () => {
    const r = payrollSchemas.generate.body.safeParse({});
    assert.equal(r.success, false);
});

test('payroll.generate schema: coerce string → number', () => {
    const r = payrollSchemas.generate.body.safeParse({
        payroll_month: '3',
        payroll_year: '2026',
    });
    assert.equal(r.success, true);
    assert.equal(r.data.payroll_month, 3);
    assert.equal(r.data.payroll_year, 2026);
});

test('payroll.generate schema: reject month=13', () => {
    const r = payrollSchemas.generate.body.safeParse({
        payroll_month: 13,
        payroll_year: 2026,
    });
    assert.equal(r.success, false);
});

test('payroll.update schema: chấp nhận partial, reject giờ âm', () => {
    const ok = payrollSchemas.update.body.safeParse({ total_actual_hours: 100 });
    assert.equal(ok.success, true);

    const bad = payrollSchemas.update.body.safeParse({ total_actual_hours: -1 });
    assert.equal(bad.success, false);
});

test('reports.generate schema: reject unsupported report_type', () => {
    const r = reportSchemas.generate.body.safeParse({
        report_type: 'FOO',
    });
    assert.equal(r.success, false);
});

test('reports.generate schema: chấp nhận ATTENDANCE_SUMMARY + period YYYY-MM-DD', () => {
    const r = reportSchemas.generate.body.safeParse({
        report_type: 'ATTENDANCE_SUMMARY',
        period_from: '2026-03-01',
        period_to: '2026-03-31',
    });
    assert.equal(r.success, true);
});

test('reports.generate schema: period sai định dạng bị reject', () => {
    const r = reportSchemas.generate.body.safeParse({
        report_type: 'ATTENDANCE_SUMMARY',
        period_from: '01/03/2026',
        period_to: '31/03/2026',
    });
    assert.equal(r.success, false);
});
