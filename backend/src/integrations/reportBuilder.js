/**
 * Aggregate báo cáo + render file Excel/PDF.
 * Types hỗ trợ:
 *  - ATTENDANCE_SUMMARY : tổng giờ làm, trễ, vắng theo NV trong khoảng ngày
 *  - PAYROLL_SUMMARY    : tổng quỹ lương theo phòng ban / tháng
 *  - HEADCOUNT          : số nhân viên theo phòng ban
 *  - LEAVE_SUMMARY      : tổng đơn nghỉ phép theo NV
 */
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../config/db');

const fmtMoney = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

// ──────────────────────────────────────────────────────────
// Aggregators
// ──────────────────────────────────────────────────────────

const aggregateAttendance = async ({ period_from, period_to, department_id }) => {
    const params = [period_from, period_to];
    let where = `a.work_date BETWEEN ? AND ?`;
    if (department_id) {
        where += ` AND u.department_id = ?`;
        params.push(department_id);
    }
    const [rows] = await db.query(
        `SELECT u.id AS user_id, u.employee_code, u.full_name,
            d.name AS department,
            SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_days,
            SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END)    AS late_days,
            SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END)  AS absent_days,
            COALESCE(SUM(a.total_worked_hours), 0) AS total_hours,
            COALESCE(SUM(a.late_mins), 0) AS total_late_mins
       FROM users u
       LEFT JOIN attendances a ON a.user_id = u.id AND a.work_date BETWEEN ? AND ?
       LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.is_active = 1 ${department_id ? 'AND u.department_id = ?' : ''}
      GROUP BY u.id, u.employee_code, u.full_name, d.name
      ORDER BY d.name, u.full_name`,
        department_id
            ? [period_from, period_to, period_from, period_to, department_id]
            : [period_from, period_to, period_from, period_to]
    );
    return rows;
};

const aggregatePayroll = async ({ period_from, period_to, department_id }) => {
    // period = kỳ lương từ tháng/năm → tháng/năm
    const from = new Date(period_from);
    const to = new Date(period_to);
    const params = [from.getFullYear(), from.getMonth() + 1, to.getFullYear(), to.getMonth() + 1];
    let where = `((py.payroll_year > ? OR (py.payroll_year = ? AND py.payroll_month >= ?))
                AND (py.payroll_year < ? OR (py.payroll_year = ? AND py.payroll_month <= ?)))`;
    const fullParams = [
        from.getFullYear(), from.getFullYear(), from.getMonth() + 1,
        to.getFullYear(), to.getFullYear(), to.getMonth() + 1,
    ];
    if (department_id) {
        where += ` AND u.department_id = ?`;
        fullParams.push(department_id);
    }

    const [rows] = await db.query(
        `SELECT d.name AS department, py.payroll_year, py.payroll_month,
            COUNT(*) AS employee_count,
            COALESCE(SUM(py.total_actual_hours), 0) AS total_hours,
            COALESCE(SUM(py.total_paid_leave_hours), 0) AS paid_leave_hours,
            COALESCE(SUM(py.total_calculated_salary), 0) AS total_salary
       FROM payrolls py
       JOIN users u ON u.id = py.user_id
       LEFT JOIN departments d ON d.id = u.department_id
      WHERE ${where}
      GROUP BY d.name, py.payroll_year, py.payroll_month
      ORDER BY py.payroll_year, py.payroll_month, d.name`,
        fullParams
    );
    return rows;
};

const aggregateHeadcount = async ({ department_id }) => {
    const [rows] = await db.query(
        `SELECT COALESCE(d.name, 'Chưa gán phòng ban') AS department,
            SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) AS active_count,
            SUM(CASE WHEN u.is_active = 0 THEN 1 ELSE 0 END) AS inactive_count,
            COUNT(*) AS total
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
      ${department_id ? 'WHERE u.department_id = ?' : ''}
      GROUP BY d.name
      ORDER BY d.name`,
        department_id ? [department_id] : []
    );
    return rows;
};

const aggregateLeave = async ({ period_from, period_to, department_id }) => {
    const params = [period_from, period_to];
    let where = `r.target_date BETWEEN ? AND ?`;
    if (department_id) {
        where += ` AND u.department_id = ?`;
        params.push(department_id);
    }
    const [rows] = await db.query(
        `SELECT u.employee_code, u.full_name, d.name AS department,
            SUM(CASE WHEN r.request_type = 'LEAVE_REQUEST' AND r.leave_type = 'PAID' AND r.status = 'APPROVED' THEN 1 ELSE 0 END) AS paid_leave_days,
            SUM(CASE WHEN r.request_type = 'LEAVE_REQUEST' AND r.leave_type = 'UNPAID' AND r.status = 'APPROVED' THEN 1 ELSE 0 END) AS unpaid_leave_days,
            SUM(CASE WHEN r.request_type = 'LEAVE_REQUEST' AND r.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_leave,
            SUM(CASE WHEN r.request_type = 'LEAVE_REQUEST' AND r.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_leave
       FROM users u
       LEFT JOIN requests r ON r.user_id = u.id AND ${where}
       LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.is_active = 1 ${department_id ? 'AND u.department_id = ?' : ''}
      GROUP BY u.id, u.employee_code, u.full_name, d.name
      ORDER BY d.name, u.full_name`,
        department_id ? [...params, department_id] : params
    );
    return rows;
};

const AGG = {
    ATTENDANCE_SUMMARY: aggregateAttendance,
    PAYROLL_SUMMARY: aggregatePayroll,
    HEADCOUNT: aggregateHeadcount,
    LEAVE_SUMMARY: aggregateLeave,
};

