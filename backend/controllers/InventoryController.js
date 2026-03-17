class InventoryController {
    constructor(inventoryService, logActivity) {
        this.inventoryService = inventoryService;
        this.logActivity = logActivity;
    }

    async getLogs(req, res) {
        try {
            const logs = await this.inventoryService.getLogs();
            res.json(logs);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async logMovement(req, res) {
        try {
            const { product_id, type, quantity, reason } = req.body;
            const result = await this.inventoryService.logMovement(req.body);

            // Buscar nome do produto para o log
            const products = await this.inventoryService.getProducts();
            const product = products.find(p => p.id == product_id);
            const productName = product ? product.description : `ID: ${product_id}`;

            this.logActivity(
                req.user.id || req.user.userId,
                'Movimentação de Estoque',
                `Produto: ${productName} | Tipo: ${type} | Quantidade: ${quantity} | Motivo: ${reason || 'Não informado'}`
            );

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async processDanfe(req, res, repositories) {
        try {
            const { accessKey, partnerId } = req.body;
            if (!accessKey || !partnerId) {
                return res.status(400).json({ error: 'Chave de acesso e parceiro são obrigatórios' });
            }

            const result = await this.inventoryService.processDanfe(accessKey, partnerId, repositories);

            // Buscar nome do parceiro para o log
            let partnerName = `ID: ${partnerId}`;
            try {
                const partner = await repositories.partner.findById(partnerId);
                if (partner) partnerName = partner.name;
            } catch (pErr) {
                console.error("Erro ao buscar parceiro para log:", pErr);
            }

            this.logActivity(
                req.user.id || req.user.userId,
                'Importação DANFE',
                `Chave: ${accessKey} | Parceiro: ${partnerName}`
            );

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = InventoryController;
