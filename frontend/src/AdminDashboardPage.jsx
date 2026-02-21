import React, { useState, useEffect } from 'react';
import api from './api';
import {
    LayoutDashboard, Users, ClipboardList, ShieldCheck, History,
    ArrowUpCircle, CheckCircle, Settings, Mail, Send, ToggleRight, FileText,
    Plus, Trash2, Edit2, Key, Shield
} from 'lucide-react';
import ModalConfirm from './ModalConfirm';
import Modal from './Modal';
import { format } from 'date-fns';
import { generateReportPDF } from './ReportGenerator';

const AdminDashboardPage = () => {
    const [activeTab, setActiveTab] = useState(localStorage.getItem('adminActiveTab') || 'servicos');
    const [sellers, setSellers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [commissions, setCommissions] = useState([]);

    const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1);
    const [statsYear, setStatsYear] = useState(new Date().getFullYear());

    // Modals
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [sellerOrders, setSellerOrders] = useState([]);
    const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [commissionSeller, setCommissionSeller] = useState('all');
    const [reportSeller, setReportSeller] = useState('all');
    const [adminReports, setAdminReports] = useState([]);

    const [isExtraCommissionModalOpen, setIsExtraCommissionModalOpen] = useState(false);
    const [extraCommissionForm, setExtraCommissionForm] = useState({ seller_id: '', description: '', type: 'Comissão', value: '', date: format(new Date(), 'yyyy-MM-dd') });

    // New User CRUD States
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'Operador', profit_percentage: 0 });
    const [targetUser, setTargetUser] = useState(null);

    const availableScreens = [
        { id: 'admin', label: 'Painel Administrativo' },
        { id: 'clients', label: 'Clientes' },
        { id: 'products', label: 'Produtos' },
        { id: 'partners', label: 'PJ Colaboradoras' },
        { id: 'contracts', label: 'Contratos' },
        { id: 'sales', label: 'Vendas Avulsas' },
        { id: 'inventory', label: 'Estoque' },
        { id: 'commissions', label: 'Comissões' },
        { id: 'service-orders', label: 'Ordens de Serviço' },
        { id: 'reports', label: 'Relatórios' },
        { id: 'finance', label: 'Financeiro' },
        { id: 'bills', label: 'Contas a Pagar' }
    ];

    useEffect(() => {
        localStorage.setItem('adminActiveTab', activeTab);
        fetchData();
    }, [activeTab, statsMonth, statsYear, commissionSeller, reportSeller]);

    const fetchData = async () => {
        try {
            // Log de teste para verificar conectividade admin
            api.get('/admin/test').then(r => console.log("Admin Test:", r.data)).catch(e => console.warn("Admin Test failed:", e.message));

            let currentSellers = sellers;
            // Always fetch sellers to keep lists updated
            const { data: sData } = await api.get('/admin/sellers-stats');
            setSellers(sData);
            currentSellers = sData;

            if (activeTab === 'dashboard') {
                const { data } = await api.get(`/admin/dashboard-stats?month=${statsMonth}&year=${statsYear}`);
                setDashStats(data);
            } else if (activeTab === 'servicos') {
                // already fetched sellers
            } else if (activeTab === 'logs') {
                const { data } = await api.get('/admin/logs');
                setLogs(data);
            } else if (activeTab === 'operadores') {
                const { data } = await api.get('/admin/users');
                setUsers(data);
            } else if (activeTab === 'comissoes') {
                const sellerParam = commissionSeller !== 'all' ? `&seller_id=${commissionSeller}` : '';
                const { data } = await api.get(`/commissions?month=${statsMonth}&year=${statsYear}${sellerParam}`);
                setCommissions(data);
            } else if (activeTab === 'relatorios') {
                const sellerParam = reportSeller !== 'all' ? `&seller_id=${reportSeller}` : '';
                const { data } = await api.get(`/admin/reports?month=${statsMonth}&year=${statsYear}${sellerParam}`);
                setAdminReports(data);
            }
        } catch (err) {
            console.error("Admin fetchData Error:", err);
        }
    };

    const handleViewPDF = async (report) => {
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
            pdfWindow.document.write('<html><head><title>Gerando PDF...</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;"><div><div style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:30px;height:30px;animation:spin 2s linear infinite;margin:0 auto 10px;"></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>Preparando relatório...</div></body></html>');
        }

        let imageBlobs = [];
        if (report.images && report.images.length > 0) {
            try {
                const imagesArr = typeof report.images === 'string' ? JSON.parse(report.images) : report.images;
                const promises = imagesArr.map(async (url) => {
                    const baseUrl = api.defaults.baseURL.replace('/api', '');
                    const res = await fetch(baseUrl + url, {
                        headers: {
                            'ngrok-skip-browser-warning': 'true'
                        }
                    });
                    const blob = await res.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({ base64: reader.result });
                        reader.readAsDataURL(blob);
                    });
                });
                imageBlobs = await Promise.all(promises);
            } catch (e) {
                console.warn("Could not fetch remote images for PDF", e);
            }
        }

        try {
            const blobUrl = await generateReportPDF(report, imageBlobs);
            if (pdfWindow) {
                pdfWindow.location.href = blobUrl;
            } else {
                window.open(blobUrl, '_blank');
            }
        } catch (err) {
            console.error(err);
            if (pdfWindow) pdfWindow.close();
            alert('Erro ao gerar PDF');
        }
    };

    const handleSellerClick = async (seller) => {
        setSelectedSeller(seller);
        try {
            const { data } = await api.get(`/service-orders?seller_userId=${seller.user_id}`);
            setSellerOrders(data);
            setIsSellerModalOpen(true);
        } catch (err) { console.error(err); }
    };

    const handleSavePermissions = async () => {
        try {
            await api.patch(`/admin/users/${editingUser.id}/permissions`, { permissions: userPermissions });
            setIsPermissionModalOpen(false);
            fetchData();
        } catch (err) { alert("Erro ao salvar permissões"); }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (userForm.id) {
                await api.patch(`/admin/users/${userForm.id}`, userForm);
            } else {
                await api.post('/admin/users', userForm);
            }
            setIsUserModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Erro ao salvar operador: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteUser = async () => {
        try {
            await api.delete(`/admin/users/${targetUser.id}`);
            setIsDeleteUserModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Erro ao excluir operador");
        }
    };

    const handleSaveExtraCommission = async (e) => {
        e.preventDefault();
        try {
            await api.post('/commissions/extra', extraCommissionForm);
            setIsExtraCommissionModalOpen(false);
            setExtraCommissionForm({ seller_id: '', description: '', type: 'Comissão', value: '', date: format(new Date(), 'yyyy-MM-dd') });
            fetchData();
        } catch (err) {
            alert("Erro ao salvar operação: " + (err.response?.data?.error || err.message));
        }
    };


    const renderServicos = () => (
        <div className="table-container card">
            <table>
                <thead>
                    <tr>
                        <th>Vendedor</th>
                        <th>Concl. (Semana)</th>
                        <th>Em Aberto</th>
                        <th>Atrasados</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {sellers.map(s => (
                        <tr key={s.id}>
                            <td data-label="Vendedor" style={{ fontWeight: 600 }}>{s.name}</td>
                            <td data-label="Concl. (Semana)">{s.finished_week}</td>
                            <td data-label="Em Aberto">{s.open_orders}</td>
                            <td data-label="Atrasados" style={{ color: s.delayed_orders > 0 ? '#ef4444' : 'inherit', fontWeight: s.delayed_orders > 0 ? 700 : 400 }}>{s.delayed_orders}</td>
                            <td data-label="Ações"><button onClick={() => handleSellerClick(s)} className="btn-primary" style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }}>Ver Detalhes</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="admin-page">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Painel Administrativo</h2>

            <div className="tabs-container">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {[
                        { id: 'servicos', label: 'Serviços', icon: ClipboardList },
                        { id: 'comissoes', label: 'Comissões', icon: ShieldCheck },
                        { id: 'relatorios', label: 'Relatórios', icon: FileText },
                        { id: 'operadores', label: 'Operadores', icon: Users },
                        { id: 'logs', label: 'Auditoria', icon: History },
                        { id: 'configuracoes', label: 'Configurações', icon: Settings }
                    ].map(TabItem => (
                        <button
                            key={TabItem.id}
                            onClick={() => setActiveTab(TabItem.id)}
                            className={`btn-primary ${activeTab === TabItem.id ? '' : 'btn-outline'}`}
                            style={{
                                backgroundColor: activeTab === TabItem.id ? 'var(--primary)' : 'transparent',
                                color: activeTab === TabItem.id ? 'white' : 'var(--text-muted)',
                                border: `1px solid ${activeTab === TabItem.id ? 'var(--primary)' : 'var(--border)'}`,
                                flex: 1, minWidth: '130px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                padding: '0.75rem'
                            }}
                        >
                            <TabItem.icon size={18} /> <span>{TabItem.label}</span>
                        </button>
                    ))}
                </div>

                <div className="tab-content">
                    {activeTab === 'servicos' && renderServicos()}
                    {activeTab === 'logs' && (
                        <div className="table-container card">
                            <table>
                                <thead>
                                    <tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr>
                                </thead>
                                <tbody>
                                    {logs.map(l => (
                                        <tr key={l.id}>
                                            <td data-label="Data">{format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                            <td data-label="Usuário">{l.user_name}</td>
                                            <td data-label="Ação" style={{ fontWeight: 600 }}>{l.action}</td>
                                            <td data-label="Detalhes" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{l.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'comissoes' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div className="search-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, marginBottom: 0 }}>
                                    <select className="input-field" value={commissionSeller} onChange={e => setCommissionSeller(e.target.value)} style={{ flex: 1 }}>
                                        <option value="all">Todos os Vendedores</option>
                                        {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select className="input-field" value={statsMonth} onChange={e => setStatsMonth(parseInt(e.target.value))} style={{ width: '150px' }}>
                                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                            <option key={i + 1} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                    <input type="number" className="input-field" value={statsYear} onChange={e => setStatsYear(parseInt(e.target.value))} style={{ width: '100px' }} />
                                </div>
                                <button
                                    onClick={() => setIsExtraCommissionModalOpen(true)}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}
                                >
                                    <Plus size={20} /> Operações Avulsas
                                </button>
                            </div>
                            <div className="table-container card">
                                <table>
                                    <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Cliente</th><th>Comissão</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {commissions.map((c, i) => (
                                            <tr key={i}>
                                                <td data-label="Data">{c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-'}</td>
                                                <td data-label="Tipo">
                                                    <span style={{
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '1rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        backgroundColor: c.type === 'Vale' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: c.type === 'Vale' ? '#ef4444' : '#10b981'
                                                    }}>
                                                        {c.type}
                                                    </span>
                                                </td>
                                                <td data-label="Descrição" style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '-'}</td>
                                                <td data-label="Cliente">{c.client}</td>
                                                <td data-label="Comissão" style={{ color: c.commission < 0 ? '#ef4444' : 'inherit', fontWeight: c.commission < 0 ? 700 : 400 }}>
                                                    R$ {parseFloat(c.commission).toFixed(2)}
                                                </td>
                                                <td data-label="Status">{c.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {commissionSeller !== 'all' && (
                                <div className="card" style={{ marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--primary)', color: 'white' }}>
                                    <span style={{ fontWeight: 600 }}>TOTAL LÍQUIDO A PAGAR:</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                        R$ {commissions.reduce((acc, curr) => acc + parseFloat(curr.commission), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'operadores' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Gestão de Operadores</h3>
                                <button
                                    onClick={() => {
                                        setUserForm({ name: '', username: '', password: '', role: 'Operador', profit_percentage: 0 });
                                        setIsUserModalOpen(true);
                                    }}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Plus size={20} /> Adicionar Operador
                                </button>
                            </div>
                            <div className="table-container card">
                                <table>
                                    <thead><tr><th>Nome</th><th>Usuário</th><th>Cargo</th><th style={{ width: '220px', textAlign: 'right' }}>Ações</th></tr></thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td data-label="Nome" style={{ fontWeight: 600 }}>{u.name}</td>
                                                <td data-label="Usuário">{u.username}</td>
                                                <td data-label="Cargo">
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '1rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        backgroundColor: u.role === 'Administrador' ? 'rgba(59, 130, 246, 0.1)' : u.role === 'Vendedor' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                        color: u.role === 'Administrador' ? '#3b82f6' : u.role === 'Vendedor' ? '#10b981' : '#6b7280'
                                                    }}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td data-label="Ações">
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                                        <button
                                                            onClick={() => {
                                                                setUserForm({ ...u, password: '' });
                                                                setIsUserModalOpen(true);
                                                            }}
                                                            className="btn-primary"
                                                            title="Editar"
                                                            style={{ padding: '0.7rem', backgroundColor: 'var(--primary)' }}
                                                        >
                                                            <Edit2 size={24} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(u);
                                                                setUserPermissions(u.permissions || []);
                                                                setIsPermissionModalOpen(true);
                                                            }}
                                                            className="btn-primary"
                                                            title="Permissões"
                                                            style={{ padding: '0.7rem', backgroundColor: '#3b82f6' }}
                                                        >
                                                            <Key size={24} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setTargetUser(u); setIsDeleteUserModalOpen(true); }}
                                                            className="btn-primary"
                                                            title="Excluir"
                                                            style={{ padding: '0.7rem', backgroundColor: '#ef4444' }}
                                                        >
                                                            <Trash2 size={24} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'relatorios' && (
                        <div>
                            <div className="search-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <select className="input-field" value={reportSeller} onChange={e => setReportSeller(e.target.value)} style={{ flex: 1 }}>
                                    <option value="all">Todos os Vendedores</option>
                                    {sellers.map(s => <option key={s.id} value={s.user_id}>{s.name}</option>)}
                                </select>
                                <select className="input-field" value={statsMonth} onChange={e => setStatsMonth(parseInt(e.target.value))} style={{ width: '150px' }}>
                                    {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                        <option key={i + 1} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <input type="number" className="input-field" value={statsYear} onChange={e => setStatsYear(parseInt(e.target.value))} style={{ width: '100px' }} />
                            </div>

                            <div className="table-container card" style={{ marginTop: '1rem' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Cliente</th>
                                            <th>Vendedor</th>
                                            <th>Tipo de Visita</th>
                                            <th style={{ textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminReports.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                                    <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                    <p>Nenhum relatório encontrado para este período.</p>
                                                </td>
                                            </tr>
                                        ) : adminReports.map(report => (
                                            <tr key={report.id}>
                                                <td data-label="Data">{format(new Date(report.created_at), 'dd/MM/yyyy')}</td>
                                                <td data-label="Cliente" style={{ fontWeight: 600 }}>{report.client_name}</td>
                                                <td data-label="Vendedor">{report.seller_name}</td>
                                                <td data-label="Tipo">
                                                    <span style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                        {report.visit_type || 'Chamado Técnico'}
                                                    </span>
                                                </td>
                                                <td data-label="Ações" style={{ textAlign: 'right' }}>
                                                    <button onClick={() => handleViewPDF(report)} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }} title="Visualizar Relatório">
                                                        <FileText size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'configuracoes' && <AdminSettings />}
                </div>
            </div>

            {/* Modal Permissões */}
            <Modal isOpen={isPermissionModalOpen} onClose={() => setIsPermissionModalOpen(false)} title={`Acessos: ${editingUser?.name}`}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {availableScreens.map(screen => (
                        <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={userPermissions.includes(screen.id)}
                                onChange={e => {
                                    if (e.target.checked) setUserPermissions([...userPermissions, screen.id]);
                                    else setUserPermissions(userPermissions.filter(p => p !== screen.id));
                                }}
                            />
                            {screen.label}
                        </label>
                    ))}
                </div>
                <button onClick={handleSavePermissions} className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Salvar Acessos</button>
            </Modal>

            {/* Modal Novo/Editar Operador */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={userForm.id ? 'Editar Operador' : 'Adicionar Operador'}>
                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="label">Nome Completo</label>
                        <input type="text" className="input-field" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="label">Usuário (Login)</label>
                        <input type="text" className="input-field" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required />
                    </div>
                    <div>
                        <label className="label">{userForm.id ? 'Nova Senha (vazio para manter)' : 'Senha'}</label>
                        <input type="password" className="input-field" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required={!userForm.id} />
                    </div>
                    <div>
                        <label className="label">Cargo</label>
                        <select className="input-field" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} required>
                            <option value="Operador">Operador</option>
                            <option value="Vendedor">Vendedor</option>
                            <option value="Administrador">Administrador</option>
                        </select>
                    </div>
                    {userForm.role === 'Vendedor' && (
                        <div>
                            <label className="label">Comissão (% Profit)</label>
                            <input type="number" step="0.01" className="input-field" value={userForm.profit_percentage} onChange={e => setUserForm({ ...userForm, profit_percentage: parseFloat(e.target.value) })} required />
                        </div>
                    )}
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Salvar Operador</button>
                </form>
            </Modal>

            {/* Modal Confirmar Exclusão */}
            <ModalConfirm
                isOpen={isDeleteUserModalOpen}
                onClose={() => setIsDeleteUserModalOpen(false)}
                onConfirm={handleDeleteUser}
                title="Excluir Operador"
                message={`Deseja realmente excluir o operador ${targetUser?.name}? Esta ação não pode ser desfeita.`}
            />

            {/* Modal Operação Avulsa (Comissão/Vale) */}
            <Modal isOpen={isExtraCommissionModalOpen} onClose={() => setIsExtraCommissionModalOpen(false)} title="Nova Operação Avulsa">
                <form onSubmit={handleSaveExtraCommission} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="label">Vendedor</label>
                        <select
                            className="input-field"
                            value={extraCommissionForm.seller_id}
                            onChange={e => setExtraCommissionForm({ ...extraCommissionForm, seller_id: e.target.value })}
                            required
                        >
                            <option value="">Selecione o Vendedor</option>
                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Descrição da Operação</label>
                        <input
                            type="text"
                            className="input-field"
                            value={extraCommissionForm.description}
                            onChange={e => setExtraCommissionForm({ ...extraCommissionForm, description: e.target.value })}
                            placeholder="Ex: Bônus meta atingida ou Vale transporte"
                            required
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">Tipo</label>
                            <select
                                className="input-field"
                                value={extraCommissionForm.type}
                                onChange={e => setExtraCommissionForm({ ...extraCommissionForm, type: e.target.value })}
                                required
                            >
                                <option value="Comissão">Comissão (+)</option>
                                <option value="Vale">Vale (-)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field"
                                value={extraCommissionForm.value}
                                onChange={e => setExtraCommissionForm({ ...extraCommissionForm, value: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Data Referência</label>
                        <input
                            type="date"
                            className="input-field"
                            value={extraCommissionForm.date}
                            onChange={e => setExtraCommissionForm({ ...extraCommissionForm, date: e.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Lançar Operação</button>
                </form>
            </Modal>
        </div>
    );
};

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        smtp_email: '', smtp_password: '', report_email: '',
        auto_billing_enabled: false, auto_expiry_enabled: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/settings').then(res => {
            const data = res.data;
            setSettings({
                smtp_email: data.smtp_email || '',
                smtp_password: data.smtp_password || '',
                report_email: data.report_email || '',
                auto_billing_enabled: !!data.auto_billing_enabled,
                auto_expiry_enabled: !!data.auto_expiry_enabled
            });
            setLoading(false);
        }).catch(err => console.error(err));
    }, []);

    const handleSave = async () => {
        try {
            await api.patch('/admin/settings', settings);
            alert("Configurações salvas com sucesso!");
        } catch (err) { alert("Erro ao salvar configurações"); }
    };

    const triggerBilling = async () => {
        if (!confirm("Deseja disparar emails de cobrança para TODOS os clientes em atraso agora?")) return;
        try {
            const { data } = await api.post('/admin/trigger-billing');
            alert(`${data.count} emails enviados com sucesso!`);
        } catch (err) { alert("Erro ao disparar emails"); }
    };

    const triggerExpiry = async () => {
        const email = prompt("Informe o email para receber o relatório de expiração:", settings.report_email);
        if (!email) return;
        try {
            await api.post('/admin/trigger-expiry-report', { target_email: email });
            alert("Relatório enviado com sucesso!");
        } catch (err) { alert("Erro ao enviar relatório"); }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={20} /> Configuração de E-mail (SMTP)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>E-mail do Servidor</label>
                        <input
                            type="email"
                            className="input-field"
                            value={settings.smtp_email}
                            onChange={e => setSettings({ ...settings, smtp_email: e.target.value })}
                            placeholder="exemplo@gmail.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Senha (ou App Password)</label>
                        <input
                            type="password"
                            className="input-field"
                            value={settings.smtp_password}
                            onChange={e => setSettings({ ...settings, smtp_password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}></p>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ToggleRight size={20} /> Automação e Notificações
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                        <div>
                            <p style={{ fontWeight: 600 }}>Cobrança Automática</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Envia avisos de atraso em horário comercial (40s - 5min de intervalo).</p>
                        </div>
                        <label className="switch">
                            <input type="checkbox" checked={settings.auto_billing_enabled} onChange={e => setSettings({ ...settings, auto_billing_enabled: e.target.checked })} />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                        <div>
                            <p style={{ fontWeight: 600 }}>Relatório de Expiração Semanal</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Envia um email toda segunda-feira com contratos que vencem na semana.</p>
                        </div>
                        <label className="switch">
                            <input type="checkbox" checked={settings.auto_expiry_enabled} onChange={e => setSettings({ ...settings, auto_expiry_enabled: e.target.checked })} />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>E-mail que recebe relatórios de expiração</label>
                        <input
                            type="email"
                            className="input-field"
                            value={settings.report_email}
                            onChange={e => setSettings({ ...settings, report_email: e.target.value })}
                            placeholder="admin@unisis.com"
                        />
                    </div>
                </div>
            </div>

            <div className="admin-actions-container">
                <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>
                    Salvar Todas as Configurações
                </button>
                <button onClick={triggerBilling} className="btn-primary" style={{ backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <Send size={18} /> Disparar Cobranças Agora
                </button>
                <button onClick={triggerExpiry} className="btn-primary" style={{ backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <Mail size={18} /> Relatório de Expiração
                </button>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
