const db = require('../../config/db');

const getAllDepartments = async () => {
    const [rows] = await db.execute(
        `SELECT d.*, u.full_name AS manager_name
     FROM departments d
     LEFT JOIN users u ON u.id = d.manager_id
     ORDER BY d.name`
    );
    return rows;
};

const createDepartment = async (code, name, manager_id) => {
    const [result] = await db.execute(
        `INSERT INTO departments (code, name, manager_id) VALUES (?, ?, ?)`,
        [code.toUpperCase(), name, manager_id || null]
    );
    return result.insertId;
};

const updateDepartment = async (id, name, manager_id) => {
    await db.execute(
        `UPDATE departments SET name=?, manager_id=? WHERE id=?`,
        [name, manager_id || null, id]
    );
};

const removeDepartment = async (id) => {
    await db.execute(`DELETE FROM departments WHERE id=?`, [id]);
};

module.exports = {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    removeDepartment,
};
