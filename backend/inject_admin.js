const { pool } = require('./db');
const bcrypt = require('bcryptjs');

async function injectAdmin() {
    const name = 'Administrador';
    const username = 'admin';
    const password = 'admin123'; // Standard admin password
    const role = 'Administrador';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET password = $3 RETURNING *',
            [name, username, hashedPassword, role]
        );
        console.log('Admin user injected/updated:', result.rows[0].username);
    } catch (err) {
        console.error('Error injecting admin:', err);
    } finally {
        process.exit(0);
    }
}

injectAdmin();
