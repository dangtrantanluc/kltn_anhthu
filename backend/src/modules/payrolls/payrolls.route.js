const express = require('express');
const router = express.Router();
const ctrl = require('./payrolls.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

// GET   /api/payrolls               — Role-aware (own vs all)
router.get('/', verifyToken, ctrl.getAll);

// POST  /api/payrolls/calculate     — ADMIN/HR only
router.post('/calculate', verifyToken, checkRole(['ADMIN', 'HR']), ctrl.calculate);

// PUT   /api/payrolls/:id/approve   — ADMIN/HR/MANAGER
router.put('/:id/approve', verifyToken, checkRole(['ADMIN', 'HR', 'MANAGER']), ctrl.approve);

// PUT   /api/payrolls/:id/confirm   — Owner confirms
router.put('/:id/confirm', verifyToken, ctrl.confirm);

module.exports = router;
