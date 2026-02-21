const { addMonths, isSameMonth, isSameYear, isBefore, format } = require('date-fns');

class CommissionService {
    constructor(pool, sellerRepository, contractRepository, saleRepository, paymentRepository) {
        this.pool = pool;
        this.sellerRepository = sellerRepository;
        this.contractRepository = contractRepository;
        this.saleRepository = saleRepository;
        this.paymentRepository = paymentRepository;
    }

    async getCommissions(decodedUser, queryParams) {
        let { seller_id, month, year } = queryParams;
        let sellerId = (seller_id === '' || seller_id === 'all') ? null : seller_id;

        const currentUserId = decodedUser.userId || decodedUser.id;
        if (decodedUser.role === 'Vendedor') {
            const seller = await this.sellerRepository.findByUserId(currentUserId);
            if (seller) sellerId = seller.id;
        }

        const reportDate = `${year}-${String(month).padStart(2, '0')}-01`;

        // 1. Regular Contract Commissions
        const contractsRes = await this.pool.query(`
            SELECT c.*, s.profit_percentage, cl.name as client_name
            FROM contracts c
            JOIN sellers s ON c.seller_id = s.id
            JOIN clients cl ON c.client_id = cl.id
            WHERE c.status = 'Ativo' AND (s.id = $1 OR $1 IS NULL)
        `, [sellerId]);

        let contractCommissions = [];
        for (let contract of contractsRes.rows) {
            const profitPerMonth = parseFloat(contract.total_value) - parseFloat(contract.cost_value);

            // Get all payments for this contract sorted by date
            const allPaymentsRes = await this.pool.query(`
                SELECT * FROM payments 
                WHERE contract_id = $1 
                ORDER BY payment_date ASC, id ASC
            `, [contract.id]);

            let runningProfitStore = 0;
            const pumpValue = parseFloat(contract.pump_value || 0);

            for (let payment of allPaymentsRes.rows) {
                const payMonth = new Date(payment.payment_date).getMonth() + 1;
                const payYear = new Date(payment.payment_date).getFullYear();

                let commission = 0;
                let status = "Amortizando Bomba";

                if (!contract.has_pump || contract.no_amortization || runningProfitStore >= pumpValue) {
                    commission = profitPerMonth * (parseFloat(contract.profit_percentage) / 100);
                    status = "Comissionado";
                }

                // If this payment happened in the month we are reporting
                if (payMonth === parseInt(month) && payYear === parseInt(year)) {
                    contractCommissions.push({
                        type: 'Contrato',
                        date: payment.payment_date,
                        client: contract.client_name,
                        value: contract.total_value,
                        profit: profitPerMonth,
                        commission: commission,
                        status: status
                    });
                }

                // Update running profit for the NEXT payment
                runningProfitStore += profitPerMonth;
            }
        }

        // 2. Extra Sales Commissions
        const salesRes = await this.pool.query(`
            SELECT s.*, sl.profit_percentage, cl.name as client_name
            FROM extra_sales s
            JOIN sellers sl ON s.seller_id = sl.id
            JOIN clients cl ON s.client_id = cl.id
            WHERE (sl.id = $1 OR $1 IS NULL)
            AND EXTRACT(MONTH FROM s.execution_date) = $2 
            AND EXTRACT(YEAR FROM s.execution_date) = $3
            AND s.status = 'Pago'
        `, [sellerId, month, year]);

        const salesCommissions = salesRes.rows.map(s => ({
            type: 'Venda Avulsa',
            date: s.execution_date,
            client: s.client_name,
            value: s.price,
            profit: parseFloat(s.price) - parseFloat(s.cost),
            commission: (parseFloat(s.price) - parseFloat(s.cost)) * (parseFloat(s.profit_percentage) / 100),
            status: 'Comissionado'
        }));

        // 3. Extra Commissions / Valer
        const extraRes = await this.pool.query(`
            SELECT * FROM extra_commissions
            WHERE (seller_id = $1 OR $1 IS NULL)
            AND EXTRACT(MONTH FROM date) = $2
            AND EXTRACT(YEAR FROM date) = $3
        `, [sellerId, month, year]);

        const extraComs = extraRes.rows.map(e => ({
            type: e.type,
            date: e.date,
            client: '-',
            value: e.value,
            profit: 0,
            commission: e.type === 'Vale' ? -Math.abs(parseFloat(e.value)) : Math.abs(parseFloat(e.value)),
            status: 'Lançamento Manual',
            description: e.description
        }));

        return [...contractCommissions, ...salesCommissions, ...extraComs];
    }

    async createExtraCommission(data) {
        const { seller_id, description, type, value, date } = data;
        const result = await this.pool.query(
            'INSERT INTO extra_commissions (seller_id, description, type, value, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [seller_id, description, type, value, date || new Date()]
        );
        return result.rows[0];
    }
}

module.exports = CommissionService;
