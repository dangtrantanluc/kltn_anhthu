const db = require('../../config/db');
const service = require('./requests.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const getUserDepartmentId = async (userId) => {
    const [rows] = await db.execute(
        'SELECT department_id FROM users WHERE id = ? LIMIT 1',
        [userId]
    );
    return rows[0]?.department_id || null;
};

const handleError = (res, err, fallback) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('[Requests]', err);
    return res.status(500).json({ message: fallback });
};

// GET /requests
const getAll = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const departmentId =
        role === 'MANAGER' ? await getUserDepartmentId(userId) : null;

    const data = await service.listRequests({
        userId,
        role,
        scope: req.query.scope,
        status: req.query.status,
        request_type: req.query.request_type,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        departmentId,
    });
    res.json(data);
});

// GET /requests/pending-count — badge sidebar
const getPendingCount = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const departmentId =
        role === 'MANAGER' ? await getUserDepartmentId(userId) : null;
    const count = await service.countPending({ role, userId, departmentId });
    res.json({ count });
});

// POST /requests
const create = asyncHandler(async (req, res) => {
    try {
        const id = await service.createRequest(req.user.userId, req.body);
        res.status(201).json({ message: 'Đã gửi đơn thành công.', id });
    } catch (err) {
        return handleError(res, err, 'Tạo đơn thất bại.');
    }
});

// PATCH /requests/:id/approve
const approve = asyncHandler(async (req, res) => {
    try {
        const reviewer = {
            userId: req.user.userId,
            role: req.user.role,
            departmentId: await getUserDepartmentId(req.user.userId),
        };
        await service.approveRequest(req.params.id, reviewer);
        res.json({ message: 'Đã duyệt đơn.' });
    } catch (err) {
        return handleError(res, err, 'Duyệt đơn thất bại.');
    }
});

// PATCH /requests/:id/reject
const reject = asyncHandler(async (req, res) => {
    try {
        const reviewer = {
            userId: req.user.userId,
            role: req.user.role,
            departmentId: await getUserDepartmentId(req.user.userId),
        };
        await service.rejectRequest(req.params.id, reviewer, req.body.reject_reason);
        res.json({ message: 'Đã từ chối đơn.' });
    } catch (err) {
        return handleError(res, err, 'Từ chối đơn thất bại.');
    }
});

// DELETE /requests/:id — huỷ đơn của chính mình khi còn PENDING
const cancel = asyncHandler(async (req, res) => {
    try {
        await service.cancelOwnRequest(req.params.id, req.user.userId);
        res.json({ message: 'Đã huỷ đơn.' });
    } catch (err) {
        return handleError(res, err, 'Huỷ đơn thất bại.');
    }
});

module.exports = { getAll, getPendingCount, create, approve, reject, cancel };
