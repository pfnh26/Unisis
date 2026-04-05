const express = require('express');
const { pool, initDb } = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
const { format } = require('date-fns');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'unisis_secret';
const upload = multer({ dest: 'uploads/' });

// --- REPOSITORIES ---
const UserRepository = require('./repositories/UserRepository');
const ClientRepository = require('./repositories/ClientRepository');
const ProductRepository = require('./repositories/ProductRepository');
const SellerRepository = require('./repositories/SellerRepository');
const PartnerRepository = require('./repositories/PartnerRepository');
const ContractRepository = require('./repositories/ContractRepository');
const SaleRepository = require('./repositories/SaleRepository');
const InventoryRepository = require('./repositories/InventoryRepository');
const PaymentRepository = require('./repositories/PaymentRepository');
const ServiceOrderRepository = require('./repositories/ServiceOrderRepository');
const ReportRepository = require('./repositories/ReportRepository');
const BillRepository = require('./repositories/BillRepository');
const InvoiceRepository = require('./repositories/InvoiceRepository');

// --- SERVICES ---
const AuthService = require('./services/AuthService');
const ClientService = require('./services/ClientService');
const ProductService = require('./services/ProductService');
const SellerService = require('./services/SellerService');
const PartnerService = require('./services/PartnerService');
const ContractService = require('./services/ContractService');
const SaleService = require('./services/SaleService');
const InventoryService = require('./services/InventoryService');
const PaymentService = require('./services/PaymentService');
const ServiceOrderService = require('./services/ServiceOrderService');
const ReportService = require('./services/ReportService');
const BillService = require('./services/BillService');
const InvoiceService = require('./services/InvoiceService');
const AdminService = require('./services/AdminService');
const CommissionService = require('./services/CommissionService');
const NotificationService = require('./services/NotificationService');
const PDFService = require('./services/PDFService');

// --- CONTROLLERS ---
const AuthController = require('./controllers/AuthController');
const ClientController = require('./controllers/ClientController');
const ProductController = require('./controllers/ProductController');
const SellerController = require('./controllers/SellerController');
const PartnerController = require('./controllers/PartnerController');
const ContractController = require('./controllers/ContractController');
const SaleController = require('./controllers/SaleController');
const InventoryController = require('./controllers/InventoryController');
const PaymentController = require('./controllers/PaymentController');
const ServiceOrderController = require('./controllers/ServiceOrderController');
const AdminController = require('./controllers/AdminController');
const CommissionController = require('./controllers/CommissionController');
const NotificationController = require('./controllers/NotificationController');
const ReportController = require('./controllers/ReportController');
const BillController = require('./controllers/BillController');
const InvoiceController = require('./controllers/InvoiceController');

// --- INITIALIZATION ---
const repositories = {
    user: new UserRepository(pool),
    client: new ClientRepository(pool),
    product: new ProductRepository(pool),
    seller: new SellerRepository(pool),
    partner: new PartnerRepository(pool),
    contract: new ContractRepository(pool),
    sale: new SaleRepository(pool),
    inventory: new InventoryRepository(pool),
    payment: new PaymentRepository(pool),
    serviceOrder: new ServiceOrderRepository(pool),
    report: new ReportRepository(pool),
    bill: new BillRepository(pool),
    invoice: new InvoiceRepository(pool)
};

const logActivity = async (userId, action, details) => {
    try {
        const uid = userId || null;
        await pool.query('INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)', [uid, action, details]);
    } catch (err) { console.error("Log error:", err); }
};

const services = {};
services.notification = new NotificationService(pool);
services.auth = new AuthService(repositories.user);
services.client = new ClientService(repositories.client);
services.product = new ProductService(repositories.product);
services.seller = new SellerService(repositories.seller, repositories.user, pool);
services.partner = new PartnerService(repositories.partner);
services.contract = new ContractService(repositories.contract, repositories.serviceOrder, repositories.seller, repositories.payment, pool);
services.sale = new SaleService(repositories.sale, repositories.serviceOrder, repositories.product, repositories.inventory, repositories.seller, repositories.payment, pool);
services.inventory = new InventoryService(repositories.inventory, repositories.product);
services.payment = new PaymentService(repositories.payment, repositories.contract, repositories.sale);
services.serviceOrder = new ServiceOrderService(repositories.serviceOrder);
services.report = new ReportService(repositories.report);
services.bill = new BillService(repositories.bill);
services.invoice = new InvoiceService(repositories.invoice);
services.commission = new CommissionService(pool, repositories.seller, repositories.contract, repositories.sale, repositories.payment);
services.pdf = new PDFService();
services.admin = new AdminService(pool, services.notification, services.commission, services.pdf);

