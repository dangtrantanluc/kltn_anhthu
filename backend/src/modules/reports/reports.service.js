const fs = require('fs');
const path = require('path');
const db = require('../../config/db');
const {
    aggregate,
    buildExcel,
    buildPDF,
    REPORT_TITLE,
} = require('../../integrations/reportBuilder');

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/reports');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const safeFilename = (s) =>
    String(s || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');

const computeSummary = (type, rows) => {
    if (type === 'PAYROLL_SUMMARY') {
        const totalSalary = rows.reduce((acc, r) => acc + Number(r.total_salary || 0), 0);
        const totalHours = rows.reduce((acc, r) => acc + Number(r.total_hours || 0), 0);
        const employeeCount = rows.reduce((acc, r) => acc + Number(r.employee_count || 0), 0);
        return { totalSalary, totalHours, employeeCount };
    }
    if (type === 'ATTENDANCE_SUMMARY') {
        return {
            users: rows.length,
            present_days: rows.reduce((a, r) => a + Number(r.present_days || 0), 0),
            late_days: rows.reduce((a, r) => a + Number(r.late_days || 0), 0),
            absent_days: rows.reduce((a, r) => a + Number(r.absent_days || 0), 0),
            total_hours: rows.reduce((a, r) => a + Number(r.total_hours || 0), 0),
        };
    }
    if (type === 'HEADCOUNT') {
        return {
            total: rows.reduce((a, r) => a + Number(r.total || 0), 0),
            active: rows.reduce((a, r) => a + Number(r.active_count || 0), 0),
        };
    }
    if (type === 'LEAVE_SUMMARY') {
        return {
            users: rows.length,
            paid: rows.reduce((a, r) => a + Number(r.paid_leave_days || 0), 0),
            unpaid: rows.reduce((a, r) => a + Number(r.unpaid_leave_days || 0), 0),
            pending: rows.reduce((a, r) => a + Number(r.pending_leave || 0), 0),
        };
    }
    return { rowCount: rows.length };
};

// ──────────────────────────────────────────────────────────
// Generate
// ──────────────────────────────────────────────────────────
const generate = async ({ createdBy, report_type, period_from, period_to, department_id, file_format, title }) => {
    const format = (file_format || 'XLSX').toUpperCase();

    // Một số loại không cần period
    if (['ATTENDANCE_SUMMARY', 'PAYROLL_SUMMARY', 'LEAVE_SUMMARY'].includes(report_type)) {
        if (!period_from || !period_to) {
            const e = new Error('period_from và period_to là bắt buộc cho báo cáo này.');
            e.status = 400;
            throw e;
        }
    }

    const rows = await aggregate(report_type, { period_from, period_to, department_id });

    const finalTitle =
        title ||
        `${REPORT_TITLE[report_type]}${period_from ? ' • ' + period_from + ' → ' + period_to : ''}`;

    if (rows.length === 0) {
        // Ghi bản ghi EMPTY để trace nhưng không tạo file
        const [result] = await db.execute(
            `INSERT INTO reports
         (created_by, report_type, title, period_from, period_to, department_id,
          params_json, summary_json, file_path, file_format, row_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 'EMPTY')`,
            [
                createdBy,
                report_type,
                finalTitle,
                period_from || null,
                period_to || null,
                department_id || null,
                JSON.stringify({ period_from, period_to, department_id }),
                JSON.stringify({ rowCount: 0 }),
                format,
            ]
        );
        return { id: result.insertId, status: 'EMPTY', row_count: 0 };
    }

    // Build file
    let buf, ext;
    if (format === 'PDF') {
        buf = await buildPDF(report_type, rows, { title: finalTitle });
        ext = 'pdf';
    } else {
        buf = Buffer.from(await buildExcel(report_type, rows, { title: finalTitle }));
        ext = 'xlsx';
    }

    const filename = `${safeFilename(report_type)}_${Date.now()}_${createdBy}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, buf);

    const summary = computeSummary(report_type, rows);
    const [result] = await db.execute(
        `INSERT INTO reports
       (created_by, report_type, title, period_from, period_to, department_id,
        params_json, summary_json, file_path, file_format, row_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GENERATED')`,
        [
            createdBy,
            report_type,
            finalTitle,
            period_from || null,
            period_to || null,
            department_id || null,
            JSON.stringify({ period_from, period_to, department_id }),
            JSON.stringify(summary),
            filePath,
            format,
            rows.length,
        ]
    );

    return {
        id: result.insertId,
        status: 'GENERATED',
        row_count: rows.length,
        file_path: filePath,
        file_format: format,
        summary,
    };
};

// ──────────────────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────────────────
const list = async ({ createdBy, role, report_type }) => {
    const where = ['1 = 1'];
    const params = [];
    if (['USER'].includes(role)) {
        where.push('r.created_by = ?');
        params.push(createdBy);
    }
    if (report_type) {
        where.push('r.report_type = ?');
        params.push(report_type);
    }
    const [rows] = await db.query(
        `SELECT r.id, r.report_type, r.title, r.period_from, r.period_to,
            r.department_id, r.file_format, r.row_count, r.status,
            r.summary_json, r.created_at,
            u.full_name AS creator_name, u.employee_code,
            d.name AS department
       FROM reports r
       LEFT JOIN users u ON u.id = r.created_by
       LEFT JOIN departments d ON d.id = r.department_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC
      LIMIT 200`,
        params
    );
    return rows.map((r) => ({
        ...r,
        summary_json: (() => {
            try { return r.summary_json ? JSON.parse(r.summary_json) : null; }
            catch { return null; }
        })(),
    }));
};

const getById = async (id) => {
    const [rows] = await db.execute(
        `SELECT r.*, u.full_name AS creator_name, d.name AS department
       FROM reports r
       LEFT JOIN users u ON u.id = r.created_by
       LEFT JOIN departments d ON d.id = r.department_id
      WHERE r.id = ? LIMIT 1`,
        [id]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        ...row,
        summary_json: (() => {
            try { return row.summary_json ? JSON.parse(row.summary_json) : null; }
            catch { return null; }
        })(),
        params_json: (() => {
            try { return row.params_json ? JSON.parse(row.params_json) : null; }
            catch { return null; }
        })(),
    };
};

module.exports = { generate, list, getById };
