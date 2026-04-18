const express = require('express');
const router = express.Router();
const ctrl = require('./departments.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');

router.use(verifyToken);

router.get('/', ctrl.getAll);                                     // All authenticated
router.post('/', checkRole(['ADMIN', 'HR']), ctrl.create);
router.put('/:id', checkRole(['ADMIN', 'HR']), ctrl.update);
router.delete('/:id', checkRole(['ADMIN']), ctrl.remove);

module.exports = router;
