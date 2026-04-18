require('dotenv').config();
const db = require('./src/config/db');

console.log('Testing connection to:', process.env.DB_NAME, 'on', process.env.DB_HOST + ':' + process.env.DB_PORT);

db.getConnection()
    .then((conn) => {
        console.log('✅ SUCCESS: MySQL connected!');
        return conn.execute('SELECT VERSION() AS version, DATABASE() AS db_name')
            .then(([rows]) => {
                console.log('  MySQL Version:', rows[0].version);
                console.log('  Database:     ', rows[0].db_name);
                conn.release();
                process.exit(0);
            });
    })
    .catch((err) => {
        console.error('❌ FAILED:', err.message);
        console.error('  Check your .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
        process.exit(1);
    });
