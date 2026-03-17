const BaseRepository = require('./BaseRepository');

class SellerRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'sellers');
    }

    async search(searchTerm) {
        const query = `
            SELECT * FROM sellers 
            WHERE name ILIKE $1
            ORDER BY name ASC
        `;
        return this.query(query, [`%${searchTerm}%`]);
    }

    async findByUserId(userId) {
        const result = await this.pool.query('SELECT * FROM sellers WHERE user_id = $1', [userId]);
        return result.rows[0];
    }
}

module.exports = SellerRepository;
