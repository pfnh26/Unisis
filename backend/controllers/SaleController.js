class SaleController {
    constructor(saleService, logActivity) {
        this.saleService = saleService;
        this.logActivity = logActivity;
    }

    async getSales(req, res) {
        try {
            const sales = await this.saleService.getAllSales();
            res.json(sales);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createSale(req, res) {
        try {
            const sale = await this.saleService.createSale(req.body);

            // Buscar detalhes para o log
            const sales = await this.saleService.getAllSales();
            const createdSale = sales.find(s => s.id === sale.id);
            const clientName = createdSale?.client_name || 'Cliente não informado';
            const productName = createdSale?.product_description || req.body.product_description || 'Serviço';

            this.logActivity(req.user.id || req.user.userId, 'Criar Venda Avulsa', `Produto/Serviço: ${productName} | Cliente: ${clientName} | Valor: R$ ${parseFloat(req.body.price).toFixed(2)}`);
            res.status(201).json(sale);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateSaleStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        try {
            await this.saleService.updateSaleStatus(id, status);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateSale(req, res) {
        const { id } = req.params;
        try {
            const sale = await this.saleService.updateSale(id, req.body);
            this.logActivity(req.user.id || req.user.userId, 'Editar Venda Avulsa', `ID: ${id} | Cliente ID: ${req.body.client_id}`);
            res.json(sale);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async deleteSale(req, res) {
        const { id } = req.params;
        try {
            await this.saleService.deleteSale(id);
            this.logActivity(req.user.id || req.user.userId, 'Excluir Venda Avulsa', `ID: ${id}`);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = SaleController;
