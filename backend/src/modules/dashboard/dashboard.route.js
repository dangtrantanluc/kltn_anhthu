const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

router.get(
    '/admin',
    verifyToken,
    checkRole(['ADMIN', 'HR', 'MANAGER', 'ACCOUNTANT']),
    ctrl.adminOverview
);

module.exports = router;
