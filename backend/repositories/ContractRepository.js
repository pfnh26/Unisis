const BaseRepository = require('./BaseRepository');

class ContractRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'contracts');
    }

    async findAllWithDetails() {
        const query = `
            SELECT c.*, cl.name as client_name, p.name as partner_name, s.name as seller_name
            FROM contracts c
            JOIN clients cl ON c.client_id = cl.id
            JOIN partners p ON c.partner_id = p.id
            LEFT JOIN sellers s ON c.seller_id = s.id
            ORDER BY c.created_at DESC
        `;
        return this.query(query);
    }

    async updateStatus(id, status) {
        const query = 'UPDATE contracts SET status = $1 WHERE id = $2 RETURNING *';
        const result = await this.pool.query(query, [status, id]);
        return result.rows[0];
    }
}

module.exports = ContractRepository;
