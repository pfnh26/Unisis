import api from '../api';

class ProductService {
    async getProducts(search = '') {
        const { data } = await api.get(`/products?search=${search}`);
        return data;
    }

    async createProduct(productData) {
        const { data } = await api.post('/products', productData);
        return data;
    }

    async updateProduct(id, updates) {
        const { data } = await api.patch(`/products/${id}`, updates);
        return data;
    }

    async deleteProduct(id) {
        await api.delete(`/products/${id}`);
    }
}

export default new ProductService();
