const { addMonths, isBefore, isSameMonth, isSameYear, addWeeks, format, parseISO, isSameDay } = require('date-fns');
const nodemailer = require('nodemailer');

class NotificationService {
    constructor(pool) {
        this.pool = pool;
    }

    async getNotificationSummary(user) {
        if (!user) return { overdue: [], expiring: [], billsToday: [], billsOverdue: [], servicesOverdue: [], servicesToday: [] };

        const isAdminOrOperador = user.role === 'Administrador' || user.role === 'Operador';
        const isVendedor = user.role === 'Vendedor';
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        let overdue = []; // Client payments
        let expiring = [];
        let billsToday = [];
        let billsOverdue = [];
        let servicesOverdue = [];
        let servicesToday = [];

        if (isAdminOrOperador) {
            // 1. Mensalidades de clientes Atrasadas (existing logic)
            const contractsRes = await this.pool.query("SELECT c.*, cl.name as client_name, cl.email as client_email FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE c.status = 'Ativo'");
            const paymentsRes = await this.pool.query("SELECT * FROM payments");

            for (const contract of contractsRes.rows) {
                const contractStart = new Date(contract.start_date);

                // Garantir que a primeira parcela seja no ou após o início do contrato
                let firstDueDate = new Date(contractStart);
                firstDueDate.setDate(contract.payment_day);
                if (isBefore(firstDueDate, contractStart)) {
                    firstDueDate = addMonths(firstDueDate, 1);
                }

                for (let i = 0; i < contract.duration_months; i++) {
                    const dueDate = addMonths(firstDueDate, i);

                    /* Parcela i + 1 */
                    if (isBefore(dueDate, today) && !isSameDay(dueDate, today)) {
                        const isPaid = paymentsRes.rows.some(p => {
                            if (p.contract_id !== contract.id) return false;
                            if (p.due_date_ref) {
                                return isSameMonth(new Date(p.due_date_ref), dueDate) && isSameYear(new Date(p.due_date_ref), dueDate);
                            }
                            if (p.description === `Parcela ${i + 1}`) return true;
                            // Fallback para pagamentos antigos sem ref ou descrição específica
                            return isSameMonth(new Date(p.payment_date), dueDate) && isSameYear(new Date(p.payment_date), dueDate);
                        });

                        if (!isPaid) {
                            overdue.push({
                                id: contract.id,
                                client_name: contract.client_name,
                                dueDate,
                                type: 'Mensalidade Atrasada'
                            });
                        }
                    }
                }
            }

            // 2. Contas que vão vencer hoje e Atrasadas
            const billsRes = await this.pool.query("SELECT description, due_date FROM bills_payable WHERE status = 'Pendente'");
            for (const bill of billsRes.rows) {
                const dueDate = new Date(bill.due_date);
                if (isSameDay(dueDate, today)) {
                    billsToday.push({ description: bill.description, type: 'Conta Vence Hoje' });
                } else if (isBefore(dueDate, today)) {
                    billsOverdue.push({ description: bill.description, type: 'Conta Atrasada' });
                }
            }

            // 3. Serviços atrasados (Admin/Operador: all)
            const servicesRes = await this.pool.query(`
                SELECT so.*, u.name as seller_name, cl.name as client_name, p.name as partner_name
                FROM service_orders so 
                LEFT JOIN users u ON so.seller_id = u.id 
                LEFT JOIN contracts c ON so.contract_id = c.id 
                LEFT JOIN extra_sales es ON so.sale_id = es.id 
                LEFT JOIN clients cl ON (c.client_id = cl.id OR es.client_id = cl.id) 
                LEFT JOIN partners p ON (c.partner_id = p.id OR es.partner_id = p.id)
                WHERE so.status = 'Pendente' AND so.execution_date < $1
            `, [todayStr]);

            servicesOverdue = servicesRes.rows.map(s => ({
                id: s.id,
                seller_name: s.seller_name,
                company_name: s.client_name || s.partner_name || 'N/A',
                type: 'Serviço Atrasado'
            }));

            // 4. Contratos expirando (1 mês de antecedência)
            const oneMonthAhead = addMonths(today, 1);
            expiring = contractsRes.rows.filter(c => {
                const end = addMonths(new Date(c.start_date), c.duration_months);
                return isBefore(end, oneMonthAhead) && !isBefore(end, today);
            }).map(c => ({
                id: c.id,
                client_name: c.client_name,
                contract_type: c.type,
                type: 'Contrato Expirando'
            }));
        }

        if (isVendedor) {
            // 5. Serviços do Vendedor (Atrasados e de Hoje)
            const vServicesRes = await this.pool.query(`
                SELECT so.*, cl.name as client_name, p.name as partner_name
                FROM service_orders so 
                LEFT JOIN contracts c ON so.contract_id = c.id 
                LEFT JOIN extra_sales es ON so.sale_id = es.id 
                LEFT JOIN clients cl ON (c.client_id = cl.id OR es.client_id = cl.id) 
                LEFT JOIN partners p ON (c.partner_id = p.id OR es.partner_id = p.id)
                WHERE so.status = 'Pendente' AND so.seller_id = $1
            `, [user.id]);

            for (const s of vServicesRes.rows) {
                const execDate = new Date(s.execution_date);
                if (isSameDay(execDate, today)) {
                    servicesToday.push({
                        id: s.id,
                        company_name: s.client_name || s.partner_name || 'N/A',
                        type: 'Serviço Hoje'
                    });
                } else if (isBefore(execDate, today)) {
                    servicesOverdue.push({
                        id: s.id,
                        company_name: s.client_name || s.partner_name || 'N/A',
                        type: 'Serviço Atrasado'
                    });
                }
            }
        }

        return { overdue, expiring, billsToday, billsOverdue, servicesOverdue, servicesToday };
    }

    async sendEmail(to, subject, html) {
        const settings = await this.pool.query("SELECT * FROM system_settings WHERE id = 1");
        const { smtp_email, smtp_password } = settings.rows[0];

        if (!smtp_email || !smtp_password) return;

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtp_email, pass: smtp_password }
        });

        await transporter.sendMail({ from: smtp_email, to, subject, html });
    }
}

module.exports = NotificationService;
