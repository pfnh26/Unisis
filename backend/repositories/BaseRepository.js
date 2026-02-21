class BaseRepository {
    constructor(pool, table) {
        this.pool = pool;
        this.table = table;
    }

    async findAll(options = {}) {
        const { where, params = [], orderBy = 'id DESC' } = options;
        let query = `SELECT * FROM ${this.table}`;
        if (where) {
            query += ` WHERE ${where}`;
        }
        query += ` ORDER BY ${orderBy}`;
        const result = await this.pool.query(query, params);
        return result.rows;
    }

    async findById(id) {
        const result = await this.pool.query(`SELECT * FROM ${this.table} WHERE id = $1`, [id]);
        return result.rows[0];
    }

    async create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const query = `UPDATE ${this.table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
        const result = await this.pool.query(query, [...values, id]);
        return result.rows[0];
    }

    async delete(id) {
        await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
        return true;
    }

    async query(sql, params) {
        const result = await this.pool.query(sql, params);
        return result.rows;
    }
}

module.exports = BaseRepository;
