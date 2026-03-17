import React, { useState, useEffect } from 'react';
import api from './api';
import {
    Users, CheckCircle, ArrowUpCircle, ShieldCheck,
    TrendingUp, Calendar, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardPage = () => {
    const [stats, setStats] = useState({ activeClients: 0, osFinishedWeek: 0, totalRevenue: 0, totalCommissions: 0, totalExpenses: 0 });
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/dashboard-stats?month=${month}&year=${year}`);
            setStats(data);
        } catch (err) {
            console.error("Erro ao buscar estatísticas", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [month, year]);

    return (
        <div className="dashboard-page">
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard Executivo</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Visão geral do sistema e indicadores de performance.</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Calendar size={18} color="var(--text-muted)" />
                    <select
                        className="input-field"
                        style={{ width: '140px', padding: '0.5rem' }}
                        value={month}
                        onChange={e => setMonth(parseInt(e.target.value))}
                    >
                        {monthNames.map((name, i) => (
                            <option key={i + 1} value={i + 1}>{name}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        className="input-field"
                        style={{ width: '90px', padding: '0.5rem' }}
                        value={year}
                        onChange={e => setYear(parseInt(e.target.value))}
                    />
                </div>
            </div>

            <div className="stats-grid">
                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '1rem' }}>
                        <Users size={32} color="var(--primary)" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>CLIENTES ATIVOS</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.activeClients}</h3>
                    </div>
                </div>

                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '1rem' }}>
                        <CheckCircle size={32} color="#10b981" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>OS FEITAS (SEMANA)</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.osFinishedWeek}</h3>
                    </div>
                </div>

                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '1rem' }}>
                        <ArrowUpCircle size={32} color="#3b82f6" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>FATURAMENTO</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem' }}>
                        <AlertCircle size={32} color="#ef4444" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>OS ATRASADAS</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.osDelayedWeek}</h3>
                    </div>
                </div>

                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '1rem' }}>
                        <ShieldCheck size={32} color="#f59e0b" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>COMISSÕES TOTAIS</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>R$ {stats.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="card dashboard-stat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem' }}>
                        <AlertCircle size={32} color="#ef4444" />
                    </div>
                    <div>
                        <p className="label" style={{ marginBottom: 0, fontSize: '0.7rem' }}>DESPESAS PAGAS</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', minHeight: '300px', border: '2px dashed var(--border)', background: 'transparent' }}>
                    <TrendingUp size={48} color="var(--border)" />
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Gráficos de evolução em breve...</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
