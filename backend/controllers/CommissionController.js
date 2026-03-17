class CommissionController {
    constructor(commissionService) {
        this.commissionService = commissionService;
    }

    async getCommissions(req, res) {
        try {
            const commissions = await this.commissionService.getCommissions(req.user, req.query);
            res.json(commissions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async createExtraCommission(req, res) {
        try {
            const extra = await this.commissionService.createExtraCommission(req.body);
            res.json(extra);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = CommissionController;
