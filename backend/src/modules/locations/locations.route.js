const express = require('express');
const router = express.Router();
const ctrl = require('./locations.controller');
const verifyToken = require('../../middlewares/verifyToken');
const checkRole = require('../../middlewares/checkRole');
const validate = require('../../middlewares/validate');
const schemas = require('./locations.schema');

router.use(verifyToken);

// GET /locations — any authenticated (để punch page pick nearest)
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

// Admin-only
router.post('/', checkRole(['ADMIN']), validate(schemas.createLocationSchema), ctrl.create);
router.put('/:id', checkRole(['ADMIN']), validate(schemas.updateLocationSchema), ctrl.update);
router.delete('/:id', checkRole(['ADMIN']), ctrl.remove);

module.exports = router;
