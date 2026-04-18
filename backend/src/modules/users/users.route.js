const express = require('express');
const router = express.Router();
const ctrl = require('./users.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

router.use(verifyToken);

// GET /api/users  — ADMIN, HR
router.get('/', checkRole(['ADMIN', 'HR']), ctrl.getAllUsers);

// GET /api/users/:id — ADMIN, HR, MANAGER
router.get('/:id', checkRole(['ADMIN', 'HR', 'MANAGER']), ctrl.getUserById);

// POST /api/users  — ADMIN, HR
router.post('/', checkRole(['ADMIN', 'HR']), ctrl.createUser);

// PUT /api/users/:id  — ADMIN, HR
router.put('/:id', checkRole(['ADMIN', 'HR']), ctrl.updateUser);

module.exports = router;
