import React, { useState, useEffect } from 'react';
import api from './api';
import { TrendingUp, DollarSign, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';

const CommissionsPage = () => {
    const { user } = useAuth();
    const [commissions, setCommissions] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState('');

    useEffect(() => {
        if (user?.role !== 'Vendedor') {
            api.get('/sellers').then(res => setSellers(res.data));
        }
    }, [user]);

    const fetchCommissions = async () => {
        try {
            const params = { month, year };
            if (selectedSeller) params.seller_id = selectedSeller;
            const res = await api.get('/commissions', { params });
            setCommissions(res.data);
        } catch (err) { alert("Erro ao buscar comissões"); }
    };

    useEffect(() => { fetchCommissions(); }, [month, year, selectedSeller]);

    const totalComm = commissions.reduce((acc, curr) => acc + parseFloat(curr.commission), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Minhas Comissões</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {user?.role !== 'Vendedor' && (
                        <select className="input-field" value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)}>
                            <option value="">Todos os Vendedores</option>
                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                    <select className="input-field" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select className="input-field" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '1rem' }}>
                        <DollarSign size={32} color="var(--primary)" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>COMISSÕES NO PERÍODO</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>R$ {totalComm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Cliente</th>
                            <th>Comissão</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commissions.map((c, i) => (
                            <tr key={i}>
                                <td data-label="Data">{c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-'}</td>
                                <td data-label="Tipo">{c.type}</td>
                                <td data-label="Cliente">{c.client}</td>
                                <td data-label="Comissão">R$ {parseFloat(c.commission).toFixed(2)}</td>
                                <td data-label="Status">
                                    <span style={{
                                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem',
                                        backgroundColor: c.status === 'Comissionado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: c.status === 'Comissionado' ? '#10b981' : '#ef4444'
                                    }}>
                                        {c.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {commissions.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum faturamento registrado para este período.</td></tr>}
                    </tbody>
                </table>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                * Comissões são faturadas e pagas até o dia 10 de cada mês.
            </p>
        </div>
    );
};

export default CommissionsPage;
