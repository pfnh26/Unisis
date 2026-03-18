class PaymentService {
    constructor(paymentRepository, contractRepository, saleRepository) {
        this.paymentRepository = paymentRepository;
        this.contractRepository = contractRepository;
        this.saleRepository = saleRepository;
    }

    async getPaymentsByContract(contractId) {
        return await this.paymentRepository.findByContractId(contractId);
    }

    async createPayment(data) {
        // Deduplication
        if (data.contract_id && data.due_date_ref) {
            const existing = await this.paymentRepository.findOne({
                where: 'contract_id = $1 AND due_date_ref = $2',
                params: [data.contract_id, data.due_date_ref]
            });
            if (existing) return existing;
        }

        if (data.sale_id) {
            const existing = await this.paymentRepository.findOne({
                where: 'sale_id = $1',
                params: [data.sale_id]
            });
            if (existing) return existing;
        }

        return await this.paymentRepository.create(data);
    }

    async getContracts() {
        return await this.contractRepository.findAllWithDetails();
    }

    async getSales() {
        return await this.saleRepository.findAllWithDetails();
    }
}

module.exports = PaymentService;
