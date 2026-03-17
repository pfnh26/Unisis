const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'inventory_log');
    }

    async findAllWithDetails() {
        const query = `
            SELECT l.*, p.description as product_name, p.code 
            FROM inventory_log l 
            JOIN products p ON l.product_id = p.id 
            ORDER BY l.created_at DESC
        `;
        return this.query(query);
    }
}

module.exports = InventoryRepository;
