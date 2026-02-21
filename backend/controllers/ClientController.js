class ClientController {
    constructor(clientService, logActivity) {
        this.clientService = clientService;
        this.logActivity = logActivity;
    }

    async getClients(req, res) {
        const { search } = req.query;
        try {
            const clients = await this.clientService.getAllClients(search);
            res.json(clients);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createClient(req, res) {
        const { cnpj, cpf, name, phone, address, email, is_manual, data } = req.body;
        try {
            const client = await this.clientService.createClient({ cnpj, cpf, name, phone, address, email, is_manual, data });
            this.logActivity(req.user.id || req.user.userId, 'Criar Cliente', `Cliente: ${name} | CNPJ/CPF: ${cnpj || cpf || 'N/A'} | Telefone: ${phone || 'N/A'}`);
            res.status(201).json(client);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async updateClient(req, res) {
        const { id } = req.params;
        const updates = req.body;
        try {
            const oldClient = await this.clientService.getAllClients();
            const clientBefore = oldClient.find(c => c.id == id);
            const client = await this.clientService.updateClient(id, updates);

            // Criar detalhes das alterações
            let changes = [];

            // Campos diretos da tabela
            if (updates.name && updates.name !== clientBefore.name) changes.push(`Nome: "${clientBefore.name}" → "${updates.name}"`);
            if (updates.phone && updates.phone !== clientBefore.phone) changes.push(`Telefone: "${clientBefore.phone || 'N/A'}" → "${updates.phone}"`);
            if (updates.email && updates.email !== clientBefore.email) changes.push(`Email: "${clientBefore.email || 'N/A'}" → "${updates.email}"`);
            if (updates.address && updates.address !== clientBefore.address) changes.push(`Endereço: "${clientBefore.address || 'N/A'}" → "${updates.address}"`);
            if (updates.cnpj && updates.cnpj !== clientBefore.cnpj) changes.push(`CNPJ: "${clientBefore.cnpj}" → "${updates.cnpj}"`);
            if (updates.cpf && updates.cpf !== clientBefore.cpf) changes.push(`CPF: "${clientBefore.cpf}" → "${updates.cpf}"`);

            // Campos no JSONB data
            if (updates.data) {
                const oldData = clientBefore.data || {};
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
                ? `Cliente: ${clientBefore.name} | Alterações: ${changes.join(', ')}`
                : `Cliente: ${clientBefore.name} | Sem alterações significativas`;

            this.logActivity(req.user.id || req.user.userId, 'Atualizar Cliente', details);
            res.json(client);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteClient(req, res) {
        const { id } = req.params;
        try {
            const clientToDelete = await this.clientService.getAllClients();
            const clientData = clientToDelete.find(c => c.id == id);
            await this.clientService.deleteClient(id);
            this.logActivity(req.user.id || req.user.userId, 'Excluir Cliente', `Cliente: ${clientData?.name || 'Desconhecido'} | ID: ${id}`);
            res.sendStatus(204);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ClientController;
