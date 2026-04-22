const db = require('../../config/db');

const USER_SELECT = `u.id, u.employee_code, u.full_name, u.email, u.role, u.gender,
  u.birthdate, u.is_active, u.created_at, u.updated_at, u.last_login_at,
  u.base_hourly_wage, u.salary_multiplier,
  d.id AS department_id, d.name AS department,
  p.id AS position_id, p.name AS position,
  s.id AS shift_id, s.shift_name,
  m.id AS manager_id, m.full_name AS manager_name`;

const USER_JOIN = `FROM users u
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN positions   p ON p.id = u.position_id
  LEFT JOIN shifts      s ON s.id = u.shift_id
  LEFT JOIN users       m ON m.id = u.manager_id`;

// ──────────────────────────────────────────────────────────
// List with pagination + search + filters
// ──────────────────────────────────────────────────────────
const listUsers = async ({ page, limit, q, department_id, role, is_active }) => {
    const where = [];
    const params = [];

    if (q) {
        where.push(
            '(u.full_name LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ?)'
        );
        const s = `%${q}%`;
        params.push(s, s, s);
    }
    if (department_id) {
        where.push('u.department_id = ?');
        params.push(department_id);
    }
    if (role) {
        where.push('u.role = ?');
        params.push(role.toUpperCase());
    }
    if (is_active !== undefined) {
        where.push('u.is_active = ?');
        params.push(is_active === 'true' ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total ${USER_JOIN} ${whereSql}`,
        params
    );
    const [rows] = await db.query(
        `SELECT ${USER_SELECT} ${USER_JOIN} ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    return { items: rows, total, page, limit };
};

const getUserById = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${USER_SELECT} ${USER_JOIN} WHERE u.id = ?`,
        [id]
    );
    return rows[0] || null;
};

const createUser = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO users
       (employee_code, email, password_hash, full_name, role, gender,
        birthdate, department_id, position_id, shift_id, manager_id,
        base_hourly_wage, salary_multiplier, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
            data.employee_code || null,
            data.email,
            data.password_hash,
            data.full_name,
            data.role,
            data.gender || null,
            data.birthdate || null,
            data.department_id,
            data.position_id,
            data.shift_id,
            data.manager_id,
            data.base_hourly_wage,
            data.salary_multiplier,
        ]
    );
    return result.insertId;
};

const updateUser = async (id, data) => {
    await db.execute(
        `UPDATE users SET
       employee_code=?, email=?, full_name=?, gender=?, birthdate=?, role=?,
       department_id=?, position_id=?, shift_id=?, manager_id=?,
       base_hourly_wage=?, salary_multiplier=?, is_active=?
     WHERE id=?`,
        [
            data.employee_code || null,
            data.email,
            data.full_name,
            data.gender || null,
            data.birthdate || null,
            data.role,
            data.department_id,
            data.position_id,
            data.shift_id,
            data.manager_id,
            data.base_hourly_wage,
            data.salary_multiplier,
            data.is_active ? 1 : 0,
            id,
        ]
    );
};

// Soft delete: is_active=false
const softDeleteUser = async (id) => {
    const [r] = await db.execute(
        'UPDATE users SET is_active = 0 WHERE id = ?',
        [id]
    );
    return r.affectedRows > 0;
};

// PATCH /users/me - whitelist
const updateMe = async (id, data) => {
    const fields = [];
    const params = [];
    if (data.full_name !== undefined) {
        fields.push('full_name = ?');
        params.push(data.full_name);
    }
    if (data.gender !== undefined) {
        fields.push('gender = ?');
        params.push(data.gender);
    }
    if (data.birthdate !== undefined) {
        fields.push('birthdate = ?');
        params.push(data.birthdate);
    }
    if (!fields.length) return;
    params.push(id);
    await db.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        params
    );
};

module.exports = {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    softDeleteUser,
    updateMe,
};
