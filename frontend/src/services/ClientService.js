import api from '../api';

class ClientService {
    async getClients(search = '') {
        const { data } = await api.get(`/clients?search=${search}`);
        return data;
    }

    async createClient(clientData) {
        const { data } = await api.post('/clients', clientData);
        return data;
    }

    async updateClient(id, updates) {
        const { data } = await api.patch(`/clients/${id}`, updates);
        return data;
    }

    async deleteClient(id) {
        await api.delete(`/clients/${id}`);
    }

    async getByCnpj(cnpj) {
        const { data } = await api.get(`/cnpj/${cnpj}`);
        return data;
    }
}

export default new ClientService();
