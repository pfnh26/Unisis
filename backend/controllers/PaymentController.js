class PaymentController {
    constructor(paymentService, logActivity) {
        this.paymentService = paymentService;
        this.logActivity = logActivity;
    }

    async getPaymentsByContract(req, res) {
        try {
            const payments = await this.paymentService.getPaymentsByContract(req.params.id);
            res.json(payments);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createPayment(req, res) {
        const { contract_id, sale_id, amount, description, payment_date, due_date_ref } = req.body;
        try {
            const payment = await this.paymentService.createPayment({ contract_id, sale_id, amount, description, payment_date, due_date_ref });

            // Buscar detalhes para o log
            let logDetails = `Valor: R$ ${parseFloat(amount).toFixed(2)}`;

            if (contract_id) {
                const contracts = await this.paymentService.getContracts();
                const contract = contracts.find(c => c.id == contract_id);
                if (contract) {
                    logDetails += ` | Cliente: ${contract.client_name || 'Desconhecido'} | Tipo: ${contract.type}`;
                }
            } else if (sale_id) {
                const sales = await this.paymentService.getSales();
                const sale = sales.find(s => s.id == sale_id);
                if (sale) {
                    logDetails += ` | Cliente: ${sale.client_name || 'Desconhecido'} | Produto/Serviço: ${sale.product_description || 'N/A'}`;
                }
            }

            logDetails += ` | ${description || 'Sem descrição'}`;

            this.logActivity(req.user.id || req.user.userId, 'Registrar Pagamento', logDetails);
            res.status(201).json(payment);
        } catch (err) {
            console.error('Error creating payment:', err);
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = PaymentController;
