class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }

    async getDashboardStats(req, res) {
        const { month, year } = req.query;
        try {
            const stats = await this.adminService.getDashboardStats(month, year);
            res.json(stats);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getSellersStats(req, res) {
        const { month, year } = req.query;
        try {
            const stats = await this.adminService.getSellersStats(month, year);
            res.json(stats);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getUsers(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        try {
            const users = await this.adminService.getUsers();
            res.json(users);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateUserPermissions(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        const { id } = req.params;
        const { permissions } = req.body;
        try {
            await this.adminService.updateUserPermissions(id, permissions);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createUser(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        try {
            const user = await this.adminService.createUser(req.body);
            res.status(201).json(user);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async updateUser(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        const { id } = req.params;
        try {
            const user = await this.adminService.updateUser(id, req.body);
            res.json(user);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteUser(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        const { id } = req.params;
        try {
            await this.adminService.deleteUser(id);
            res.sendStatus(204);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getSettings(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        try {
            const settings = await this.adminService.getSettings();
            res.json(settings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async updateSettings(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        try {
            await this.adminService.updateSettings(req.body);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async triggerBilling(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        try {
            const result = await this.adminService.triggerBilling();
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async triggerExpiryReport(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        const { target_email } = req.body;
        try {
            await this.adminService.triggerExpiryReport(target_email);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getBillingSummary(req, res) {
        const isAdmin = req.user.role === 'Administrador';
        const hasAdminPerm = req.user.permissions?.includes('admin');
        if (!isAdmin && !hasAdminPerm) return res.status(403).json({ error: 'Acesso negado' });
        try {
            const summary = await this.adminService.getBillingSummary();
            res.json(summary);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = AdminController;
