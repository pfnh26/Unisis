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

    async sendInvoiceEmail(req, res) {
        const { to, subject, html, attachments } = req.body;
        try {
            // attachments should be [{ filename: '...', content: 'base64...', encoding: 'base64' }]
            const formattedAttachments = attachments.map(att => ({
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'),
                contentType: 'application/pdf'
            }));

            await this.notificationService.sendEmail(to, subject, html, formattedAttachments);
            res.json({ success: true, message: "E-mail enviado com sucesso!" });
        } catch (err) {
            console.error("Email send error:", err);
            res.status(500).json({ error: "Erro ao enviar e-mail: " + err.message });
        }
    }
}

module.exports = NotificationController;
