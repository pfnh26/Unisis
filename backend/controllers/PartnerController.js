class PartnerController {
    constructor(partnerService, logActivity) {
        this.partnerService = partnerService;
        this.logActivity = logActivity;
    }

    async getPartners(req, res) {
        try {
            const partners = await this.partnerService.getAllPartners();
            res.json(partners);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createPartner(req, res) {
        try {
            const data = req.body;
            if (req.file) {
                data.certificate_url = `/uploads/${req.file.filename}`;
            }
            const partner = await this.partnerService.createPartner(data);
            this.logActivity(req.user.id || req.user.userId, 'Criar Parceiro', `Nome: ${req.body.name} | CNPJ: ${req.body.cnpj || 'N/A'}`);
            res.status(201).json(partner);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async updatePartner(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            if (req.file) {
                updates.certificate_url = `/uploads/${req.file.filename}`;
            }

            // Buscar dados anteriores
            const oldPartners = await this.partnerService.getAllPartners();
            const partnerBefore = oldPartners.find(p => p.id == id);

            if (!partnerBefore) {
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            }

            const partner = await this.partnerService.updatePartner(id, updates);

            // Criar detalhes das alterações
            let changes = [];

            // Campos diretos da tabela
            if (updates.name && updates.name !== partnerBefore.name) changes.push(`Nome: "${partnerBefore.name}" → "${updates.name}"`);
            if (updates.cnpj && updates.cnpj !== partnerBefore.cnpj) changes.push(`CNPJ: "${partnerBefore.cnpj}" → "${updates.cnpj}"`);
            if (updates.address && updates.address !== partnerBefore.address) changes.push(`Endereço: "${partnerBefore.address}" → "${updates.address}"`);
            if (updates.type && updates.type !== partnerBefore.type) changes.push(`Tipo: "${partnerBefore.type}" → "${updates.type}"`);
            if (updates.cep && updates.cep !== partnerBefore.cep) changes.push(`CEP: "${partnerBefore.cep}" → "${updates.cep}"`);

            // Campos no JSONB data
            if (updates.data) {
                const oldData = partnerBefore.data || {};
                const newData = updates.data;

                if (newData.telefone && newData.telefone !== oldData.telefone) {
                    changes.push(`Telefone: "${oldData.telefone || 'N/A'}" → "${newData.telefone}"`);
                }
                if (newData.email && newData.email !== oldData.email) {
                    changes.push(`Email: "${oldData.email || 'N/A'}" → "${newData.email}"`);
                }
                if (newData.fantasia && newData.fantasia !== oldData.fantasia) {
                    changes.push(`Nome Fantasia: "${oldData.fantasia || 'N/A'}" → "${newData.fantasia}"`);
                }
                if (newData.situacao && newData.situacao !== oldData.situacao) {
                    changes.push(`Situação: "${oldData.situacao || 'N/A'}" → "${newData.situacao}"`);
                }
            }

            const details = changes.length > 0
                ? `Parceiro: ${partnerBefore.name} | Alterações: ${changes.join(', ')}`
                : `Parceiro: ${partnerBefore.name} | Sem alterações significativas`;

            this.logActivity(req.user.id || req.user.userId, 'Atualizar Parceiro', details);
            res.json(partner);
        } catch (err) {
            console.error('Error in updatePartner:', err);
            res.status(400).json({ error: err.message });
        }
    }

    async deletePartner(req, res) {
        try {
            const oldPartners = await this.partnerService.getAllPartners();
            const partnerData = oldPartners.find(p => p.id == req.params.id);
            await this.partnerService.deletePartner(req.params.id);
            this.logActivity(req.user.id || req.user.userId, 'Excluir Parceiro', `Parceiro: ${partnerData?.name || 'Desconhecido'} | ID: ${req.params.id}`);
            res.sendStatus(204);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = PartnerController;
