import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import AuthService from './services/AuthService';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                const data = await AuthService.login(username, password);
                login(data.user, data.token);
            } else {
                await AuthService.register(name, username, password);
                const data = await AuthService.login(username, password);
                login(data.user, data.token);
            }
            navigate('/clients');
        } catch (err) {
            alert(err.response?.data?.error || 'Erro na autenticação');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>Entre para acessar o UniSis</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Nome de Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        className="input-field"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                        {isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                    {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', color: 'var(--primary)', fontWeight: 600, border: 'none', padding: 0 }}
                    >
                        {isLogin ? 'Criar agora' : 'Fazer login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
