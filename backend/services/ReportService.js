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
        // Deduplicação pelo offline_hash
        if (data.offline_hash) {
            const existing = await this.reportRepository.findOne({
                where: 'offline_hash = $1',
                params: [data.offline_hash]
            });
            if (existing) {
                console.log(`[ReportService] Duplicate report detected with hash ${data.offline_hash}. Returning existing ID ${existing.id}`);
                return { ...existing, _alreadyExists: true };
            }
        }

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

        // Fazer o mesmo para a segunda assinatura (se houver)
        let secondSignatureUrl = data.second_signature;
        if (secondSignatureUrl && typeof secondSignatureUrl === 'string' && secondSignatureUrl.startsWith('data:image')) {
            try {
                const match = secondSignatureUrl.match(/^data:image\/(\w+);base64,/);
                const ext = match ? match[1] : 'png';
                const base64Data = secondSignatureUrl.replace(/^data:image\/\w+;base64,/, "");
                const filename = `sig2_offline_${crypto.randomBytes(8).toString('hex')}.${ext}`;
                const filepath = path.join(__dirname, '..', 'uploads', filename);

                fs.writeFileSync(filepath, base64Data, 'base64');
                secondSignatureUrl = `/uploads/${filename}`;
            } catch (err) {
                console.error("Erro ao salvar segunda assinatura base64:", err);
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
            client_signature: signatureUrl,
            // 02 Fields
            report_type: data.report_type || '01',
            equipment_items: JSON.stringify(data.equipment_items || []),
            dosage_regulation: data.dosage_regulation,
            client_brand: data.client_brand,
            client_model: data.client_model,
            client_serial: data.client_serial,
            defect_found: data.defect_found,
            service_performed: data.service_performed,
            second_signature: secondSignatureUrl,
            client_city: data.client_city,
            client_phone: data.client_phone,
            client_cnpj: data.client_cnpj,
            offline_hash: data.offline_hash,
            equipment_obs: data.equipment_obs
        };
        return await this.reportRepository.create(reportData);
    }

    async getAdminReports(filters) {
        return await this.reportRepository.findAllWithFilters(filters);
    }

    async deleteReport(id) {
        return await this.reportRepository.delete(id);
    }

    async updateReport(id, data) {
        // Processar imagens: se for base64 (capturado offline), salvar como arquivo
        const processedImages = [];
        if (data.images && Array.isArray(data.images)) {
            for (let img of data.images) {
                if (typeof img === 'string' && img.startsWith('data:image')) {
                    try {
                        const match = img.match(/^data:image\/(\w+);base64,/);
                        const ext = match ? match[1] : 'jpg';
                        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                        const filename = `offline_upd_${crypto.randomBytes(8).toString('hex')}.${ext}`;
                        const filepath = path.join(__dirname, '..', 'uploads', filename);

                        fs.writeFileSync(filepath, base64Data, 'base64');
                        processedImages.push(`/uploads/${filename}`);
                    } catch (err) {
                        console.error("Erro ao salvar imagem base64:", err);
                        processedImages.push(img);
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
                const filename = `sig_offline_upd_${crypto.randomBytes(8).toString('hex')}.${ext}`;
                const filepath = path.join(__dirname, '..', 'uploads', filename);

                fs.writeFileSync(filepath, base64Data, 'base64');
                signatureUrl = `/uploads/${filename}`;
            } catch (err) {
                console.error("Erro ao salvar assinatura base64:", err);
            }
        }

        // Segunda assinatura update
        let secondSignatureUrl = data.second_signature;
        if (secondSignatureUrl && typeof secondSignatureUrl === 'string' && secondSignatureUrl.startsWith('data:image')) {
            try {
                const match = secondSignatureUrl.match(/^data:image\/(\w+);base64,/);
                const ext = match ? match[1] : 'png';
                const base64Data = secondSignatureUrl.replace(/^data:image\/\w+;base64,/, "");
                const filename = `sig2_upd_${crypto.randomBytes(8).toString('hex')}.${ext}`;
                const filepath = path.join(__dirname, '..', 'uploads', filename);

                fs.writeFileSync(filepath, base64Data, 'base64');
                secondSignatureUrl = `/uploads/${filename}`;
            } catch (err) {
                console.error("Erro ao salvar segunda assinatura base64:", err);
            }
        }

        const updates = {
            client_id: data.client_id,
            contact_name: data.contact_name,
            representative: data.representative,
            visit_type: data.visit_type,
            reason: data.reason,
            sample_collection: data.sample_collection,
            comments: data.comments,
            images: JSON.stringify(processedImages),
            sales_contact: data.sales_contact,
            client_signature: signatureUrl,
            // 02 Fields
            report_type: data.report_type,
            equipment_items: data.equipment_items ? JSON.stringify(data.equipment_items) : undefined,
            dosage_regulation: data.dosage_regulation,
            client_brand: data.client_brand,
            client_model: data.client_model,
            client_serial: data.client_serial,
            defect_found: data.defect_found,
            service_performed: data.service_performed,
            second_signature: secondSignatureUrl,
            client_city: data.client_city,
            client_phone: data.client_phone,
            client_cnpj: data.client_cnpj,
            equipment_obs: data.equipment_obs
        };

        return await this.reportRepository.update(id, updates);
    }
}

module.exports = ReportService;
