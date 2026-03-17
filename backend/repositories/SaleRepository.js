const BaseRepository = require('./BaseRepository');

class SaleRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'extra_sales');
    }

    async findAllWithDetails() {
        const query = `
            SELECT s.*, c.name as client_name, sl.name as seller_name, p.name as partner_name 
            FROM extra_sales s
            JOIN clients c ON s.client_id = c.id
            JOIN sellers sl ON s.seller_id = sl.id
            JOIN partners p ON s.partner_id = p.id
            ORDER BY s.created_at DESC
        `;
        return this.query(query);
    }
}

module.exports = SaleRepository;
