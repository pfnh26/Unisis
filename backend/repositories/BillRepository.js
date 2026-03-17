const BaseRepository = require('./BaseRepository');

class BillRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'bills_payable');
    }

    async findAllWithFilters(filters = {}) {
        const { status, startDate, endDate, overdue, upcoming } = filters;
        let query = 'SELECT * FROM bills_payable WHERE 1=1';
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        if (startDate && endDate) {
            params.push(startDate);
            params.push(endDate);
            query += ` AND due_date BETWEEN $${params.length - 1} AND $${params.length}`;
        } else if (startDate) {
            params.push(startDate);
            query += ` AND due_date >= $${params.length}`;
        } else if (endDate) {
            params.push(endDate);
            query += ` AND due_date <= $${params.length}`;
        }

        if (overdue) {
            query += " AND due_date < CURRENT_DATE AND status = 'Pendente'";
        }

        if (upcoming) {
            query += " AND due_date >= CURRENT_DATE AND status = 'Pendente'";
        }

        query += ' ORDER BY due_date ASC';
        return this.query(query, params);
    }
}

module.exports = BillRepository;
