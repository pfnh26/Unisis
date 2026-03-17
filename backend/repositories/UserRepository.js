const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'users');
    }

    async findByUsername(username) {
        const result = await this.pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0];
    }

    async register(name, username, hashedPassword) {
        const result = await this.pool.query(
            'INSERT INTO users (name, username, password, role, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, role, permissions',
            [name, username, hashedPassword, 'Operador', JSON.stringify(['clients', 'products', 'partners', 'contracts', 'sales', 'inventory', 'finance'])]
        );
        return result.rows[0];
    }
}

module.exports = UserRepository;
