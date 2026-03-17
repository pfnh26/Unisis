class PartnerService {
    constructor(partnerRepository) {
        this.partnerRepository = partnerRepository;
    }

    async getAllPartners() {
        return await this.partnerRepository.findAll({ orderBy: 'name ASC' });
    }

    async createPartner(data) {
        return await this.partnerRepository.create(data);
    }

    async updatePartner(id, data) {
        return await this.partnerRepository.update(id, data);
    }

    async deletePartner(id) {
        return await this.partnerRepository.delete(id);
    }
}

module.exports = PartnerService;
