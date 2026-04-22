const db = require('../config/db');

/**
 * Ghi audit log không chặn luồng chính (best-effort).
 * Không throw — lỗi audit chỉ log console.
 *
 * @param {Object} opts
 * @param {number} opts.actorId  - req.user.userId
 * @param {string} opts.action   - 'PAYROLL_GENERATE', 'USER_UPDATE', ...
 * @param {string} [opts.entity] - 'payrolls', 'users', ...
 * @param {number|string} [opts.entityId]
 * @param {Object} [opts.diff]   - trước/sau hoặc payload
 * @param {string} [opts.ip]
 * @param {string} [opts.userAgent]
 */
const writeAudit = async ({ actorId, action, entity, entityId, diff, ip, userAgent }) => {
    try {
        await db.execute(
            `INSERT INTO audit_logs (actor_id, action, entity, entity_id, diff_json, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                actorId || null,
                action,
                entity || null,
                entityId || null,
                diff ? JSON.stringify(diff) : null,
                ip || null,
                userAgent ? String(userAgent).slice(0, 255) : null,
            ]
        );
    } catch (err) {
        console.error('[audit] failed:', err.message);
    }
};

/** Middleware helper — gắn req info vào audit thay vì phải truyền thủ công */
const auditFromReq = (req, action, entity, entityId, diff) =>
    writeAudit({
        actorId: req.user?.userId,
        action,
        entity,
        entityId,
        diff,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

module.exports = { writeAudit, auditFromReq };
