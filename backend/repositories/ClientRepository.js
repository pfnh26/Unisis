const BaseRepository = require('./BaseRepository');

class ClientRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'clients');
    }

    async search(searchTerm) {
        let query;
        let params;

        if (searchTerm.startsWith('#')) {
            const idSearch = searchTerm.substring(1);
            query = `SELECT * FROM clients WHERE CAST(id AS TEXT) = $1 ORDER BY name ASC`;
            params = [idSearch];
        } else {
            query = `
                SELECT * FROM clients 
                WHERE name ILIKE $1 OR cnpj ILIKE $1 OR cpf ILIKE $1
                ORDER BY name ASC
            `;
            params = [`%${searchTerm}%`];
        }

        return this.query(query, params);
    }

    async findAssignedToSeller(userId) {
        const query = `
            SELECT DISTINCT cl.* 
            FROM clients cl
            JOIN contracts c ON cl.id = c.client_id
            JOIN sellers s ON c.seller_id = s.id
            WHERE s.user_id = $1 AND c.status = 'Ativo'
            ORDER BY cl.name ASC
        `;
        return this.query(query, [userId]);
    }
}

module.exports = ClientRepository;
