const BaseRepository = require('./BaseRepository');

class ReportRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'reports');
    }

    async findAllByUser(userId) {
        const query = `
            SELECT r.*, c.name as client_name, c.email as client_email, c.address as client_address
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `;
        return this.query(query, [userId]);
    }

    async findByIdWithDetails(id) {
        const query = `
            SELECT r.*, c.name as client_name, c.email as client_email, c.address as client_address,
                   c.phone as client_phone
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `;
        const result = await this.query(query, [id]);
        return result[0];
    }

    async findAllWithFilters(filters = {}) {
        const { seller_id, month, year } = filters;
        let query = `
            SELECT r.*, c.name as client_name, c.email as client_email, c.address as client_address,
                   u.name as seller_name
            FROM reports r
            JOIN clients c ON r.client_id = c.id
            JOIN users u ON r.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (seller_id && seller_id !== 'all') {
            params.push(seller_id);
            query += ` AND r.user_id = $${params.length}`;
        }

        if (month) {
            params.push(month);
            query += ` AND EXTRACT(MONTH FROM r.created_at) = $${params.length}`;
        }

        if (year) {
            params.push(year);
            query += ` AND EXTRACT(YEAR FROM r.created_at) = $${params.length}`;
        }

        query += ` ORDER BY r.created_at DESC`;
        return this.query(query, params);
    }
}

module.exports = ReportRepository;
