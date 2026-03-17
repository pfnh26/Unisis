class InvoiceController {
    constructor(invoiceService) {
        this.invoiceService = invoiceService;
    }

    async getInvoices(req, res) {
        try {
            const invoices = await this.invoiceService.getAllInvoices();
            res.json(invoices);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getPdf(req, res) {
        try {
            const { id } = req.params;
            const pdfDoc = await this.invoiceService.generatePdf(id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=nota_${id}.pdf`);

            pdfDoc.pipe(res);
            pdfDoc.end();
        } catch (err) {
            console.error('PDF Generation Error:', err);
            res.status(500).send(`Erro ao gerar PDF: ${err.message}`);
        }
    }
}

module.exports = InvoiceController;
