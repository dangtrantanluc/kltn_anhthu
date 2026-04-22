const express = require('express');
const router = express.Router();
const ctrl = require('./audit.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

router.get('/actions', verifyToken, checkRole(['ADMIN', 'HR']), ctrl.listActions);
router.get('/', verifyToken, checkRole(['ADMIN', 'HR']), ctrl.list);

module.exports = router;
