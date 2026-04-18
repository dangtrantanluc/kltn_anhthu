const service = require('./requests.service');

const getAll = async (req, res) => {
    const { userId, role } = req.user;
    try {
        const requests = await service.getAllRequests(userId, role);
        return res.json({ requests });
    } catch (err) {
        console.error('[Requests] getAll error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const create = async (req, res) => {
    const VALID_TYPES = ['LEAVE_REQUEST', 'MISSING_PUNCH'];
    const VALID_LEAVES = ['PAID', 'UNPAID'];
    const { request_type, leave_type, target_date, requested_check_in, requested_check_out, reason } = req.body;

    if (!request_type || !target_date || !reason) {
        return res.status(400).json({ message: 'request_type, target_date, reason là bắt buộc.' });
    }
    if (!VALID_TYPES.includes(request_type.toUpperCase())) {
        return res.status(400).json({ message: `request_type phải là: ${VALID_TYPES.join(', ')}` });
    }
    if (leave_type && !VALID_LEAVES.includes(leave_type.toUpperCase())) {
        return res.status(400).json({ message: `leave_type phải là: ${VALID_LEAVES.join(', ')}` });
    }

    try {
        const id = await service.createRequest(req.user.userId, {
            request_type, leave_type, target_date, requested_check_in, requested_check_out, reason
        });
        return res.status(201).json({ message: 'Đã gửi đơn thành công.', id });
    } catch (err) {
        console.error('[Requests] create error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

const review = async (req, res) => {
    const { status, reject_reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status?.toUpperCase())) {
        return res.status(400).json({ message: 'status phải là APPROVED hoặc REJECTED.' });
    }
    try {
        await service.reviewRequest(req.params.id, req.user.userId, status, reject_reason);
        return res.json({ message: `Đơn đã được ${status.toLowerCase()}.` });
    } catch (err) {
        console.error('[Requests] review error:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
};

module.exports = { getAll, create, review };
