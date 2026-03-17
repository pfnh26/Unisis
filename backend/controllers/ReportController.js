class ReportController {
    constructor(reportService, logActivity) {
        this.reportService = reportService;
        this.logActivity = logActivity;
    }

    async getReports(req, res) {
        try {
            const userId = req.user.id || req.user.userId;
            const reports = await this.reportService.getReportsByUser(userId);
            res.json(reports);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }

    async createReport(req, res) {
        try {
            const userId = req.user.id || req.user.userId;
            const data = { ...req.body, user_id: userId };

            // Handle image uploads if present (expecting URLs or handled by frontend? 
            // The prompt implies image upload capability. usually handled by multer separately or base64. 
            // For now assuming the frontend uploads files to /uploads endpoints returns URLs, and sends URLs here.)

            const report = await this.reportService.createReport(data);

            const clientName = data.client_name || 'Desconhecido';
            const visitType = data.visit_type || 'Visita';
            const logDetails = `Cliente: ${clientName} | Tipo: ${visitType} | Relatório ID: ${report.id}`;

            console.log("Logging Report Activity:", logDetails);
            if (!report._alreadyExists) {
                await this.logActivity(userId, 'Criar Relatório', logDetails);
            }
            res.json(report);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }

    async getAdminReports(req, res) {
        try {
            const isAdmin = req.user.role === 'Administrador';
            const hasAdminPerm = req.user.permissions?.includes('admin');
            if (!isAdmin && !hasAdminPerm) {
                return res.status(403).json({ error: 'Acesso negado' });
            }
            const filters = {
                seller_id: req.query.seller_id,
                month: req.query.month,
                year: req.query.year
            };
            const reports = await this.reportService.getAdminReports(filters);
            res.json(reports);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }

    async updateReport(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id || req.user.userId;
            const report = await this.reportService.updateReport(id, req.body);

            const clientName = req.body.client_name || 'Desconhecido';
            await this.logActivity(userId, 'Atualizar Relatório', `Cliente: ${clientName} | Relatório ID: ${id}`);

            res.json(report);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteReport(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id || req.user.userId;

            // Get report details for logging
            const reports = await this.reportService.getReportsByUser(userId);
            const report = reports.find(r => r.id == id);
            const clientName = report?.client_name || 'Desconhecido';

            await this.reportService.deleteReport(id);
            await this.logActivity(userId, 'Excluir Relatório', `Cliente: ${clientName} | Relatório ID: ${id}`);

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ReportController;
