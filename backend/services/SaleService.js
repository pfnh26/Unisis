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
        const { client_id, seller_id, partner_id, product_description, product_id, cost, price, execution_date, description } = data;

        const sale = await this.saleRepository.create({
            client_id: client_id || null,
            seller_id: seller_id || null,
            partner_id: partner_id || null,
            product_id: product_id || null,
            product_description,
            description,
            cost,
            price,
            execution_date
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

        // Update stock if product_id exists
        if (product_id) {
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

    async updateSaleStatus(id, status) {
        const result = await this.saleRepository.update(id, { status });

        // If status is changed to 'Pago', create a payment record if it doesn't exist
        if (status === 'Pago') {
            const sale = await this.saleRepository.findById(id);
            const existingPayment = await this.pool.query('SELECT id FROM payments WHERE sale_id = $1', [id]);

            if (existingPayment.rows.length === 0) {
                await this.paymentRepository.create({
                    sale_id: id,
                    amount: sale.price,
                    payment_date: new Date(),
                    description: `Pagamento Venda Avulsa: ${sale.product_description || 'Serviço'}`
                });
            }
        }

        return result;
    }
}

module.exports = SaleService;
