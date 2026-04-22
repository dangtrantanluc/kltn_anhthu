const ExcelJS = require('exceljs');

const fmtMoney = (n) =>
    new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const applyHeader = (ws, headers) => {
    ws.columns = headers.map((h) => ({
        header: h.header,
        key: h.key,
        width: h.width || 18,
    }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
    };
    ws.getRow(1).height = 22;
};

/**
 * Xuất 1 phiếu lương cá nhân
 */
const buildPayrollSlip = async (payroll) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HRIS';
    wb.created = new Date();
    const ws = wb.addWorksheet('Phiếu lương');

    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = 'PHIẾU LƯƠNG';
    ws.getCell('A1').font = { size: 18, bold: true };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.getCell('A3').value = 'Mã NV';
    ws.getCell('B3').value = payroll.employee_code || '';
    ws.getCell('C3').value = 'Họ tên';
    ws.getCell('D3').value = payroll.full_name || '';

    ws.getCell('A4').value = 'Phòng ban';
    ws.getCell('B4').value = payroll.department || '—';
    ws.getCell('C4').value = 'Chức vụ';
    ws.getCell('D4').value = payroll.position || '—';

    ws.getCell('A5').value = 'Kỳ lương';
    ws.getCell('B5').value = `${String(payroll.payroll_month).padStart(2, '0')}/${payroll.payroll_year}`;
    ws.getCell('C5').value = 'Trạng thái';
    ws.getCell('D5').value = payroll.status;

    const rows = [
        ['Giờ làm thực tế', payroll.total_actual_hours, 'giờ'],
        ['Giờ nghỉ phép có lương', payroll.total_paid_leave_hours, 'giờ'],
        ['Giá giờ (snapshot)', fmtMoney(payroll.base_hourly_wage_snapshot), 'VND'],
        ['Hệ số lương', payroll.salary_multiplier_snapshot, ''],
        ['Tổng lương', fmtMoney(payroll.total_calculated_salary), 'VND'],
    ];
    rows.forEach((r, idx) => {
        const row = ws.getRow(7 + idx);
        row.getCell(1).value = r[0];
        row.getCell(2).value = r[1];
        row.getCell(3).value = r[2];
        row.getCell(1).font = { bold: true };
        if (r[0] === 'Tổng lương') {
            row.font = { bold: true, color: { argb: 'FF065F46' } };
        }
    });

    ws.columns = [
        { width: 28 }, { width: 22 }, { width: 10 }, { width: 22 },
    ];
    return wb.xlsx.writeBuffer();
};

/**
 * Xuất danh sách bảng lương (nhiều người, 1 kỳ hoặc 1 phòng ban)
 */
const buildPayrollList = async (payrolls, { title } = {}) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HRIS';
    wb.created = new Date();
    const ws = wb.addWorksheet('Bảng lương');

    if (title) {
        ws.mergeCells('A1:I1');
        ws.getCell('A1').value = title;
        ws.getCell('A1').font = { size: 14, bold: true };
        ws.getCell('A1').alignment = { horizontal: 'center' };
        ws.addRow([]);
    }

    const startRow = title ? 3 : 1;
    const headers = [
        { header: 'Mã NV', key: 'employee_code', width: 14 },
        { header: 'Họ tên', key: 'full_name', width: 26 },
        { header: 'Phòng ban', key: 'department', width: 20 },
        { header: 'Kỳ lương', key: 'period', width: 12 },
        { header: 'Giờ làm', key: 'total_actual_hours', width: 10 },
        { header: 'Giờ phép', key: 'total_paid_leave_hours', width: 10 },
        { header: 'Giá giờ', key: 'base_hourly_wage_snapshot', width: 14 },
        { header: 'Hệ số', key: 'salary_multiplier_snapshot', width: 8 },
        { header: 'Tổng lương', key: 'total_calculated_salary', width: 18 },
        { header: 'Trạng thái', key: 'status', width: 18 },
    ];
    ws.getRow(startRow).values = headers.map((h) => h.header);
    ws.getRow(startRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(startRow).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
    };
    headers.forEach((h, i) => {
        ws.getColumn(i + 1).width = h.width;
    });

    payrolls.forEach((p) => {
        ws.addRow([
            p.employee_code,
            p.full_name,
            p.department || '',
            `${String(p.payroll_month).padStart(2, '0')}/${p.payroll_year}`,
            Number(p.total_actual_hours),
            Number(p.total_paid_leave_hours),
            Number(p.base_hourly_wage_snapshot),
            Number(p.salary_multiplier_snapshot),
            Number(p.total_calculated_salary),
            p.status,
        ]);
    });

    return wb.xlsx.writeBuffer();
};

module.exports = { buildPayrollSlip, buildPayrollList };
