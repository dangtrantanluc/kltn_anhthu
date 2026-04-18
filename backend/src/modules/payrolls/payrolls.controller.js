const service = require('./payrolls.service');

const getAll = async (req, res) => {
    const { userId, role } = req.user;
    const { year, month, user_id } = req.query;

    try {
        const payrolls = await service.getAllPayrolls(userId, role, year, month, user_id);
        return res.json({ payrolls });
    } catch (err) {
        console.error('[Payrolls] getAll error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const calculate = async (req, res) => {
    const { user_id, payroll_month, payroll_year } = req.body;
    if (!user_id || !payroll_month || !payroll_year) {
        return res.status(400).json({ message: 'user_id, payroll_month, payroll_year là bắt buộc.' });
    }

    try {
        const payrollData = await service.calculatePayroll(user_id, payroll_month, payroll_year);
        if (!payrollData) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        return res.status(201).json({
            message: 'Tính lương thành công.',
            ...payrollData
        });
    } catch (err) {
        console.error('[Payrolls] calculate error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const approve = async (req, res) => {
    try {
        await service.approvePayroll(req.params.id);
        return res.json({ message: 'Đã duyệt phiếu lương.' });
    } catch (err) {
        console.error('[Payrolls] approve error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const confirm = async (req, res) => {
    try {
        const payroll = await service.getPayrollById(req.params.id);
        if (!payroll) return res.status(404).json({ message: 'Không tìm thấy phiếu lương.' });

        if (payroll.user_id !== req.user.userId) {
            return res.status(403).json({ message: 'Chỉ chủ sở hữu mới có thể xác nhận.' });
        }
        if (payroll.status !== 'MANAGER_APPROVED') {
            return res.status(400).json({ message: 'Phiếu lương chưa được duyệt bởi quản lý.' });
        }

        await service.confirmPayroll(req.params.id);
        return res.json({ message: 'Đã xác nhận phiếu lương.' });
    } catch (err) {
        console.error('[Payrolls] confirm error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { getAll, calculate, approve, confirm };
