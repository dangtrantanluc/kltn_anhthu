const { verifyAccess } = require('../utils/tokens');

/**
 * verifyToken — parse Bearer, attach decoded → req.user
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided. Access denied.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        req.user = verifyAccess(token); // { userId, employeeCode, email, role, type:'access' }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = verifyToken;
