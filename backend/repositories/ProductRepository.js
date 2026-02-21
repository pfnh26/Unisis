const BaseRepository = require('./BaseRepository');

class ProductRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'products');
    }

    async search(searchTerm) {
        const query = `
            SELECT * FROM products 
            WHERE description ILIKE $1 OR code ILIKE $1
            ORDER BY description ASC
        `;
        return this.query(query, [`%${searchTerm}%`]);
    }

    async findByCode(code) {
        const result = await this.pool.query(`SELECT * FROM ${this.table} WHERE code = $1`, [code]);
        return result.rows[0];
    }
}

module.exports = ProductRepository;
