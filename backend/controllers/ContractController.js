class ContractController {
    constructor(contractService, logActivity) {
        this.contractService = contractService;
        this.logActivity = logActivity;
    }

    async getContracts(req, res) {
        try {
            const contracts = await this.contractService.getAllContracts();
            res.json(contracts);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createContract(req, res) {
        try {
            const contract = await this.contractService.createContract(req.body);

            // Buscar nome do cliente
            const contracts = await this.contractService.getAllContracts();
            const createdContract = contracts.find(c => c.id === contract.id);
            const clientName = createdContract?.client_name || `ID: ${req.body.client_id}`;

            this.logActivity(req.user.id || req.user.userId, 'Criar Contrato', `Cliente: ${clientName} | Tipo: ${req.body.type} | Valor: R$ ${parseFloat(req.body.total_value).toFixed(2)}`);
            res.status(201).json(contract);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async updateContractStatus(req, res) {
        const { id } = req.params;
        const { status, execution_date } = req.body;
        try {
            // Buscar dados do contrato antes de atualizar
            const contracts = await this.contractService.getAllContracts();
            const contractData = contracts.find(c => c.id == id);
            const clientName = contractData?.client_name || `ID: ${contractData?.client_id || 'Desconhecido'}`;

            const contract = await this.contractService.updateContractStatus(id, status, execution_date);
            this.logActivity(req.user.id || req.user.userId, 'Atualizar Status do Contrato', `Cliente: ${clientName} | Novo Status: ${status}${execution_date ? ` | Data de Execução: ${execution_date}` : ''}`);
            res.json(contract);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async uploadPdf(req, res) {
        try {
            const pdfUrl = `/uploads/${req.file.filename}`;

            // Buscar dados do contrato
            const contracts = await this.contractService.getAllContracts();
            const contractData = contracts.find(c => c.id == req.params.id);
            const clientName = contractData?.client_name || `ID: ${contractData?.client_id || 'Desconhecido'}`;

            await this.contractService.uploadPdf(req.params.id, pdfUrl);

            this.logActivity(req.user.id || req.user.userId, 'Upload de Contrato (PDF)', `Cliente: ${clientName} | Arquivo: ${req.file.originalname}`);

            res.json({ pdf_url: pdfUrl });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ContractController;
