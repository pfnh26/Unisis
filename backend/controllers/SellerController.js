class SellerController {
    constructor(sellerService, logActivity) {
        this.sellerService = sellerService;
        this.logActivity = logActivity;
    }

    async getSellers(req, res) {
        const { search } = req.query;
        try {
            const sellers = await this.sellerService.getAllSellers(search);
            res.json(sellers);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createSeller(req, res) {
        const { name, username, password, profit_percentage } = req.body;
        try {
            const seller = await this.sellerService.createSeller(name, username, password, profit_percentage);
            this.logActivity(req.user.id || req.user.userId, 'Criar Vendedor', `Nome: ${name} | Usuário: ${username} | Comissão: ${profit_percentage}%`);
            res.status(201).json(seller);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async updateSeller(req, res) {
        const { id } = req.params;
        const updates = req.body;
        try {
            const oldSellers = await this.sellerService.getAllSellers();
            const sellerBefore = oldSellers.find(s => s.id == id);
            const seller = await this.sellerService.updateSeller(id, updates);

            let changes = [];
            if (updates.name && updates.name !== sellerBefore.name) changes.push(`Nome: "${sellerBefore.name}" → "${updates.name}"`);
            if (updates.profit_percentage && parseFloat(updates.profit_percentage) !== parseFloat(sellerBefore.profit_percentage)) changes.push(`Comissão: ${sellerBefore.profit_percentage}% → ${updates.profit_percentage}%`);

            const details = changes.length > 0
                ? `Vendedor: ${sellerBefore.name} | Alterações: ${changes.join(', ')}`
                : `Vendedor: ${sellerBefore.name} | Sem alterações significativas`;

            this.logActivity(req.user.id || req.user.userId, 'Atualizar Vendedor', details);
            res.json(seller);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteSeller(req, res) {
        const { id } = req.params;
        try {
            const oldSellers = await this.sellerService.getAllSellers();
            const sellerData = oldSellers.find(s => s.id == id);
            await this.sellerService.deleteSeller(id);
            this.logActivity(req.user.id || req.user.userId, 'Excluir Vendedor', `Vendedor: ${sellerData?.name || 'Desconhecido'} | ID: ${id}`);
            res.sendStatus(204);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = SellerController;
