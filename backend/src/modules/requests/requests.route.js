const express = require('express');
const router = express.Router();
const ctrl = require('./requests.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

// GET   /api/requests            — Role-aware (own list vs all)
router.get('/', verifyToken, ctrl.getAll);

// POST  /api/requests            — Submit new request
router.post('/', verifyToken, ctrl.create);

// PUT   /api/requests/:id/review — HR/ADMIN/MANAGER review
router.put('/:id/review', verifyToken, checkRole(['ADMIN', 'HR', 'MANAGER']), ctrl.review);

module.exports = router;
