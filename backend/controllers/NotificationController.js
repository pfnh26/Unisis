class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }

    async getSummary(req, res) {
        try {
            const summary = await this.notificationService.getNotificationSummary(req.user);
            res.json(summary);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = NotificationController;
