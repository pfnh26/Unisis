import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Users, Box, TrendingUp, LogOut, ShieldCheck, Briefcase,
    FileSignature, Sun, Moon, ClipboardList, LayoutDashboard,
    CreditCard, Menu, X, Bell, FileText
} from 'lucide-react';
import { useAuth } from './AuthContext';
import api from './api';
import Modal from './Modal';

const Sidebar = () => {
    const { user, logout, theme, toggleTheme } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [notifications, setNotifications] = useState({ overdue: [], expiring: [], billsToday: [], billsOverdue: [], servicesOverdue: [], servicesToday: [] });
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const fetchData = async () => {
        try {
            const { data } = await api.get('/notifications/summary');
            setNotifications(data);
        } catch (err) { console.error(err); }
    };

    React.useEffect(() => {
        if (user) {
            fetchData();
            const interval = setInterval(fetchData, 60000 * 5); // 5 min
            return () => clearInterval(interval);
        }
    }, [user]);

    const isAdmin = user?.role === 'Administrador';
    const perms = user?.permissions || [];

    const toggleSidebar = () => setIsMobileOpen(!isMobileOpen);
    const closeSidebar = () => setIsMobileOpen(false);

    // Swipe logic for mobile
    React.useEffect(() => {
        let touchStart = 0;
        let touchEnd = 0;

        const handleTouchStart = (e) => {
            touchStart = e.targetTouches[0].clientX;
        };

        const handleTouchMove = (e) => {
            touchEnd = e.targetTouches[0].clientX;
        };

        const handleTouchEnd = () => {
            if (touchStart < 50 && touchEnd - touchStart > 70) {
                setIsMobileOpen(true);
            }
            if (isMobileOpen && touchStart - touchEnd > 70) {
                setIsMobileOpen(false);
            }
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isMobileOpen]);

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true, id: 'admin' },
        { to: '/clients', icon: Users, label: 'Clientes', id: 'clients' },
        { to: '/products', icon: Box, label: 'Produtos', id: 'products' },
        { to: '/partners', icon: Briefcase, label: 'PJ Prestador', id: 'partners' },
        { to: '/contracts', icon: FileSignature, label: 'Contratos', id: 'contracts' },
        { to: '/sales', icon: TrendingUp, label: 'Vendas Avulsas', id: 'sales' },
        { to: '/inventory', icon: Box, label: 'Estoque', id: 'inventory' },
        { to: '/finance', icon: CreditCard, label: 'Financeiro', id: 'finance' },
        { to: '/bills', icon: ClipboardList, label: 'Contas a Pagar', id: 'bills' },
        { to: '/invoices', icon: FileText, label: 'Notas', id: 'invoices' },
    ];

    const totalNotifications = Object.values(notifications).reduce((acc, curr) => acc + (curr?.length || 0), 0);

    return (
        <>
            {/* MOBILE HEADER */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-main)' }}>
                        <Menu size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>UniSis</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => setIsNotifOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', position: 'relative' }}>
                        <Bell size={20} />
                        {totalNotifications > 0 && (
                            <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {totalNotifications}
                            </span>
                        )}
                    </button>
                    <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                </div>
            </header>

            {/* OVERLAY */}
            <div className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`} onClick={closeSidebar} />

            <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
                <div className="desktop-only" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>UniSis</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Módulo: {user?.role}</p>
                    </div>
                    <button onClick={closeSidebar} className="mobile-only" style={{ background: 'none', border: 'none', display: 'none' }}>
                        <X size={24} />
                    </button>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setIsNotifOpen(true)} className="desktop-only" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', position: 'relative' }}>
                            <Bell size={20} />
                            {totalNotifications > 0 && (
                                <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {totalNotifications}
                                </span>
                            )}
                        </button>
                        <button onClick={toggleTheme} className="desktop-only" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                    {navItems.map(item => (isAdmin || perms.includes(item.id)) && (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            <item.icon size={20} /> {item.label}
                        </NavLink>
                    ))}

                    {(isAdmin || perms.includes('commissions')) && user?.role === 'Vendedor' && (
                        <NavLink to="/commissions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            <ShieldCheck size={20} /> Comissões
                        </NavLink>
                    )}

                    {(isAdmin || perms.includes('service-orders')) && user?.role === 'Vendedor' && (
                        <NavLink to="/service-orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            <ClipboardList size={20} /> Ordens de Serviço
                        </NavLink>
                    )}

                    {(isAdmin || perms.includes('reports')) && (
                        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            <FileSignature size={20} /> Relatórios
                        </NavLink>
                    )}

                    {(isAdmin || perms.includes('admin')) && (
                        <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            <ShieldCheck size={20} /> Administração
                        </NavLink>
                    )}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.username}</p>
                    </div>
                    <button onClick={() => { logout(); closeSidebar(); }} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', color: '#ef4444' }}>
                        <LogOut size={20} /> Sair
                    </button>
                </div>
            </aside>

            <Modal
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                title="Notificações"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {totalNotifications === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma notificação importante.</p>
                    ) : (
                        <>
                            {notifications.billsToday?.length > 0 && (
                                <section>
                                    <h3 className="notif-title" style={{ color: '#3b82f6' }}>Contas que Vencem Hoje</h3>
                                    {notifications.billsToday.map((n, i) => (
                                        <div key={i} className="notif-item">
                                            <strong>{n.description}</strong>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {notifications.billsOverdue?.length > 0 && (
                                <section>
                                    <h3 className="notif-title" style={{ color: '#ef4444' }}>Contas Atrasadas</h3>
                                    {notifications.billsOverdue.map((n, i) => (
                                        <div key={i} className="notif-item">
                                            <strong style={{ color: '#ef4444' }}>{n.description}</strong>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {notifications.overdue?.length > 0 && (
                                <section>
                                    <h3 className="notif-title" style={{ color: '#ef4444' }}>Mensalidades em Atraso</h3>
                                    {notifications.overdue.map((n, i) => (
                                        <div key={i} className="notif-item">
                                            <strong>{n.client_name}</strong>
                                            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Vencimento: {new Date(n.dueDate).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {notifications.servicesToday?.length > 0 && (
                                <section>
                                    <h3 className="notif-title" style={{ color: '#10b981' }}>Serviços para Hoje</h3>
                                    {notifications.servicesToday.map((n, i) => (
                                        <div key={i} className="notif-item">
                                            <strong>{n.company_name}</strong>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {notifications.servicesOverdue?.length > 0 && (
                                <section>
                                    <h3 className="notif-title" style={{ color: '#ef4444' }}>Serviços Atrasados</h3>
                                    {notifications.servicesOverdue.map((n, i) => (
                                        <div key={i} className="notif-item">
                                            <strong>{n.company_name}</strong>
                                            {n.seller_name && <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Responsável: {n.seller_name}</p>}
                                        </div>
                                    ))}
                                </section>
                            )}

                            {notifications.expiring?.length > 0 && (
                                <section>
                                    <h3 className="notif-title" style={{ color: '#f59e0b' }}>Contratos Expirando (30 dias)</h3>
                                    {notifications.expiring.map((n, i) => (
                                        <div key={i} className="notif-item">
                                            <strong>{n.client_name}</strong>
                                            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Tipo: {n.contract_type}</p>
                                        </div>
                                    ))}
                                </section>
                            )}
                        </>
                    )}
                </div>
            </Modal>

            <style>{`
                .notif-title {
                    font-size: 0.85rem;
                    margin-bottom: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .notif-item {
                    padding: 0.85rem;
                    border: 1px solid var(--border);
                    border-radius: 0.6rem;
                    margin-bottom: 0.6rem;
                    font-size: 0.875rem;
                    background-color: var(--card-bg);
                    transition: all 0.2s ease;
                }
                .notif-item:hover {
                    border-color: var(--primary);
                    background-color: var(--hover-bg);
                }
            `}</style>
        </>
    );
};

export default Sidebar;
