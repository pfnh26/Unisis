class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    async register(req, res) {
        const { name, username, password } = req.body;
        try {
            const user = await this.authService.register(name, username, password);
            res.status(201).json(user);
        } catch (err) {
            res.status(400).json({ error: "Username already exists or invalid data" });
        }
    }

    async login(req, res) {
        const { username, password } = req.body;
        try {
            const data = await this.authService.login(username, password);
            res.json(data);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = AuthController;
