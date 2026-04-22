const express = require('express');
const router = express.Router();
const ctrl = require('./shifts.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./shifts.schema');

router.use(verifyToken);

router.get('/', ctrl.getAll);
router.post('/', checkRole(['ADMIN', 'HR']), validate(schemas.createShiftSchema), ctrl.create);
router.put('/:id', checkRole(['ADMIN', 'HR']), validate(schemas.updateShiftSchema), ctrl.update);
router.delete('/:id', checkRole(['ADMIN']), ctrl.remove);

module.exports = router;
