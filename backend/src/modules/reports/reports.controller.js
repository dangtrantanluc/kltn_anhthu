const fs = require('fs');
const path = require('path');
const service = require('./reports.service');
const { auditFromReq } = require('../../utils/audit');

const generate = async (req, res) => {
    try {
        const result = await service.generate({
            createdBy: req.user.userId,
            ...req.body,
        });
        auditFromReq(req, 'REPORT_GENERATE', 'reports', result.id, {
            report_type: req.body.report_type,
            period_from: req.body.period_from,
            period_to: req.body.period_to,
            file_format: req.body.file_format,
            row_count: result.row_count,
            status: result.status,
        });
        if (result.status === 'EMPTY') {
            return res.status(200).json({
                message: 'Không có dữ liệu cho khoảng thời gian/phòng ban đã chọn.',
                report: result,
            });
        }
        return res.status(201).json({ message: 'Đã tạo báo cáo.', report: result });
    } catch (err) {
        console.error('[Reports] generate error:', err);
        return res.status(err.status || 500).json({ message: err.message || 'Lỗi server.' });
    }
};

const list = async (req, res) => {
    try {
        const rows = await service.list({
            createdBy: req.user.userId,
            role: req.user.role,
            report_type: req.query.report_type,
        });
        return res.json({ reports: rows });
    } catch (err) {
        console.error('[Reports] list error:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

const getOne = async (req, res) => {
    try {
        const r = await service.getById(req.params.id);
        if (!r) return res.status(404).json({ message: 'Không tìm thấy báo cáo.' });
        if (req.user.role === 'USER' && r.created_by !== req.user.userId) {
            return res.status(403).json({ message: 'Bạn không có quyền xem báo cáo này.' });
        }
        return res.json({ report: r });
    } catch (err) {
        console.error('[Reports] getOne error:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

const download = async (req, res) => {
    try {
        const r = await service.getById(req.params.id);
        if (!r) return res.status(404).json({ message: 'Không tìm thấy báo cáo.' });
        if (r.status !== 'GENERATED' || !r.file_path) {
            return res.status(400).json({ message: 'Báo cáo không có file.' });
        }
        if (req.user.role === 'USER' && r.created_by !== req.user.userId) {
            return res.status(403).json({ message: 'Bạn không có quyền tải.' });
        }
        if (!fs.existsSync(r.file_path)) {
            return res.status(410).json({ message: 'File không còn tồn tại trên server.' });
        }
        const ext = path.extname(r.file_path).toLowerCase();
        const mime =
            ext === '.pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        res.setHeader('Content-Type', mime);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${path.basename(r.file_path)}"`
        );
        auditFromReq(req, 'REPORT_DOWNLOAD', 'reports', r.id, { format: ext.replace('.', '') });
        return res.sendFile(r.file_path);
    } catch (err) {
        console.error('[Reports] download error:', err);
        return res.status(500).json({ message: 'Tải file thất bại.' });
    }
};

module.exports = { generate, list, getOne, download };
