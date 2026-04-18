const express = require('express');
const router = express.Router();
const ctrl = require('./shifts.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

router.use(verifyToken);

router.get('/', ctrl.getAll);
router.post('/', checkRole(['ADMIN', 'HR']), ctrl.create);
router.put('/:id', checkRole(['ADMIN', 'HR']), ctrl.update);

module.exports = router;
