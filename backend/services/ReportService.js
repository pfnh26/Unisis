const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ReportService {
    constructor(reportRepository) {
        this.reportRepository = reportRepository;
    }

    async getReportsByUser(userId) {
        return await this.reportRepository.findAllByUser(userId);
    }

    async createReport(data) {
        // Processar imagens: se for base64 (capturado offline), salvar como arquivo
        const processedImages = [];
        if (data.images && Array.isArray(data.images)) {
            for (let img of data.images) {
                if (typeof img === 'string' && img.startsWith('data:image')) {
                    try {
                        const match = img.match(/^data:image\/(\w+);base64,/);
                        const ext = match ? match[1] : 'jpg';
                        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                        const filename = `offline_${crypto.randomBytes(8).toString('hex')}.${ext}`;
                        const filepath = path.join(__dirname, '..', 'uploads', filename);

                        fs.writeFileSync(filepath, base64Data, 'base64');
                        processedImages.push(`/uploads/${filename}`);
                    } catch (err) {
                        console.error("Erro ao salvar imagem base64:", err);
                        processedImages.push(img); // Mantém base64 se falhar
                    }
                } else {
                    processedImages.push(img);
                }
            }
        }

        // Fazer o mesmo para a assinatura
        let signatureUrl = data.client_signature;
        if (signatureUrl && typeof signatureUrl === 'string' && signatureUrl.startsWith('data:image')) {
            try {
                const match = signatureUrl.match(/^data:image\/(\w+);base64,/);
                const ext = match ? match[1] : 'png';
                const base64Data = signatureUrl.replace(/^data:image\/\w+;base64,/, "");
                const filename = `sig_offline_${crypto.randomBytes(8).toString('hex')}.${ext}`;
                const filepath = path.join(__dirname, '..', 'uploads', filename);

                fs.writeFileSync(filepath, base64Data, 'base64');
                signatureUrl = `/uploads/${filename}`;
            } catch (err) {
                console.error("Erro ao salvar assinatura base64:", err);
            }
        }

        // Preparar dados para inserção
        const reportData = {
            user_id: data.user_id,
            client_id: data.client_id,
            contact_name: data.contact_name,
            representative: data.representative,
            visit_type: data.visit_type,
            reason: data.reason,
            sample_collection: data.sample_collection,
            comments: data.comments,
            images: JSON.stringify(processedImages),
            sales_contact: data.sales_contact,
            client_signature: signatureUrl
        };
        return await this.reportRepository.create(reportData);
    }

    async getAdminReports(filters) {
        return await this.reportRepository.findAllWithFilters(filters);
    }
}

module.exports = ReportService;
