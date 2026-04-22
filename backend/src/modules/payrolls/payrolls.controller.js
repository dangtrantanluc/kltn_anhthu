const service = require('./payrolls.service');
const { auditFromReq } = require('../../utils/audit');
const { buildPayrollSlip, buildPayrollList } = require('../../integrations/excel');
const { buildPayrollSlipPDF } = require('../../integrations/pdf');

// GET /api/payrolls
const list = async (req, res) => {
    const { userId, role } = req.user;
    const { year, month, user_id, department_id, status } = req.query;

    try {
        const departmentId = await service.getUserDepartment(userId);
        const payrolls = await service.listPayrolls({
            role,
            userId,
            departmentId,
            year,
            month,
            filterUserId: user_id,
            filterDepartmentId: department_id,
            status,
        });
        return res.json({ payrolls });
    } catch (err) {
        console.error('[Payrolls] list error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

// GET /api/payrolls/:id
const getOne = async (req, res) => {
    try {
        const p = await service.getDetail(req.params.id);
        if (!p) return res.status(404).json({ message: 'Không tìm thấy phiếu lương.' });

        const { role, userId } = req.user;
        if (role === 'USER' && p.user_id !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền xem phiếu này.' });
        }
        if (role === 'MANAGER') {
            const deptId = await service.getUserDepartment(userId);
            if (deptId !== p.department_id) {
                return res.status(403).json({ message: 'Phiếu lương không thuộc phòng ban của bạn.' });
            }
        }
        return res.json({ payroll: p });
    } catch (err) {
        console.error('[Payrolls] getOne error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

// POST /api/payrolls/generate { payroll_month, payroll_year, user_id?, department_id? }
const generate = async (req, res) => {
    const { payroll_month, payroll_year, user_id, department_id } = req.body;
    if (!payroll_month || !payroll_year) {
        return res.status(400).json({ message: 'payroll_month, payroll_year là bắt buộc.' });
    }
    try {
        const result = await service.generateMonthly({
            payroll_month: parseInt(payroll_month),
            payroll_year: parseInt(payroll_year),
            user_id: user_id || null,
            department_id: department_id || null,
        });
        auditFromReq(req, 'PAYROLL_GENERATE', 'payrolls', null, {
            payroll_month, payroll_year, user_id, department_id, result: {
                generated: result.generated, skipped: result.skipped,
            },
        });
        return res.status(201).json({
            message: `Tính lương: ${result.generated} mới/cập nhật, ${result.skipped} bỏ qua.`,
            ...result,
        });
    } catch (err) {
        console.error('[Payrolls] generate error:', err);
        return res.status(err.status || 500).json({ message: err.message || 'Lỗi server nội bộ.' });
    }
};

// PUT /api/payrolls/:id (ACCOUNTANT edits DRAFT)
const update = async (req, res) => {
    try {
        const before = await service.getDetail(req.params.id);
        const updated = await service.updateDraft(req.params.id, req.body);
        auditFromReq(req, 'PAYROLL_UPDATE', 'payrolls', req.params.id, {
            before: before && {
                total_actual_hours: before.total_actual_hours,
                total_paid_leave_hours: before.total_paid_leave_hours,
                base_hourly_wage_snapshot: before.base_hourly_wage_snapshot,
                salary_multiplier_snapshot: before.salary_multiplier_snapshot,
                total_calculated_salary: before.total_calculated_salary,
            },
            after: updated && {
                total_actual_hours: updated.total_actual_hours,
                total_paid_leave_hours: updated.total_paid_leave_hours,
                base_hourly_wage_snapshot: updated.base_hourly_wage_snapshot,
                salary_multiplier_snapshot: updated.salary_multiplier_snapshot,
                total_calculated_salary: updated.total_calculated_salary,
            },
        });
        return res.json({ message: 'Đã cập nhật phiếu lương.', payroll: updated });
    } catch (err) {
        console.error('[Payrolls] update error:', err);
        return res.status(err.status || 500).json({ message: err.message });
    }
};

// PATCH /api/payrolls/:id/manager-approve
const managerApprove = async (req, res) => {
    try {
        const actorDeptId = await service.getUserDepartment(req.user.userId);
        const updated = await service.managerApprove(req.params.id, {
            actorRole: req.user.role,
            actorDeptId,
        });
        auditFromReq(req, 'PAYROLL_MANAGER_APPROVE', 'payrolls', req.params.id, {
            status: 'MANAGER_APPROVED',
        });
        return res.json({ message: 'Đã duyệt phiếu lương.', payroll: updated });
    } catch (err) {
        console.error('[Payrolls] managerApprove error:', err);
        return res.status(err.status || 500).json({ message: err.message });
    }
};

// PATCH /api/payrolls/:id/employee-confirm
const employeeConfirm = async (req, res) => {
    try {
        const updated = await service.employeeConfirm(req.params.id, req.user.userId);
        auditFromReq(req, 'PAYROLL_EMPLOYEE_CONFIRM', 'payrolls', req.params.id, {
            status: 'USER_CONFIRMED',
        });
        return res.json({ message: 'Đã xác nhận phiếu lương.', payroll: updated });
    } catch (err) {
        console.error('[Payrolls] employeeConfirm error:', err);
        return res.status(err.status || 500).json({ message: err.message });
    }
};

// GET /api/payrolls/:id/export?format=xlsx|pdf
const exportOne = async (req, res) => {
    try {
        const payroll = await service.getDetail(req.params.id);
        if (!payroll) return res.status(404).json({ message: 'Không tìm thấy phiếu lương.' });

        const { role, userId } = req.user;
        if (role === 'USER' && payroll.user_id !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền tải phiếu này.' });
        }

        const format = String(req.query.format || 'xlsx').toLowerCase();
        const baseName = `payroll_${payroll.employee_code || payroll.user_id}_${payroll.payroll_year}-${String(payroll.payroll_month).padStart(2, '0')}`;

        if (format === 'pdf') {
            const buf = await buildPayrollSlipPDF(payroll);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
            auditFromReq(req, 'PAYROLL_EXPORT', 'payrolls', payroll.id, { format: 'pdf' });
            return res.send(buf);
        }

        const buf = await buildPayrollSlip(payroll);
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
        auditFromReq(req, 'PAYROLL_EXPORT', 'payrolls', payroll.id, { format: 'xlsx' });
        return res.send(Buffer.from(buf));
    } catch (err) {
        console.error('[Payrolls] export error:', err);
        return res.status(500).json({ message: 'Xuất phiếu lương thất bại.' });
    }
};

// GET /api/payrolls/export?month=...&year=...&department_id=...
const exportList = async (req, res) => {
    try {
        const { role, userId } = req.user;
        const departmentId = await service.getUserDepartment(userId);
        const { year, month, user_id, department_id, status } = req.query;

        const payrolls = await service.listPayrolls({
            role,
            userId,
            departmentId,
            year,
            month,
            filterUserId: user_id,
            filterDepartmentId: department_id,
            status,
        });
        const title = `Bảng lương tháng ${month || '?'}/${year || '?'}`;
        const buf = await buildPayrollList(payrolls, { title });
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="payroll_list_${year}-${month}.xlsx"`);
        auditFromReq(req, 'PAYROLL_EXPORT_LIST', 'payrolls', null, {
            year, month, department_id, count: payrolls.length,
        });
        return res.send(Buffer.from(buf));
    } catch (err) {
        console.error('[Payrolls] exportList error:', err);
        return res.status(500).json({ message: 'Xuất bảng lương thất bại.' });
    }
};

module.exports = {
    list,
    getOne,
    generate,
    update,
    managerApprove,
    employeeConfirm,
    exportOne,
    exportList,
};
