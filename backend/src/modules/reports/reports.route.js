const express = require('express');
const router = express.Router();
const ctrl = require('./reports.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./reports.schema');

// Tạo báo cáo: MANAGER, HR, ADMIN, ACCOUNTANT
router.post(
    '/generate',
    verifyToken,
    checkRole(['ADMIN', 'HR', 'MANAGER', 'ACCOUNTANT']),
    validate(schemas.generate),
    ctrl.generate
);

// Danh sách / chi tiết
router.get('/', verifyToken, ctrl.list);
router.get('/:id', verifyToken, ctrl.getOne);
router.get('/:id/download', verifyToken, ctrl.download);

module.exports = router;
