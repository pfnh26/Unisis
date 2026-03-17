class ServiceOrderService {
    constructor(serviceOrderRepository) {
        this.serviceOrderRepository = serviceOrderRepository;
    }

    async getServiceOrders(sellerUserId = null) {
        return await this.serviceOrderRepository.findAllWithDetails(sellerUserId);
    }

    async updateStatus(id, status) {
        return await this.serviceOrderRepository.update(id, { status });
    }
}

module.exports = ServiceOrderService;
