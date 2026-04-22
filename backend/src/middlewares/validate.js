/**
 * Zod validate middleware
 *
 * Usage:
 *   const { z } = require('zod');
 *   const schema = { body: z.object({ email: z.string().email() }) };
 *   router.post('/login', validate(schema), controller);
 */
const validate = (schemas = {}) => (req, res, next) => {
    try {
        if (schemas.body) req.body = schemas.body.parse(req.body);
        if (schemas.query) req.query = schemas.query.parse(req.query);
        if (schemas.params) req.params = schemas.params.parse(req.params);
        next();
    } catch (err) {
        const issues = (err.issues || []).map((i) => ({
            path: i.path.join('.'),
            message: i.message,
        }));
        return res.status(400).json({
            message: 'Dữ liệu không hợp lệ.',
            errors: issues.length ? issues : [{ message: err.message }],
        });
    }
};

module.exports = validate;
