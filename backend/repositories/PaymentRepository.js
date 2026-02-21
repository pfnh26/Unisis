const BaseRepository = require('./BaseRepository');

class PaymentRepository extends BaseRepository {
    constructor(pool) {
        super(pool, 'payments');
    }

    async findByContractId(contractId) {
        return this.findAll({
            where: 'contract_id = $1',
            params: [contractId],
            orderBy: 'payment_date DESC'
        });
    }
}

module.exports = PaymentRepository;
