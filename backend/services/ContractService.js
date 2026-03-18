class ContractService {
    constructor(contractRepository, serviceOrderRepository, sellerRepository, paymentRepository, pool) {
        this.contractRepository = contractRepository;
        this.serviceOrderRepository = serviceOrderRepository;
        this.sellerRepository = sellerRepository;
        this.paymentRepository = paymentRepository;
        this.pool = pool;
    }

    async getAllContracts() {
        return await this.contractRepository.findAllWithDetails();
    }

    async createContract(data) {
        // Deduplicação pelo offline_hash
        if (data.offline_hash) {
            const existing = await this.contractRepository.findOne({
                where: 'offline_hash = $1',
                params: [data.offline_hash]
            });
            if (existing) {
                console.log(`[ContractService] Duplicate contract detected with hash ${data.offline_hash}. Returning existing ID ${existing.id}`);
                return { ...existing, _alreadyExists: true };
            }
        }

        // Sanitize IDs
        data.client_id = data.client_id || null;
        data.partner_id = data.partner_id || null;
        data.seller_id = data.seller_id || null;
        data.pump_quantity = data.pump_quantity || 1;

        return await this.contractRepository.create(data);
    }

    async updateContractStatus(id, status, execution_date) {
        const contract = await this.contractRepository.updateStatus(id, status);

        // If contract is activated, ensure a Service Order exists
        if (status === 'Ativo' && contract.seller_id) {
            const seller = await this.sellerRepository.findById(contract.seller_id);
            if (seller) {
                // Check if there is already a PENDING Service Order for this contract
                const existingOS = await this.serviceOrderRepository.findOne({
                    where: 'contract_id = $1 AND status = $2',
                    params: [id, 'Pendente']
                });

                if (existingOS) {
                    // Just update the existing one
                    await this.serviceOrderRepository.update(existingOS.id, {
                        seller_id: seller.user_id,
                        execution_date: execution_date || new Date().toISOString()
                    });
                } else {
                    // Create new OS
                    await this.serviceOrderRepository.create({
                        contract_id: id,
                        seller_id: seller.user_id,
                        execution_date: execution_date || new Date().toISOString()
                    });
                }
            }
        }
        return contract;
    }

    async updateContract(id, data) {
        const updates = { ...data };
        delete updates.id;
        delete updates.created_at;
        delete updates.updated_at;

        updates.client_id = updates.client_id || null;
        updates.partner_id = updates.partner_id || null;
        updates.seller_id = updates.seller_id || null;

        const result = await this.contractRepository.update(id, updates);

        // Logic check: if status changed to 'Ativo', ensure OS is created or updated
        if (updates.status === 'Ativo') {
            const contract = await this.contractRepository.findById(id);
            if (contract && contract.seller_id) {
                const seller = await this.sellerRepository.findById(contract.seller_id);
                if (seller) {
                    const existingOS = await this.serviceOrderRepository.findOne({
                        where: 'contract_id = $1 AND status = $2',
                        params: [id, 'Pendente']
                    });

                    if (existingOS) {
                        await this.serviceOrderRepository.update(existingOS.id, {
                            seller_id: seller.user_id,
                            execution_date: updates.execution_date || new Date().toISOString()
                        });
                    } else {
                        await this.serviceOrderRepository.create({
                            contract_id: id,
                            seller_id: seller.user_id,
                            execution_date: updates.execution_date || new Date().toISOString()
                        });
                    }
                }
            }
        }

        return result;
    }

    async deleteContract(id) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Delete related payments
            await client.query('DELETE FROM payments WHERE contract_id = $1', [id]);

            // Delete related service orders
            await client.query('DELETE FROM service_orders WHERE contract_id = $1', [id]);

            // Delete contract
            await client.query('DELETE FROM contracts WHERE id = $1', [id]);

            await client.query('COMMIT');
            return { success: true };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async uploadPdf(id, pdfUrl) {
        return await this.contractRepository.update(id, { pdf_url: pdfUrl });
    }
}

module.exports = ContractService;
