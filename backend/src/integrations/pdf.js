const PDFDocument = require('pdfkit');

const fmtMoney = (n) =>
    new Intl.NumberFormat('vi-VN').format(Number(n || 0));

/**
 * Tạo PDF phiếu lương cá nhân, trả về Buffer (Promise)
 * Lưu ý: pdfkit default font "Helvetica" không hỗ trợ đầy đủ ký tự tiếng Việt
 * có dấu. Chấp nhận trong phạm vi KLTN; nếu cần font VN, load file TTF qua
 * `doc.registerFont(...)` rồi `doc.font('VN')`.
 */
const buildPayrollSlipPDF = (payroll) =>
    new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('PAYROLL SLIP', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#555').text(
                `Period: ${String(payroll.payroll_month).padStart(2, '0')}/${payroll.payroll_year}`,
                { align: 'center' }
            );
            doc.moveDown(1);

            // Employee info
            doc.fillColor('#000').fontSize(12);
            const col1 = 60;
            const col2 = 200;
            const col3 = 330;
            const col4 = 440;
            let y = doc.y;

            const line = (k1, v1, k2, v2) => {
                doc.font('Helvetica-Bold').text(k1, col1, y);
                doc.font('Helvetica').text(String(v1 || ''), col2, y);
                if (k2) {
                    doc.font('Helvetica-Bold').text(k2, col3, y);
                    doc.font('Helvetica').text(String(v2 || ''), col4, y);
                }
                y += 18;
            };

            line('Employee code', payroll.employee_code, 'Full name', payroll.full_name);
            line('Department', payroll.department || '-', 'Position', payroll.position || '-');
            line('Status', payroll.status, 'Email', payroll.email || '-');

            y += 12;
            doc.moveTo(col1, y).lineTo(555, y).strokeColor('#3B82F6').lineWidth(1.2).stroke();
            y += 14;

            // Table
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#111');
            doc.text('Item', col1, y);
            doc.text('Value', col3, y, { width: 200, align: 'right' });
            y += 18;
            doc.moveTo(col1, y).lineTo(555, y).strokeColor('#ccc').lineWidth(0.5).stroke();
            y += 6;

            const items = [
                ['Actual worked hours', `${Number(payroll.total_actual_hours)} h`],
                ['Paid leave hours', `${Number(payroll.total_paid_leave_hours)} h`],
                ['Hourly wage (snapshot)', `${fmtMoney(payroll.base_hourly_wage_snapshot)} VND`],
                ['Multiplier', Number(payroll.salary_multiplier_snapshot)],
            ];
            doc.font('Helvetica').fontSize(11).fillColor('#222');
            for (const [k, v] of items) {
                doc.text(k, col1, y);
                doc.text(String(v), col3, y, { width: 200, align: 'right' });
                y += 18;
            }

            y += 8;
            doc.moveTo(col1, y).lineTo(555, y).strokeColor('#ccc').lineWidth(0.5).stroke();
            y += 8;

            doc.font('Helvetica-Bold').fontSize(13).fillColor('#065F46');
            doc.text('TOTAL', col1, y);
            doc.text(`${fmtMoney(payroll.total_calculated_salary)} VND`, col3, y, {
                width: 200,
                align: 'right',
            });

            // Footer
            doc.font('Helvetica').fontSize(9).fillColor('#777');
            doc.text(
                `Generated at ${new Date().toLocaleString('en-GB')} — HRIS`,
                50, 780, { align: 'center' }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });

module.exports = { buildPayrollSlipPDF };
