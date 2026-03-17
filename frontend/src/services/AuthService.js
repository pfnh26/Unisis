import api from '../api';

class AuthService {
    async login(username, password) {
        const { data } = await api.post('/auth/login', { username, password });
        return data;
    }

    async register(name, username, password) {
        const { data } = await api.post('/auth/register', { name, username, password });
        return data;
    }
}

export default new AuthService();
