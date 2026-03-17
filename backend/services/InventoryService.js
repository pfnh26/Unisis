class InventoryService {
    constructor(inventoryRepository, productRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
    }

    async getLogs() {
        return await this.inventoryRepository.findAllWithDetails();
    }

    async getProducts() {
        return await this.productRepository.findAll();
    }

    async logMovement(data) {
        const { product_id, type, quantity, reason, ncm, cfop, v_bc, v_icms, v_ipi, v_pis, v_cofins, unit_cost } = data;
        await this.inventoryRepository.create({
            product_id, type, quantity, reason,
            ncm, cfop, v_bc, v_icms, v_ipi, v_pis, v_cofins, unit_cost
        });

        const product = await this.productRepository.findById(product_id);
        if (product) {
            const newStock = type === 'Entrada'
                ? parseInt(product.stock) + parseInt(quantity)
                : parseInt(product.stock) - parseInt(quantity);

            // Update stock and also update product default tax/cost info from the latest movement
            await this.productRepository.update(product_id, {
                stock: newStock,
                cost: unit_cost || product.cost,
                ncm: ncm || product.ncm,
                cfop: cfop || product.cfop,
                v_bc: v_bc || product.v_bc,
                v_icms: v_icms || product.v_icms,
                v_ipi: v_ipi || product.v_ipi,
                v_pis: v_pis || product.v_pis,
                v_cofins: v_cofins || product.v_cofins
            });
        }
        return { success: true };
    }

    async processDanfe(accessKey, partnerId, repositories) {
        const { spawn } = require('child_process');
        const path = require('path');
        const fs = require('fs');

        const partner = await repositories.partner.findById(partnerId);
        if (!partner || !partner.certificate_url || !partner.certificate_password) {
            throw new Error('Parceiro não possui certificado ou senha configurados');
        }

        const cleanCertUrl = partner.certificate_url.startsWith('/') ? partner.certificate_url.substring(1) : partner.certificate_url;
        const certPath = path.join(__dirname, '..', cleanCertUrl);

        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, 'danfe_handler.py');

        return new Promise((resolve, reject) => {
            const py = spawn(pythonPath, [scriptPath, accessKey, partner.cnpj, certPath, partner.certificate_password]);
            let dataString = '';
            let errorString = '';

            py.stdout.on('data', (data) => { dataString += data.toString(); });
            py.stderr.on('data', (data) => { errorString += data.toString(); });

            py.on('close', async (code) => {
                if (code !== 0) {
                    return reject(new Error(`Python script exited with code ${code}: ${errorString}`));
                }

                try {
                    if (!dataString.trim()) {
                        return reject(new Error(`Python script returned empty output. Error: ${errorString}`));
                    }

                    const result = JSON.parse(dataString);
                    if (result.error) {
                        console.error('DANFE Handler Error:', result.error, result.traceback || '');
                        return reject(new Error(result.error));
                    }

                    const { analise, duplicatas, xml } = result;
                    if (!analise || !analise.itens) {
                        return reject(new Error('Dados da nota não encontrados no XML retornado.'));
                    }

                    const items = analise.itens || [];

                    // Process Products
                    for (const item of items) {
                        let product = await repositories.product.findByCode(item.codigo);
                        if (!product) {
                            // Register automatically
                            product = await repositories.product.create({
                                code: item.codigo,
                                description: item.descricao,
                                unit: (item.unidade || 'UN').toUpperCase().startsWith('KG') ? 'KG' : 'Unidade',
                                cost: parseFloat(item.valor_unitario) || 0,
                                stock: 0,
                                ncm: item.ncm,
                                cfop: item.cfop,
                                v_bc: parseFloat(item.v_bc) || 0,
                                v_icms: parseFloat(item.v_icms) || 0,
                                v_ipi: parseFloat(item.v_ipi) || 0,
                                v_pis: parseFloat(item.v_pis) || 0,
                                v_cofins: parseFloat(item.v_cofins) || 0
                            });
                        }

                        // Update Stock (this also updates product defaults via logMovement)
                        await this.logMovement({
                            product_id: product.id,
                            type: 'Entrada',
                            quantity: parseInt(item.quantidade) || 0,
                            reason: `Entrada via DANFE: ${accessKey}`,
                            ncm: item.ncm,
                            cfop: item.cfop,
                            v_bc: parseFloat(item.v_bc) || 0,
                            v_icms: parseFloat(item.v_icms) || 0,
                            v_ipi: parseFloat(item.v_ipi) || 0,
                            v_pis: parseFloat(item.v_pis) || 0,
                            v_cofins: parseFloat(item.v_cofins) || 0,
                            unit_cost: parseFloat(item.valor_unitario) || 0
                        });
                    }

                    // Process Bills (Duplicatas) - Added barcode placeholder for future logic
                    for (const dup of duplicatas) {
                        await repositories.bill.create({
                            description: `Duplicata NF-e ${accessKey} - Parc ${dup.numero}`,
                            category: 'Fornecedores',
                            value: parseFloat(dup.valor) || 0,
                            due_date: dup.vencimento || new Date().toISOString().split('T')[0],
                            status: 'Pendente',
                            barcode: '',
                            numeric_code: '',
                        });
                    }

                    // Save Invoice (Nota) - Save XML content as text for PDF generation
                    await repositories.invoice.create({
                        partner_id: partnerId,
                        access_key: accessKey,
                        description: `Compra via NF-e - Emitente: ${analise.cnpj_emitente || 'Não identificado'}`,
                        total_value: parseFloat(analise.valor_total) || 0,
                        date: analise.data_emissao ? analise.data_emissao.split('T')[0] : new Date().toISOString().split('T')[0],
                        xml_url: xml, // Store full XML content here for now or in a separate column if we had one
                        pdf_url: ''
                    });

                    resolve({ success: true });
                } catch (err) {
                    console.error('Error processing DANFE result:', err);
                    reject(new Error(`Error parsing python output: ${err.message}`));
                }
            });
        });
    }
}

module.exports = InventoryService;
