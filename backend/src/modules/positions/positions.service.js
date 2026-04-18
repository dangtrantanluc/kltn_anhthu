const db = require('../../config/db');

const getAllPositions = async () => {
    const [rows] = await db.execute(`SELECT * FROM positions ORDER BY name`);
    return rows;
};

const createPosition = async (code, name) => {
    const [result] = await db.execute(
        `INSERT INTO positions (code, name) VALUES (?, ?)`,
        [code.toUpperCase(), name]
    );
    return result.insertId;
};

const updatePosition = async (id, name) => {
    await db.execute(`UPDATE positions SET name=? WHERE id=?`, [name, id]);
};

module.exports = {
    getAllPositions,
    createPosition,
    updatePosition,
};
