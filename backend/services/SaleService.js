class SaleService {
    constructor(saleRepository, serviceOrderRepository, productRepository, inventoryRepository, sellerRepository, paymentRepository, pool) {
        this.saleRepository = saleRepository;
        this.serviceOrderRepository = serviceOrderRepository;
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.sellerRepository = sellerRepository;
        this.paymentRepository = paymentRepository;
        this.pool = pool;
    }

    async getAllSales() {
        return await this.saleRepository.findAllWithDetails();
    }

    async createSale(data) {
        const { client_id, seller_id, partner_id, product_description, product_id, cost, price, execution_date, description, items } = data;

        const sale = await this.saleRepository.create({
            client_id: client_id || null,
            seller_id: seller_id || null,
            partner_id: partner_id || null,
            product_id: product_id || null,
            product_description,
            description,
            cost,
            price,
            execution_date,
            items: JSON.stringify(items || [])
        });

        // Auto-generate Service Order
        const seller = await this.sellerRepository.findById(seller_id);
        if (seller) {
            await this.serviceOrderRepository.create({
                sale_id: sale.id,
                seller_id: seller.user_id,
                execution_date: execution_date,
                status: 'Pendente'
            });
        }

        // Update stock if items exist
        const saleItems = items || [];
        for (const item of saleItems) {
            if (item.product_id) {
                const product = await this.productRepository.findById(item.product_id);
                if (product) {
                    await this.productRepository.update(item.product_id, { stock: parseInt(product.stock) - (item.quantity || 1) });
                    await this.inventoryRepository.create({
                        product_id: item.product_id,
                        type: 'Saída',
                        quantity: item.quantity || 1,
                        reason: `Venda Avulsa ID: ${sale.id}`
                    });
                }
            }
        }

        // Keep legacy single product stock update for compatibility if items is empty
        if (saleItems.length === 0 && product_id) {
            const product = await this.productRepository.findById(product_id);
            if (product) {
                await this.productRepository.update(product_id, { stock: parseInt(product.stock) - 1 });
                await this.inventoryRepository.create({
                    product_id,
                    type: 'Saída',
                    quantity: 1,
                    reason: `Venda Avulsa ID: ${sale.id}`
                });
            }
        }

        return sale;
    }

    async updateSale(id, data) {
        const { client_id, seller_id, partner_id, product_description, product_id, cost, price, execution_date, description, items } = data;

        return await this.saleRepository.update(id, {
            client_id: client_id || null,
            seller_id: seller_id || null,
            partner_id: partner_id || null,
            product_id: product_id || null,
            product_description,
            description,
            cost,
            price,
            execution_date,
            items: JSON.stringify(items || [])
        });
    }

    async deleteSale(id) {
        return await this.saleRepository.delete(id);
    }

    async updateSaleStatus(id, status) {
        const result = await this.saleRepository.update(id, { status });

        // If status is changed to 'Pago', create a payment record if it doesn't exist
        if (status === 'Pago') {
            const sale = await this.saleRepository.findById(id);
            const existingPayment = await this.pool.query('SELECT id FROM payments WHERE sale_id = $1', [id]);

            if (existingPayment.rows.length === 0) {
                // Double check using repository findOne for consistency
                const exists = await this.paymentRepository.findOne({
                    where: 'sale_id = $1',
                    params: [id]
                });
                
                if (!exists) {
                    await this.paymentRepository.create({
                        sale_id: id,
                        amount: sale.price,
                        payment_date: new Date(),
                        description: `Pagamento Venda Avulsa: ${sale.product_description || 'Serviço'}`
                    });
                }
            }
        }

        return result;
    }
}

module.exports = SaleService;
