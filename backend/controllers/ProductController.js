class ProductController {
    constructor(productService, logActivity) {
        this.productService = productService;
        this.logActivity = logActivity;
    }

    async getProducts(req, res) {
        const { search } = req.query;
        try {
            const products = await this.productService.getAllProducts(search);
            res.json(products);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async createProduct(req, res) {
        const { description, code, unit, cost } = req.body;
        try {
            const product = await this.productService.createProduct({ description, code, unit, cost });
            this.logActivity(req.user.id || req.user.userId, 'Criar Produto', `Produto: ${description} | Código: ${code} | Custo: R$ ${parseFloat(cost).toFixed(2)}`);
            res.status(201).json(product);
        } catch (err) {
            res.status(400).json({ error: "Code already exists or invalid data" });
        }
    }

    async updateProduct(req, res) {
        const { id } = req.params;
        const updates = req.body;
        try {
            const oldProducts = await this.productService.getAllProducts();
            const productBefore = oldProducts.find(p => p.id == id);
            const product = await this.productService.updateProduct(id, updates);

            // Criar detalhes das alterações
            let changes = [];
            if (updates.description && updates.description !== productBefore.description) changes.push(`Descrição: "${productBefore.description}" → "${updates.description}"`);
            if (updates.code && updates.code !== productBefore.code) changes.push(`Código: "${productBefore.code}" → "${updates.code}"`);
            if (updates.cost && parseFloat(updates.cost) !== parseFloat(productBefore.cost)) changes.push(`Custo: R$ ${parseFloat(productBefore.cost).toFixed(2)} → R$ ${parseFloat(updates.cost).toFixed(2)}`);
            if (updates.unit && updates.unit !== productBefore.unit) changes.push(`Unidade: "${productBefore.unit}" → "${updates.unit}"`);

            const details = changes.length > 0
                ? `Produto: ${productBefore.description} | Alterações: ${changes.join(', ')}`
                : `Produto: ${productBefore.description} | Sem alterações significativas`;

            this.logActivity(req.user.id || req.user.userId, 'Atualizar Produto', details);
            res.json(product);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteProduct(req, res) {
        const { id } = req.params;
        try {
            const oldProducts = await this.productService.getAllProducts();
            const productData = oldProducts.find(p => p.id == id);
            await this.productService.deleteProduct(id);
            this.logActivity(req.user.id || req.user.userId, 'Excluir Produto', `Produto: ${productData?.description || 'Desconhecido'} | Código: ${productData?.code || 'N/A'}`);
            res.sendStatus(204);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ProductController;
