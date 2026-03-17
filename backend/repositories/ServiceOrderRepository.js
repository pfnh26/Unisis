const BaseRepository = require('./BaseRepository');

class ServiceOrderRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'service_orders');
    }

    async findAllWithDetails(sellerUserId = null) {
        let query = `
            SELECT so.*, 
                   cl.name as client_name, cl.address as client_address, cl.phone as client_phone,
                   c.type as contract_type,
                   c.description as contract_description,
                   c.id as contract_id,
                   CASE 
                        WHEN es.id IS NOT NULL THEN COALESCE(es.product_description, 'Venda/Serviço Avulso')
                        WHEN c.id IS NOT NULL THEN CONCAT(COALESCE(c.type, 'Contrato'), ' - #', c.id) 
                        ELSE 'Instalação/Manutenção Contrato'
                   END as activity,
                   CASE 
                        WHEN es.id IS NOT NULL THEN COALESCE(NULLIF(es.description, ''), 'Sem descrição detalhada')
                        WHEN c.id IS NOT NULL THEN COALESCE(NULLIF(c.description, ''), 'Sem descrição detalhada')
                        ELSE 'Sem descrição detalhada'
                   END as details_description
            FROM service_orders so
            LEFT JOIN extra_sales es ON so.sale_id = es.id
            LEFT JOIN contracts c ON so.contract_id = c.id
            LEFT JOIN clients cl ON (es.client_id = cl.id OR c.client_id = cl.id)
        `;
        let params = [];

        if (sellerUserId) {
            query += " WHERE so.seller_id = $1";
            params = [sellerUserId];
        }

        query += " ORDER BY so.id DESC";
        return this.query(query, params);
    }
}

module.exports = ServiceOrderRepository;
