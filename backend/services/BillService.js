class BillService {
    constructor(billRepository) {
        this.billRepository = billRepository;
    }

    async getBills(filters) {
        return await this.billRepository.findAllWithFilters(filters);
    }

    async createBill(data) {
        return await this.billRepository.create(data);
    }

    async updateBill(id, updates) {
        return await this.billRepository.update(id, updates);
    }

    async getBillById(id) {
        return await this.billRepository.findById(id);
    }

    async deleteBill(id) {
        return await this.billRepository.delete(id);
    }

    async payBill(id) {
        const bill = await this.billRepository.findById(id);
        if (!bill) throw new Error('Conta não encontrada');

        const updated = await this.billRepository.update(id, { status: 'Pago', updated_at: new Date() });

        // Handle recurrence
        if (bill.recurrence && bill.recurrence !== 'Nenhuma') {
            const nextDueDate = new Date(bill.due_date);
            if (bill.recurrence === 'Semanal') nextDueDate.setDate(nextDueDate.getDate() + 7);
            else if (bill.recurrence === 'Mensal') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            else if (bill.recurrence === 'Anual') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

            await this.billRepository.create({
                description: bill.description,
                category: bill.category,
                value: bill.value,
                due_date: nextDueDate,
                recurrence: bill.recurrence,
                status: 'Pendente'
            });
        }

        return updated;
    }
}

module.exports = BillService;