// ──────────────────────────────────────────────────────────
// Render helpers
// ──────────────────────────────────────────────────────────

const renderHeader = (ws, columns, title) => {
    let rowIdx = 1;
    if (title) {
        ws.mergeCells(1, 1, 1, columns.length);
        const c = ws.getCell(1, 1);
        c.value = title;
        c.font = { size: 14, bold: true };
        c.alignment = { horizontal: 'center' };
        rowIdx = 3;
    }
    const headerRow = ws.getRow(rowIdx);
    columns.forEach((col, i) => {
        headerRow.getCell(i + 1).value = col.label;
        ws.getColumn(i + 1).width = col.width || 18;
    });
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    return rowIdx + 1;
};

const REPORT_COLUMNS = {
    ATTENDANCE_SUMMARY: [
        { key: 'employee_code', label: 'Mã NV', width: 14 },
        { key: 'full_name', label: 'Họ tên', width: 26 },
        { key: 'department', label: 'Phòng ban', width: 20 },
        { key: 'present_days', label: 'Đi làm', width: 10 },
        { key: 'late_days', label: 'Trễ', width: 8 },
        { key: 'absent_days', label: 'Vắng', width: 8 },
        { key: 'total_hours', label: 'Tổng giờ', width: 12 },
        { key: 'total_late_mins', label: 'Phút trễ', width: 12 },
    ],
    PAYROLL_SUMMARY: [
        { key: 'department', label: 'Phòng ban', width: 22 },
        { key: 'payroll_year', label: 'Năm', width: 8 },
        { key: 'payroll_month', label: 'Tháng', width: 8 },
        { key: 'employee_count', label: 'Số NV', width: 10 },
        { key: 'total_hours', label: 'Tổng giờ', width: 12 },
        { key: 'paid_leave_hours', label: 'Giờ phép', width: 12 },
        { key: 'total_salary', label: 'Quỹ lương', width: 20 },
    ],
    HEADCOUNT: [
        { key: 'department', label: 'Phòng ban', width: 24 },
        { key: 'active_count', label: 'Đang làm', width: 12 },
        { key: 'inactive_count', label: 'Ngưng', width: 10 },
        { key: 'total', label: 'Tổng', width: 10 },
    ],
    LEAVE_SUMMARY: [
        { key: 'employee_code', label: 'Mã NV', width: 14 },
        { key: 'full_name', label: 'Họ tên', width: 24 },
        { key: 'department', label: 'Phòng ban', width: 20 },
        { key: 'paid_leave_days', label: 'Phép có lương', width: 14 },
        { key: 'unpaid_leave_days', label: 'Phép không lương', width: 16 },
        { key: 'pending_leave', label: 'Chờ duyệt', width: 12 },
        { key: 'rejected_leave', label: 'Từ chối', width: 10 },
    ],
};

const buildExcel = async (type, rows, { title } = {}) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HRIS Reports';
    const ws = wb.addWorksheet('Báo cáo');
    const columns = REPORT_COLUMNS[type];
    const startRow = renderHeader(ws, columns, title);
    rows.forEach((r, i) => {
        const rowNum = startRow + i;
        columns.forEach((col, idx) => {
            const v = r[col.key];
            ws.getCell(rowNum, idx + 1).value = v == null ? '' : v;
        });
    });
    return wb.xlsx.writeBuffer();
};

const buildPDF = (type, rows, { title } = {}) =>
    new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.fontSize(16).fillColor('#000').text(title || 'Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#555').text(
                `Generated ${new Date().toLocaleString('en-GB')}`,
                { align: 'center' }
            );
            doc.moveDown(1);

            const columns = REPORT_COLUMNS[type];
            const colCount = columns.length;
            const pageWidth = doc.page.width - 60;
            const colWidth = pageWidth / colCount;
            let y = doc.y;

            // Header
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#fff');
            doc.rect(30, y - 2, pageWidth, 18).fill('#3B82F6');
            columns.forEach((c, i) => {
                doc.fillColor('#fff').text(c.label, 30 + i * colWidth + 4, y + 2, {
                    width: colWidth - 8,
                    align: 'left',
                });
            });
            y += 20;

            doc.font('Helvetica').fontSize(9).fillColor('#000');
            rows.forEach((r, rIdx) => {
                if (y > doc.page.height - 40) {
                    doc.addPage();
                    y = 40;
                }
                if (rIdx % 2 === 0) {
                    doc.rect(30, y - 2, pageWidth, 16).fill('#F3F4F6');
                    doc.fillColor('#000');
                }
                columns.forEach((c, i) => {
                    const v = r[c.key];
                    const s = v == null ? '' : typeof v === 'number' ? fmtMoney(v) : String(v);
                    doc.text(s, 30 + i * colWidth + 4, y + 1, {
                        width: colWidth - 8,
                        align: 'left',
                    });
                });
                y += 16;
            });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });

// ──────────────────────────────────────────────────────────
// Public facade
// ──────────────────────────────────────────────────────────
const aggregate = async (type, params) => {
    const fn = AGG[type];
    if (!fn) throw Object.assign(new Error(`Loại báo cáo không hỗ trợ: ${type}`), { status: 400 });
    return fn(params);
};

const REPORT_TITLE = {
    ATTENDANCE_SUMMARY: 'Báo cáo chấm công',
    PAYROLL_SUMMARY: 'Báo cáo tổng hợp lương',
    HEADCOUNT: 'Báo cáo nhân sự',
    LEAVE_SUMMARY: 'Báo cáo nghỉ phép',
};

module.exports = {
    aggregate,
    buildExcel,
    buildPDF,
    REPORT_TITLE,
    REPORT_COLUMNS,
};
