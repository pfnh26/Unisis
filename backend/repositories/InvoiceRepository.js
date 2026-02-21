const BaseRepository = require('./BaseRepository');

class InvoiceRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'invoices');
    }

    async findAllWithDetails() {
        const query = `
            SELECT i.*, p.name as partner_name 
            FROM invoices i 
            LEFT JOIN partners p ON i.partner_id = p.id 
            ORDER BY i.date DESC, i.created_at DESC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }
}

module.exports = InvoiceRepository;
