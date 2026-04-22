#!/usr/bin/env node
/**
 * Migration runner - Áp dụng các file .sql trong thư mục migrations/
 * theo thứ tự alphabet, chỉ chạy migration mới (tracking trong
 * bảng schema_migrations).
 *
 *   node migrations/runner.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hris_db',
    multipleStatements: true,
};

async function ensureDatabase() {
    const { database, ...rest } = config;
    const rootConn = await mysql.createConnection(rest);
    await rootConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await rootConn.end();
}

async function run() {
    await ensureDatabase();
    const conn = await mysql.createConnection(config);
    console.log(`[migrate] Connected to ${config.database}`);

    await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const [applied] = await conn.query(
        'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    const dir = __dirname;
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    let applied_now = 0;
    for (const file of files) {
        if (appliedSet.has(file)) {
            console.log(`  ↷ skip    ${file}`);
            continue;
        }
        const sql = fs.readFileSync(path.join(dir, file), 'utf8');
        try {
            await conn.query(sql);
            await conn.query(
                'INSERT INTO schema_migrations (filename) VALUES (?)',
                [file]
            );
            console.log(`  ✓ applied ${file}`);
            applied_now += 1;
        } catch (err) {
            console.error(`  ✗ failed  ${file}: ${err.message}`);
            await conn.end();
            process.exit(1);
        }
    }

    await conn.end();
    console.log(
        applied_now === 0
            ? '[migrate] No new migrations.'
            : `[migrate] Applied ${applied_now} migration(s).`
    );
}

run().catch((err) => {
    console.error('[migrate] Error:', err);
    process.exit(1);
});
