class ContractService {
    constructor(contractRepository, serviceOrderRepository, sellerRepository) {
        this.contractRepository = contractRepository;
        this.serviceOrderRepository = serviceOrderRepository;
        this.sellerRepository = sellerRepository;
    }

    async getAllContracts() {
        return await this.contractRepository.findAllWithDetails();
    }

    async createContract(data) {
        // Sanitize IDs
        data.client_id = data.client_id || null;
        data.partner_id = data.partner_id || null;
        data.seller_id = data.seller_id || null;
        data.pump_quantity = data.pump_quantity || 1;

        return await this.contractRepository.create(data);
    }

    async updateContractStatus(id, status, execution_date) {
        const contract = await this.contractRepository.updateStatus(id, status);

        // If contract is activated, generate Service Order
        if (status === 'Ativo' && contract.seller_id) {
            const seller = await this.sellerRepository.findById(contract.seller_id);
            if (seller) {
                await this.serviceOrderRepository.create({
                    contract_id: id,
                    seller_id: seller.user_id,
                    execution_date: execution_date || new Date().toISOString()
                });
            }
        }
        return contract;
    }

    async uploadPdf(id, pdfUrl) {
        return await this.contractRepository.update(id, { pdf_url: pdfUrl });
    }
}

module.exports = ContractService;
