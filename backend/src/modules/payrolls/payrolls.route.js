const express = require('express');
const router = express.Router();
const ctrl = require('./payrolls.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./payrolls.schema');

// List (scope-aware: USER=own, MANAGER=dept, ADMIN/HR/ACCOUNTANT=all)
router.get('/', verifyToken, ctrl.list);

// Bulk export list — đặt TRƯỚC '/:id' tránh bị shadow
router.get('/export', verifyToken, checkRole(['ADMIN', 'HR', 'ACCOUNTANT', 'MANAGER']), ctrl.exportList);

// Generate / recompute cho 1 kỳ — toàn công ty / 1 phòng / 1 user
router.post('/generate', verifyToken, checkRole(['ADMIN', 'HR', 'ACCOUNTANT']), validate(schemas.generate), ctrl.generate);

// Get 1 phiếu
router.get('/:id', verifyToken, ctrl.getOne);

// Cập nhật DRAFT (ACCOUNTANT/HR)
router.put('/:id', verifyToken, checkRole(['ADMIN', 'HR', 'ACCOUNTANT']), validate(schemas.update), ctrl.update);

// Duyệt cấp 1 — MANAGER (cùng phòng ban)
router.patch('/:id/manager-approve', verifyToken, checkRole(['ADMIN', 'MANAGER']), ctrl.managerApprove);

// Nhân viên xác nhận phiếu của mình
router.patch('/:id/employee-confirm', verifyToken, ctrl.employeeConfirm);

// Export 1 phiếu xlsx | pdf
router.get('/:id/export', verifyToken, ctrl.exportOne);

module.exports = router;
