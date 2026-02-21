const bcrypt = require('bcryptjs');

class SellerService {
    constructor(sellerRepository, userRepository, pool) {
        this.sellerRepository = sellerRepository;
        this.userRepository = userRepository;
        this.pool = pool; // Still needed for transactions if we don't have a transaction-capable repo yet
    }

    async getAllSellers(search = null) {
        if (search) {
            return await this.sellerRepository.search(search);
        }
        return await this.sellerRepository.findAll({ orderBy: 'name ASC' });
    }

    async createSeller(name, username, password, profit_percentage) {
        // Use a transaction for creating user and seller
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const hashedPassword = await bcrypt.hash(password, 10);

            const userRes = await client.query(
                'INSERT INTO users (name, username, password, role, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [name, username, hashedPassword, 'Vendedor', JSON.stringify(['service-orders', 'reports'])]
            );
            const userId = userRes.rows[0].id;

            const sellerRes = await client.query(
                'INSERT INTO sellers (user_id, name, profit_percentage) VALUES ($1, $2, $3) RETURNING *',
                [userId, name, profit_percentage]
            );

            await client.query('COMMIT');
            return sellerRes.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async updateSeller(id, updates) {
        return await this.sellerRepository.update(id, updates);
    }

    async deleteSeller(id) {
        const seller = await this.sellerRepository.findById(id);
        if (seller) {
            await this.userRepository.delete(seller.user_id);
        }
        return await this.sellerRepository.delete(id);
    }
}

module.exports = SellerService;
