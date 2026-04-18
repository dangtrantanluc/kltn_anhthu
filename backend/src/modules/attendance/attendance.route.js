const express = require('express');
const router = express.Router();
const ctrl = require('./attendance.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

// POST /api/attendance/sync   — Device or ADMIN/HR
router.post('/sync', verifyToken, checkRole(['ADMIN', 'HR']), ctrl.syncPunchLogs);

// POST /api/attendance/process — Manual trigger
router.post('/process', verifyToken, checkRole(['ADMIN', 'HR']), ctrl.triggerProcess);

// GET /api/attendances/me
router.get('/me', verifyToken, ctrl.getMyAttendance);

// GET /api/attendances  — Admin/HR/Manager
router.get('/', verifyToken, checkRole(['ADMIN', 'HR', 'MANAGER']), ctrl.getAllAttendance);

module.exports = router;
