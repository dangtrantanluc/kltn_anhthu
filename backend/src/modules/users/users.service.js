const db = require('../../config/db');

const getAllUsers = async () => {
    const [rows] = await db.execute(
        `SELECT u.id, u.employee_code, u.full_name, u.email, u.role, u.gender,
            u.birthdate, u.is_active, u.created_at,
            u.base_hourly_wage, u.salary_multiplier,
            d.name AS department, p.name AS position,
            s.shift_name, m.full_name AS manager_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions   p ON p.id = u.position_id
     LEFT JOIN shifts      s ON s.id = u.shift_id
     LEFT JOIN users       m ON m.id = u.manager_id
     ORDER BY u.created_at DESC`
    );
    return rows;
};

const getUserById = async (id) => {
    const [rows] = await db.execute(
        `SELECT u.id, u.employee_code, u.full_name, u.email, u.role, u.gender,
            u.birthdate, u.is_active, u.created_at,
            u.base_hourly_wage, u.salary_multiplier,
            d.id AS department_id, d.name AS department,
            p.id AS position_id, p.name AS position,
            s.id AS shift_id, s.shift_name,
            m.id AS manager_id, m.full_name AS manager_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions   p ON p.id = u.position_id
     LEFT JOIN shifts      s ON s.id = u.shift_id
     LEFT JOIN users       m ON m.id = u.manager_id
     WHERE u.id = ?`,
        [id]
    );
    return rows[0] || null;
};

const createUser = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO users
       (employee_code, email, password_hash, full_name, role, gender,
        birthdate, department_id, position_id, shift_id, manager_id,
        base_hourly_wage, salary_multiplier)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.employee_code || null,
            data.email,
            data.password_hash,
            data.full_name,
            data.role.toUpperCase(),
            data.gender || null,
            data.birthdate || null,
            data.department_id || null,
            data.position_id || null,
            data.shift_id || null,
            data.manager_id || null,
            data.base_hourly_wage,
            data.salary_multiplier,
        ]
    );
    return result.insertId;
};

const updateUser = async (id, data) => {
    await db.execute(
        `UPDATE users
     SET full_name=?, gender=?, birthdate=?, role=?,
         department_id=?, position_id=?, shift_id=?, manager_id=?,
         base_hourly_wage=?, salary_multiplier=?, is_active=?
     WHERE id=?`,
        [
            data.full_name, data.gender || null, data.birthdate || null, data.role.toUpperCase(),
            data.department_id || null, data.position_id || null, data.shift_id || null, data.manager_id || null,
            data.base_hourly_wage, data.salary_multiplier, data.is_active,
            id,
        ]
    );
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser
};
