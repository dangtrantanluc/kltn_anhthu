const db = require('../../config/db');

/**
 * GET /api/audit-logs
 * Query: actor_id, action, entity, entity_id, from, to, page, limit
 * Chỉ ADMIN / HR xem được.
 */
const list = async (req, res) => {
    try {
        const {
            actor_id, action, entity, entity_id,
            from, to, page = 1, limit = 50,
        } = req.query;

        const where = ['1 = 1'];
        const params = [];
        if (actor_id) { where.push('al.actor_id = ?'); params.push(actor_id); }
        if (action) { where.push('al.action = ?'); params.push(action); }
        if (entity) { where.push('al.entity = ?'); params.push(entity); }
        if (entity_id) { where.push('al.entity_id = ?'); params.push(entity_id); }
        if (from) { where.push('al.created_at >= ?'); params.push(from); }
        if (to) { where.push('al.created_at <= ?'); params.push(to); }

        const lim = Math.min(parseInt(limit) || 50, 200);
        const offset = (parseInt(page) - 1) * lim;

        const [rows] = await db.query(
            `SELECT al.id, al.actor_id, al.action, al.entity, al.entity_id,
              al.diff_json, al.ip, al.user_agent, al.created_at,
              u.full_name AS actor_name, u.employee_code AS actor_code, u.role AS actor_role
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.actor_id
        WHERE ${where.join(' AND ')}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM audit_logs al WHERE ${where.join(' AND ')}`,
            params
        );

        return res.json({
            items: rows.map((r) => ({
                ...r,
                diff_json: (() => {
                    try { return r.diff_json ? JSON.parse(r.diff_json) : null; }
                    catch { return null; }
                })(),
            })),
            total: countRows[0].total,
            page: parseInt(page),
            limit: lim,
        });
    } catch (err) {
        console.error('[Audit] list error:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

/** GET /api/audit-logs/actions — distinct action list */
const listActions = async (_req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT DISTINCT action FROM audit_logs ORDER BY action ASC`
        );
        return res.json({ actions: rows.map((r) => r.action) });
    } catch (err) {
        console.error('[Audit] listActions error:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

module.exports = { list, listActions };
