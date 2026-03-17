const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.JWT_SECRET = process.env.JWT_SECRET || 'unisis_secret';
    }

    async register(name, username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return await this.userRepository.register(name, username, hashedPassword);
    }

    async login(username, password) {
        const user = await this.userRepository.findByUsername(username);
        if (!user) {
            throw new Error("User not found");
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            throw new Error("Invalid password");
        }

        const token = jwt.sign(
            { id: user.id, userId: user.id, role: user.role, permissions: user.permissions },
            this.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                permissions: user.permissions
            }
        };
    }
}

module.exports = AuthService;
