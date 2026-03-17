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
