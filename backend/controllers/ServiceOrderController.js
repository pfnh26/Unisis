class ServiceOrderController {
    constructor(serviceOrderService, logActivity) {
        this.serviceOrderService = serviceOrderService;
        this.logActivity = logActivity;
    }

    async getServiceOrders(req, res) {
        try {
            let sellerUserId = req.query.seller_userId;
            const isAdmin = req.user.role === 'Administrador';

            if (!isAdmin && !sellerUserId) {
                sellerUserId = req.user.id || req.user.userId;
            }

            const orders = await this.serviceOrderService.getServiceOrders(sellerUserId);
            res.json(orders);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        try {
            // Buscar detalhes da OS antes de atualizar
            const orders = await this.serviceOrderService.getServiceOrders();
            const osData = orders.find(o => o.id == id);

            await this.serviceOrderService.updateStatus(id, status);

            // Criar log detalhado
            let logDetails = '';
            if (osData) {
                const clientName = osData.client_name || 'Cliente não informado';
                const productService = osData.product_description || osData.contract_type || 'Serviço';
                const type = osData.contract_id ? `Contrato (${osData.contract_type || 'N/A'})` : 'Venda Avulsa';

                logDetails = `Cliente: ${clientName} | Tipo: ${type} | Produto/Serviço: ${productService} | Novo Status: ${status}`;
            } else {
                logDetails = `OS ID: ${id} | Novo Status: ${status}`;
            }

            this.logActivity(req.user.id || req.user.userId, 'Atualizar Ordem de Serviço', logDetails);
            res.json({ success: true });
        } catch (err) {
            console.error('Error updating service order:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ServiceOrderController;