const controllers = {
    auth: new AuthController(services.auth),
    client: new ClientController(services.client, logActivity),
    product: new ProductController(services.product, logActivity),
    seller: new SellerController(services.seller, logActivity),
    partner: new PartnerController(services.partner, logActivity),
    contract: new ContractController(services.contract, logActivity),
    sale: new SaleController(services.sale, logActivity),
    inventory: new InventoryController(services.inventory, logActivity),
    payment: new PaymentController(services.payment, logActivity),
    serviceOrder: new ServiceOrderController(services.serviceOrder, logActivity),
    report: new ReportController(services.report, logActivity),
    bill: new BillController(services.bill, logActivity),
    invoice: new InvoiceController(services.invoice),
    admin: new AdminController(services.admin),
    commission: new CommissionController(services.commission),
    notification: new NotificationController(services.notification)
};

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// --- ROUTES ---

// External CNPJ API
app.get('/api/cnpj/:cnpj', async (req, res) => {
    try {
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${req.params.cnpj}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Erro ao consultar CNPJ" });
    }
});

// Auth
app.post('/api/auth/register', (req, res) => controllers.auth.register(req, res));
app.post('/api/auth/login', (req, res) => controllers.auth.login(req, res));

// Clients
app.get('/api/clients', authenticateToken, (req, res) => controllers.client.getClients(req, res));
app.post('/api/clients', authenticateToken, (req, res) => controllers.client.createClient(req, res));
app.patch('/api/clients/:id', authenticateToken, (req, res) => controllers.client.updateClient(req, res));
app.delete('/api/clients/:id', authenticateToken, (req, res) => controllers.client.deleteClient(req, res));

// Products
app.get('/api/products', authenticateToken, (req, res) => controllers.product.getProducts(req, res));
app.post('/api/products', authenticateToken, (req, res) => controllers.product.createProduct(req, res));
app.patch('/api/products/:id', authenticateToken, (req, res) => controllers.product.updateProduct(req, res));
app.delete('/api/products/:id', authenticateToken, (req, res) => controllers.product.deleteProduct(req, res));

// Sellers
app.get('/api/sellers', authenticateToken, (req, res) => controllers.seller.getSellers(req, res));
app.post('/api/sellers', authenticateToken, (req, res) => controllers.seller.createSeller(req, res));
app.patch('/api/sellers/:id', authenticateToken, (req, res) => controllers.seller.updateSeller(req, res));
app.delete('/api/sellers/:id', authenticateToken, (req, res) => controllers.seller.deleteSeller(req, res));

// Partners
app.get('/api/partners', authenticateToken, (req, res) => controllers.partner.getPartners(req, res));
app.post('/api/partners', authenticateToken, upload.single('certificate'), (req, res) => controllers.partner.createPartner(req, res));
app.patch('/api/partners/:id', authenticateToken, upload.single('certificate'), (req, res) => {
    console.log('PATCH /api/partners/:id route hit, ID:', req.params.id);
    controllers.partner.updatePartner(req, res);
});
app.delete('/api/partners/:id', authenticateToken, (req, res) => controllers.partner.deletePartner(req, res));

// Contracts
app.get('/api/contracts', authenticateToken, (req, res) => controllers.contract.getContracts(req, res));
app.post('/api/contracts', authenticateToken, (req, res) => controllers.contract.createContract(req, res));
app.patch('/api/contracts/:id', authenticateToken, (req, res) => controllers.contract.updateContract(req, res)); // Changed from status to full update
app.patch('/api/contracts/:id/status', authenticateToken, (req, res) => controllers.contract.updateContractStatus(req, res));
app.delete('/api/contracts/:id', authenticateToken, (req, res) => controllers.contract.deleteContract(req, res));
app.post('/api/contracts/:id/upload', authenticateToken, upload.single('pdf'), (req, res) => controllers.contract.uploadPdf(req, res));
app.get('/api/contracts/:id/payments', authenticateToken, (req, res) => controllers.payment.getPaymentsByContract(req, res));

// Contract Costs
app.get('/api/contracts/:id/costs', authenticateToken, (req, res) => controllers.contract.getContractCosts(req, res));
app.post('/api/contracts/:id/costs', authenticateToken, (req, res) => controllers.contract.addContractCost(req, res));
app.patch('/api/contracts/costs/:costId', authenticateToken, (req, res) => controllers.contract.updateContractCost(req, res));
app.delete('/api/contracts/costs/:costId', authenticateToken, (req, res) => controllers.contract.deleteContractCost(req, res));

