class BillController {
    constructor(billService, logActivity) {
        this.billService = billService;
        this.logActivity = logActivity;
    }

    async getBills(req, res) {
        try {
            const bills = await this.billService.getBills(req.query);
            res.json(bills);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createBill(req, res) {
        try {
            const bill = await this.billService.createBill(req.body);
            const dueDateFormatted = new Date(bill.due_date).toLocaleDateString('pt-BR');
            await this.logActivity(req.user.id || req.user.userId, 'Criar Conta a Pagar', `Conta: ${bill.description} | Valor: R$ ${bill.value} | Vencimento: ${dueDateFormatted}`);
            res.status(201).json(bill);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async updateBill(req, res) {
        try {
            const { id } = req.params;
            const bill = await this.billService.updateBill(id, req.body);
            await this.logActivity(req.user.id || req.user.userId, 'Atualizar Conta a Pagar', `Conta: ${bill.description} | Valor: R$ ${bill.value}`);
            res.json(bill);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteBill(req, res) {
        try {
            const { id } = req.params;
            // Busca os dados ANTES de excluir para logar com detalhes
            const bill = await this.billService.getBillById(id);
            await this.billService.deleteBill(id);
            if (bill) {
                const dueDateFormatted = new Date(bill.due_date).toLocaleDateString('pt-BR');
                const valueFormatted = parseFloat(bill.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                await this.logActivity(req.user.id || req.user.userId, 'Excluir Conta a Pagar', `Conta: ${bill.description} | Valor: R$ ${valueFormatted} | Vencimento: ${dueDateFormatted}`);
            } else {
                await this.logActivity(req.user.id || req.user.userId, 'Excluir Conta a Pagar', `Conta ID: ${id}`);
            }
            res.sendStatus(204);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async payBill(req, res) {
        try {
            const { id } = req.params;
            const bill = await this.billService.payBill(id);
            const dueDateFormatted = new Date(bill.due_date).toLocaleDateString('pt-BR');
            await this.logActivity(req.user.id || req.user.userId, 'Confirmar Pagamento Conta', `Conta: ${bill.description} | Vencimento: ${dueDateFormatted} | Status: Pago`);
            res.json(bill);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = BillController;
