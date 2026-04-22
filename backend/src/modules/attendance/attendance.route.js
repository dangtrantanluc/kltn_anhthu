const express = require('express');
const router = express.Router();
const ctrl = require('./attendance.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./attendance.schema');

router.use(verifyToken);

// USER punch-in/out
router.post('/punch', validate(schemas.punchSchema), ctrl.punch);

// GET me
router.get('/me', validate(schemas.listSchema), ctrl.getMyAttendance);

// GET all — Admin/HR/Manager (Manager bị scope trong controller)
router.get(
    '/',
    checkRole(['ADMIN', 'HR', 'MANAGER']),
    validate(schemas.listSchema),
    ctrl.getAllAttendance
);

// PUT :id — Admin/Manager manual edit
router.put(
    '/:id',
    checkRole(['ADMIN', 'HR', 'MANAGER']),
    validate(schemas.editSchema),
    ctrl.editAttendance
);

// Admin/HR: import + rollup
router.post('/sync', checkRole(['ADMIN', 'HR']), ctrl.syncPunchLogs);
router.post('/process', checkRole(['ADMIN', 'HR']), ctrl.triggerProcess);
router.post('/rollup', checkRole(['ADMIN', 'HR']), ctrl.triggerProcess);

module.exports = router;
