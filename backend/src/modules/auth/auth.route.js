const express = require('express');
const router = express.Router();

const ctrl = require('./auth.controller');
const verifyToken = require('../../middlewares/verifyToken');
const validate = require('../../middlewares/validate');
const { loginLimiter, forgotLimiter } = require('../../middlewares/rateLimit');
const schemas = require('./auth.schema');

// ─── Public ─────────────────────────────────────────────
router.post('/login', loginLimiter, validate(schemas.loginSchema), ctrl.login);
router.post('/refresh', validate(schemas.refreshSchema), ctrl.refresh);
router.post('/forgot-password', forgotLimiter, validate(schemas.forgotSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(schemas.resetSchema), ctrl.resetPassword);

// ─── Authenticated ──────────────────────────────────────
router.post('/logout', verifyToken, validate(schemas.logoutSchema), ctrl.logout);
router.post(
    '/change-password',
    verifyToken,
    validate(schemas.changePasswordSchema),
    ctrl.changePassword
);
router.get('/me', verifyToken, ctrl.getMe);

module.exports = router;