// Sales
app.get('/api/extra-sales', authenticateToken, (req, res) => controllers.sale.getSales(req, res));
app.post('/api/extra-sales', authenticateToken, (req, res) => controllers.sale.createSale(req, res));
app.patch('/api/extra-sales/:id/status', authenticateToken, (req, res) => controllers.sale.updateSaleStatus(req, res));
app.patch('/api/extra-sales/:id', authenticateToken, (req, res) => controllers.sale.updateSale(req, res));
app.delete('/api/extra-sales/:id', authenticateToken, (req, res) => controllers.sale.deleteSale(req, res));

// Inventory
app.get('/api/inventory-logs', authenticateToken, (req, res) => controllers.inventory.getLogs(req, res));
app.post('/api/inventory/log', authenticateToken, (req, res) => controllers.inventory.logMovement(req, res));
app.post('/api/inventory/danfe', authenticateToken, (req, res) => controllers.inventory.processDanfe(req, res, repositories));

// Invoices (Notas)
app.get('/api/invoices', authenticateToken, (req, res) => controllers.invoice.getInvoices(req, res));
app.get('/api/invoices/:id/pdf', authenticateToken, (req, res) => controllers.invoice.getPdf(req, res));

// Commissions
app.get('/api/commissions', authenticateToken, (req, res) => controllers.commission.getCommissions(req, res));
app.post('/api/commissions/extra', authenticateToken, (req, res) => controllers.commission.createExtraCommission(req, res));

// Payments
app.post('/api/payments', authenticateToken, (req, res) => controllers.payment.createPayment(req, res));
app.delete('/api/payments/:id', authenticateToken, (req, res) => controllers.payment.deletePayment(req, res));

// Service Orders
app.get('/api/service-orders', authenticateToken, (req, res) => controllers.serviceOrder.getServiceOrders(req, res));
app.patch('/api/service-orders/:id', authenticateToken, (req, res) => controllers.serviceOrder.updateStatus(req, res));

