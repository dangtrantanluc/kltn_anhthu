const express = require('express');
const router = express.Router();
const ctrl = require('./requests.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./requests.schema');

router.use(verifyToken);

// GET /requests - scope-aware
router.get('/', validate(schemas.listRequestSchema), ctrl.getAll);

// GET /requests/pending-count - badge
router.get('/pending-count', ctrl.getPendingCount);

// POST /requests - submit
router.post('/', validate(schemas.createRequestSchema), ctrl.create);

// DELETE /requests/:id - owner cancels PENDING
router.delete('/:id', ctrl.cancel);

// PATCH /requests/:id/approve - Manager+
router.patch(
    '/:id/approve',
    checkRole(['ADMIN', 'HR', 'MANAGER']),
    ctrl.approve
);

// PATCH /requests/:id/reject - Manager+
router.patch(
    '/:id/reject',
    checkRole(['ADMIN', 'HR', 'MANAGER']),
    validate(schemas.rejectSchema),
    ctrl.reject
);

module.exports = router;
