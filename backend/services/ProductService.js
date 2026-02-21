class ProductService {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }

    async getAllProducts(search = null) {
        if (search) {
            return await this.productRepository.search(search);
        }
        return await this.productRepository.findAll({ orderBy: 'description ASC' });
    }

    async createProduct(data) {
        return await this.productRepository.create(data);
    }

    async updateProduct(id, updates) {
        return await this.productRepository.update(id, updates);
    }

    async deleteProduct(id) {
        return await this.productRepository.delete(id);
    }
}

module.exports = ProductService;
