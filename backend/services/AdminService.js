const { format, addMonths } = require('date-fns');
const bcrypt = require('bcryptjs');

class AdminService {
    constructor(pool, notificationService, commissionService) {
        this.pool = pool;
        this.notificationService = notificationService;
        this.commissionService = commissionService;
    }

    async getDashboardStats(month, year) {
        const stats = {};

        // Active Clients
        const clientsRes = await this.pool.query("SELECT COUNT(*) FROM clients");
        stats.activeClients = parseInt(clientsRes.rows[0].count);

        // OS Finished this week
        const osRes = await this.pool.query("SELECT COUNT(*) FROM service_orders WHERE status = 'Feito' AND execution_date >= CURRENT_DATE - INTERVAL '7 days'");
        stats.osFinishedWeek = parseInt(osRes.rows[0].count);

        // OS Delayed (Pending with date < today and >= today - 7 days)
        const delayedRes = await this.pool.query("SELECT COUNT(*) FROM service_orders WHERE status = 'Pendente' AND execution_date < CURRENT_DATE AND execution_date >= CURRENT_DATE - INTERVAL '7 days'");
        stats.osDelayedWeek = parseInt(delayedRes.rows[0].count);

        // Revenue (billed total in period)
        const revenueRes = await this.pool.query(`
            SELECT SUM(amount) as total FROM payments 
            WHERE EXTRACT(MONTH FROM payment_date) = $1 AND EXTRACT(YEAR FROM payment_date) = $2
        `, [month, year]);
        stats.totalRevenue = parseFloat(revenueRes.rows[0].total || 0);

        // Expenses (Bills paid in the period)
        const expensesRes = await this.pool.query(`
            SELECT SUM(value) as total FROM bills_payable 
            WHERE status = 'Pago' 
            AND EXTRACT(MONTH FROM due_date) = $1 AND EXTRACT(YEAR FROM due_date) = $2
        `, [month, year]);
        stats.totalExpenses = parseFloat(expensesRes.rows[0].total || 0);

        // Commissions Total - Using the CommissionService to get accurate data
        const allCommissions = await this.commissionService.getCommissions({ role: 'Administrador' }, { month, year, seller_id: 'all' });
        const totalCommissions = allCommissions.reduce((acc, curr) => acc + parseFloat(curr.commission), 0);

        stats.totalCommissions = totalCommissions;
        return stats;
    }

    async getSellersStats() {
        const result = await this.pool.query(`
            SELECT s.id, s.name, s.user_id,
            (SELECT COUNT(*) FROM service_orders so WHERE so.seller_id = s.user_id AND so.status = 'Feito' AND so.execution_date >= CURRENT_DATE - INTERVAL '7 days') as finished_week,
            (SELECT COUNT(*) FROM service_orders so WHERE so.seller_id = s.user_id AND so.status = 'Pendente') as open_orders,
            (SELECT COUNT(*) FROM service_orders so WHERE so.seller_id = s.user_id AND so.status = 'Pendente' AND so.execution_date < CURRENT_DATE) as delayed_orders
            FROM sellers s
        `);
        return result.rows;
    }

    async getUsers() {
        // Fetch users along with profit_percentage if they are sellers
        const res = await this.pool.query(`
            SELECT u.id, u.name, u.username, u.role, u.permissions, s.profit_percentage 
            FROM users u 
            LEFT JOIN sellers s ON u.id = s.user_id 
            ORDER BY u.name ASC
        `);
        return res.rows;
    }

    async createUser(userData) {
        const { name, username, password, role, profit_percentage } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        // Default permissions for new users
        const defaultPerms = [];

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const userRes = await client.query(
                'INSERT INTO users (name, username, password, role, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, role, permissions',
                [name, username, hashedPassword, role, JSON.stringify(defaultPerms)]
            );
            const user = userRes.rows[0];

            if (role === 'Vendedor') {
                await client.query(
                    'INSERT INTO sellers (user_id, name, profit_percentage) VALUES ($1, $2, $3)',
                    [user.id, name, profit_percentage || 0]
                );
            }

            await client.query('COMMIT');
            return user;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async updateUser(userId, userData) {
        const { name, username, password, role, profit_percentage } = userData;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            let query = 'UPDATE users SET name = $1, username = $2, role = $3';
            let params = [name, username, role];

            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                query += ', password = $4 WHERE id = $5';
                params.push(hashedPassword, userId);
            } else {
                query += ' WHERE id = $4';
                params.push(userId);
            }

            await client.query(query, params);

            // Update seller info
            if (role === 'Vendedor') {
                const sellerCheck = await client.query('SELECT id FROM sellers WHERE user_id = $1', [userId]);
                if (sellerCheck.rows.length > 0) {
                    await client.query(
                        'UPDATE sellers SET name = $1, profit_percentage = $2 WHERE user_id = $3',
                        [name, profit_percentage || 0, userId]
                    );
                } else {
                    await client.query(
                        'INSERT INTO sellers (user_id, name, profit_percentage) VALUES ($1, $2, $3)',
                        [userId, name, profit_percentage || 0]
                    );
                }
            } else {
                // If role changed from Vendedor to something else, remove from sellers?
                // The prompt doesn't explicitly say, but usually yes to keep DB clean.
                await client.query('DELETE FROM sellers WHERE user_id = $1', [userId]);
            }

            await client.query('COMMIT');
            return { id: userId, name, username, role };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteUser(userId) {
        // CASCADE is expected on sellers table
        await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    async updateUserPermissions(userId, permissions) {
        await this.pool.query("UPDATE users SET permissions = $1 WHERE id = $2", [JSON.stringify(permissions), userId]);
    }

    async getSettings() {
        const res = await this.pool.query("SELECT * FROM system_settings WHERE id = 1");
        return res.rows[0] || {};
    }

    async updateSettings(settings) {
        const { smtp_email, smtp_password, report_email, auto_billing_enabled, auto_expiry_enabled } = settings;
        await this.pool.query(`
            UPDATE system_settings 
            SET smtp_email = $1, smtp_password = $2, report_email = $3, 
                auto_billing_enabled = $4, auto_expiry_enabled = $5
            WHERE id = 1
        `, [smtp_email, smtp_password, report_email, auto_billing_enabled, auto_expiry_enabled]);
    }

    async triggerBilling() {
        const { overdue } = await this.notificationService.getNotificationSummary();
        let sentCount = 0;
        for (const client of overdue) {
            if (client.client_email) {
                await this.notificationService.sendEmail(client.client_email, "Aviso de Cobrança - UniSis", `
                    <h2>Olá, ${client.client_name}</h2>
                    <p>Consta em nosso sistema uma fatura pendente com vencimento em ${format(new Date(client.dueDate), 'dd/MM/yyyy')}.</p>
                    <p>Valor: R$ ${parseFloat(client.amount).toFixed(2)}</p>
                    <p>Por favor, realize o pagamento para evitar suspensão dos serviços.</p>
                `);
                sentCount++;
            }
        }
        return { count: sentCount };
    }

    async triggerExpiryReport(targetEmail) {
        const { expiring } = await this.notificationService.getNotificationSummary();
        if (expiring.length > 0) {
            let html = "<h2>Relatório de Contratos Expirando esta Semana</h2><ul>";
            expiring.forEach(e => {
                html += `<li>${e.client_name} - Término: ${format(new Date(e.endDate), 'dd/MM/yyyy')}</li>`;
            });
            html += "</ul>";
            await this.notificationService.sendEmail(targetEmail, "Contratos Expirando - UniSis", html);
        }
    }
}

module.exports = AdminService;