// Reports
app.get('/api/reports', authenticateToken, (req, res) => controllers.report.getReports(req, res));
app.post('/api/reports', authenticateToken, (req, res) => controllers.report.createReport(req, res));
app.patch('/api/reports/:id', authenticateToken, (req, res) => controllers.report.updateReport(req, res));
app.delete('/api/reports/:id', authenticateToken, (req, res) => controllers.report.deleteReport(req, res));
app.post('/api/reports/upload-image', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Bills Payable
app.get('/api/bills', authenticateToken, (req, res) => controllers.bill.getBills(req, res));
app.post('/api/bills', authenticateToken, (req, res) => controllers.bill.createBill(req, res));
app.patch('/api/bills/:id', authenticateToken, (req, res) => controllers.bill.updateBill(req, res));
app.delete('/api/bills/:id', authenticateToken, (req, res) => controllers.bill.deleteBill(req, res));
app.post('/api/bills/:id/pay', authenticateToken, (req, res) => controllers.bill.payBill(req, res));

// Notifications
app.get('/api/notifications/summary', authenticateToken, (req, res) => controllers.notification.getSummary(req, res));
app.post('/api/notifications/send-invoice', authenticateToken, (req, res) => controllers.notification.sendInvoiceEmail(req, res));

// Admin Stats
app.get('/api/admin/sellers-stats', authenticateToken, (req, res) => controllers.admin.getSellersStats(req, res));
app.get('/api/admin/dashboard-stats', authenticateToken, (req, res) => controllers.admin.getDashboardStats(req, res));
app.get('/api/admin/test', (req, res) => res.send('Admin API OK'));
app.get('/api/admin/reports', authenticateToken, (req, res) => controllers.report.getAdminReports(req, res));
app.get('/api/admin/users', authenticateToken, (req, res) => controllers.admin.getUsers(req, res));
app.post('/api/admin/users', authenticateToken, (req, res) => controllers.admin.createUser(req, res));
app.patch('/api/admin/users/:id', authenticateToken, (req, res) => controllers.admin.updateUser(req, res));
app.delete('/api/admin/users/:id', authenticateToken, (req, res) => controllers.admin.deleteUser(req, res));
app.patch('/api/admin/users/:id/permissions', authenticateToken, (req, res) => controllers.admin.updateUserPermissions(req, res));
app.get('/api/admin/settings', authenticateToken, (req, res) => controllers.admin.getSettings(req, res));
app.patch('/api/admin/settings', authenticateToken, (req, res) => controllers.admin.updateSettings(req, res));
app.post('/api/admin/trigger-billing', authenticateToken, (req, res) => controllers.admin.triggerBilling(req, res));
app.post('/api/admin/trigger-expiry-report', authenticateToken, (req, res) => controllers.admin.triggerExpiryReport(req, res));
app.get('/api/admin/billing-summary', authenticateToken, (req, res) => controllers.admin.getBillingSummary(req, res));
app.get('/api/admin/logs', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Administrador') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const result = await pool.query(`
            SELECT al.*, u.name as user_name 
            FROM activity_log al 
            LEFT JOIN users u ON al.user_id = u.id 
            ORDER BY al.created_at DESC LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- AUTOMATION JOBS ---

let automationTimeout = null;

const runAutoBilling = async () => {
    try {
        const result = await pool.query("SELECT * FROM system_settings WHERE id = 1");
        if (result.rows.length === 0) return;
        const settings = result.rows[0];
        if (!settings.auto_billing_enabled) {
            const nextDelay = Math.floor(Math.random() * (300000 - 40000 + 1) + 40000);
            automationTimeout = setTimeout(runAutoBilling, nextDelay);
            return;
        }

        const now = new Date();
        const hour = now.getHours();
        // Commencial Period: 08:00 to 18:00
        if (hour >= 8 && hour < 18) {
            const { overdue } = await services.notification.getNotificationSummary({ role: 'Administrador' });
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const eligibleClients = overdue.filter(client => {
                if (!client.client_email) return false;
                if (!client.last_billing_email_at) return true;
                return new Date(client.last_billing_email_at) < sevenDaysAgo;
            });

            if (eligibleClients.length > 0) {
                const client = eligibleClients[Math.floor(Math.random() * eligibleClients.length)];
                
                try {
                    const overdueInvoices = await services.notification.getOverdueInvoicesForClient(client.client_id);
                    const attachments = [];

                    for (const inv of overdueInvoices) {
                        const pdfBuffer = await services.pdf.generateInvoicePDF(inv);
                        const [y, m, d] = inv.dueDate.split('-').map(Number);
                        const dueDateObj = new Date(y, m - 1, d);
                        attachments.push({
                            filename: `Fatura_${format(dueDateObj, 'dd-MM-yyyy')}.pdf`,
                            content: pdfBuffer
                        });
                    }

                    await services.notification.sendEmail(
                        client.client_email, 
                        "Aviso de Cobrança Automática - UniSis (Faturas em Anexo)", 
                        `
                            <h2>Olá, ${client.client_name}</h2>
                            <p>Este é um aviso automático informando que constam <b>${overdueInvoices.length}</b> fatura(s) pendente(s) em seu nome.</p>
                            <p>Os boletos/faturas detalhados seguem em anexo.</p>
                            <p>Por favor, verifique e realize o pagamento.</p>
                            <p>Atenciosamente,<br>Equipe UniSis</p>
                        `,
                        attachments
                    );
                    await services.notification.updateLastBillingTimestamp(client.client_id);
                    console.log(`Auto-billing sent to ${client.client_name} with ${attachments.length} attachments.`);
                } catch (err) {
                    console.error("Auto-billing error:", err.message);
                }
            }
        }

        const nextDelay = Math.floor(Math.random() * (300000 - 40000 + 1) + 40000);
        automationTimeout = setTimeout(runAutoBilling, nextDelay);
    } catch (err) {
        console.log("Automation check skipped (DB initializing...)", err.message);
        setTimeout(runAutoBilling, 30000);
    }
};

cron.schedule('0 9 * * 1', async () => {
    try {
        const result = await pool.query("SELECT * FROM system_settings WHERE id = 1");
        if (result.rows.length === 0) return;
        const settings = result.rows[0];
        if (!settings.auto_expiry_enabled || !settings.report_email) return;

        const { expiring } = await services.notification.getNotificationSummary();
        if (expiring.length > 0) {
            let html = "<h2>Relatório de Contratos Expirando esta Semana</h2><ul>";
            expiring.forEach(e => {
                html += `<li>${e.client_name} - Término: ${format(new Date(e.endDate), 'dd/MM/yyyy')}</li>`;
            });
            html += "</ul>";
            await services.notification.sendEmail(settings.report_email, "Contratos Expirando - UniSis", html);
        }
    } catch (err) {
        console.error("Cron expiry report error:", err);
    }
});

// --- STARTUP ---
const start = async () => {
    try {
        await initDb();
        console.log("Database initialized");
        setTimeout(runAutoBilling, 10000);

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error("Critical startup error:", err);
    }
};

start();
