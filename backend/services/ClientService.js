class ClientService {
    constructor(clientRepository) {
        this.clientRepository = clientRepository;
    }

    async getAllClients(search = null, user = null) {
        if (user && user.role === 'Vendedor') {
            return await this.clientRepository.findAssignedToSeller(user.userId || user.id);
        }
        if (search) {
            return await this.clientRepository.search(search);
        }
        return await this.clientRepository.findAll({ orderBy: 'name ASC' });
    }

    async createClient(clientData) {
        return await this.clientRepository.create(clientData);
    }

    async updateClient(id, updates) {
        return await this.clientRepository.update(id, updates);
    }

    async deleteClient(id) {
        return await this.clientRepository.delete(id);
    }
}

module.exports = ClientService;
