const express = require('express');
const router = express.Router();
const ctrl = require('./users.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./users.schema');

router.use(verifyToken);

// PATCH /users/me — any authenticated user
router.patch('/me', validate(schemas.updateMeSchema), ctrl.updateMe);

// GET /users
router.get(
    '/',
    checkRole(['ADMIN', 'HR']),
    validate(schemas.listUsersSchema),
    ctrl.getAllUsers
);

// GET /users/:id
router.get('/:id', checkRole(['ADMIN', 'HR', 'MANAGER']), ctrl.getUserById);

// POST /users
router.post(
    '/',
    checkRole(['ADMIN', 'HR']),
    validate(schemas.createUserSchema),
    ctrl.createUser
);

// PUT /users/:id
router.put(
    '/:id',
    checkRole(['ADMIN', 'HR']),
    validate(schemas.updateUserSchema),
    ctrl.updateUser
);

// DELETE /users/:id (soft)
router.delete('/:id', checkRole(['ADMIN', 'HR']), ctrl.deleteUser);

module.exports = router;
