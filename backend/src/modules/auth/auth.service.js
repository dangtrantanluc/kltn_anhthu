const db = require('../../config/db');

const getUserByEmail = async (email) => {
    const [rows] = await db.execute(
        `SELECT u.id, u.employee_code, u.full_name, u.email, u.password_hash,
            u.is_active, u.role,
            d.name AS department, p.name AS position
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions   p ON p.id = u.position_id
     WHERE u.email = ?
     LIMIT 1`,
        [email]
    );
    return rows[0] || null;
};

const getMe = async (userId) => {
    const [rows] = await db.execute(
        `SELECT u.id, u.employee_code, u.full_name, u.email, u.role, u.gender,
            u.birthdate, u.base_hourly_wage, u.salary_multiplier, u.is_active,
            u.created_at, d.name AS department, p.name AS position,
            s.shift_name, m.full_name AS manager_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions   p ON p.id = u.position_id
     LEFT JOIN shifts      s ON s.id = u.shift_id
     LEFT JOIN users       m ON m.id = u.manager_id
     WHERE u.id = ?`,
        [userId]
    );
    return rows[0] || null;
};

module.exports = { getUserByEmail, getMe };
