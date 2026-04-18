/**
 * checkRole middleware factory
 * @param {string[]} allowedRoles - e.g. ['admin', 'hr']
 *
 * Usage: router.get('/protected', verifyToken, checkRole(['admin', 'hr']), controller)
 */
const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized. Token missing.' });
        }

        const { role } = req.user;
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({
                message: `Access denied. Required roles: [${allowedRoles.join(', ')}]. Your role: ${role}`,
            });
        }

        next();
    };
};

module.exports = checkRole;
