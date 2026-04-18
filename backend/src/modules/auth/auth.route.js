const express = require('express');
const router = express.Router();

const { login, getMe } = require('./auth.controller');
const verifyToken = require('../../middlewares/verifyToken');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (protected)
router.get('/me', verifyToken, getMe);

module.exports = router;
