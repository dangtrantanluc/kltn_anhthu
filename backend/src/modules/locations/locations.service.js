const db = require('../../config/db');

const listAll = async ({ active_only = false } = {}) => {
    const where = active_only ? 'WHERE is_active = 1' : '';
    const [rows] = await db.execute(
        `SELECT id, name, address, latitude, longitude, radius_m, is_active, created_at
       FROM locations ${where}
       ORDER BY name ASC`
    );
    return rows;
};

const getById = async (id) => {
    const [rows] = await db.execute(
        'SELECT * FROM locations WHERE id = ? LIMIT 1',
        [id]
    );
    return rows[0] || null;
};

const create = async (data) => {
    const [r] = await db.execute(
        `INSERT INTO locations (name, address, latitude, longitude, radius_m, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [
            data.name,
            data.address || null,
            data.latitude,
            data.longitude,
            data.radius_m,
            data.is_active ? 1 : 0,
        ]
    );
    return r.insertId;
};

const update = async (id, data) => {
    await db.execute(
        `UPDATE locations SET name=?, address=?, latitude=?, longitude=?, radius_m=?, is_active=?
     WHERE id=?`,
        [
            data.name,
            data.address || null,
            data.latitude,
            data.longitude,
            data.radius_m,
            data.is_active ? 1 : 0,
            id,
        ]
    );
};

const remove = async (id) => {
    const [r] = await db.execute('DELETE FROM locations WHERE id = ?', [id]);
    return r.affectedRows > 0;
};

module.exports = { listAll, getById, create, update, remove };
