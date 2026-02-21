import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import { Search, Plus, Trash2, Edit2, CheckCircle, Calendar, Filter, X, Barcode, Copy } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import { format, isPast, isToday, parseISO } from 'date-fns';

const BillsPayablePage = () => {
    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState({
        overdue: false,
        upcoming: false,
        startDate: '',
        endDate: ''
    });

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false);

    // Data states
    const [newBill, setNewBill] = useState({
        description: '',
        category: '',
        value: '',
        due_date: '',
        recurrence: 'Nenhuma',
        barcode: '',
        numeric_code: ''
    });
    const [editingBill, setEditingBill] = useState(null);
    const [targetBill, setTargetBill] = useState(null);
    const [showingBoleto, setShowingBoleto] = useState(null);

    const fetchBills = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.overdue) params.overdue = true;
            if (filters.upcoming) params.upcoming = true;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const { data } = await api.get('/bills', { params });
            setBills(data);
        } catch (err) {
            console.error('Erro ao buscar contas:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/bills', newBill);
            setIsAddModalOpen(false);
            setNewBill({ description: '', category: '', value: '', due_date: '', recurrence: 'Nenhuma' });
            fetchBills();
        } catch (err) {
            alert('Erro ao criar conta');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/bills/${editingBill.id}`, editingBill);
            setIsEditModalOpen(false);
            setEditingBill(null);
            fetchBills();
        } catch (err) {
            alert('Erro ao atualizar conta');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/bills/${targetBill.id}`);
            setIsDeleteModalOpen(false);
            fetchBills();
        } catch (err) {
            alert('Erro ao excluir conta');
        }
    };

    const handlePay = async (id) => {
        try {
            await api.post(`/bills/${id}/pay`);
            fetchBills();
        } catch (err) {
            alert('Erro ao confirmar pagamento');
        }
    };

    const getStatusLabel = (bill) => {
        if (bill.status === 'Pago') return { label: 'Pago', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
        const dueDate = parseISO(bill.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) return { label: 'Atrasado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
        return { label: 'Em Dia', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Contas a Pagar</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                    <Plus size={18} /> Adicionar conta
                </button>
            </div>

            {/* FILTROS COMPACTOS */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                                type="checkbox"
                                checked={filters.overdue}
                                onChange={e => setFilters({ ...filters, overdue: e.target.checked, upcoming: false })}
                            />
                            Vencidas
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                                type="checkbox"
                                checked={filters.upcoming}
                                onChange={e => setFilters({ ...filters, upcoming: e.target.checked, overdue: false })}
                            />
                            A Vencer
                        </label>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        flex: 1,
                        justifyContent: 'flex-start'
                    }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="date"
                                className="input-field"
                                style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                                value={filters.startDate}
                                title="Data Início"
                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                            <input
                                type="date"
                                className="input-field"
                                style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                                value={filters.endDate}
                                title="Data Fim"
                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: 'var(--border)',
                                color: 'var(--text-main)',
                                minWidth: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.85rem'
                            }}
                            onClick={() => setFilters({ overdue: false, upcoming: false, startDate: '', endDate: '' })}
                        >
                            <X size={16} /> <span>Limpar Filtros</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                            <th>Vencimento</th>
                            <th>Recorrência</th>
                            <th>Status</th>
                            <th style={{ width: '150px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</td></tr>
                        ) : bills.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Nenhuma conta encontrada.</td></tr>
                        ) : bills.map(bill => {
                            const status = getStatusLabel(bill);
                            return (
                                <tr key={bill.id}>
                                    <td data-label="Descrição" style={{ fontWeight: 600 }}>
                                        <div className="client-name-card">{bill.description}</div>
                                    </td>
                                    <td data-label="Categoria">{bill.category}</td>
                                    <td data-label="Valor">R$ {parseFloat(bill.value).toFixed(2)}</td>
                                    <td data-label="Vencimento">{format(parseISO(bill.due_date), 'dd/MM/yyyy')}</td>
                                    <td data-label="Recorrência">{bill.recurrence}</td>
                                    <td data-label="Status">
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            backgroundColor: status.bg,
                                            color: status.color
                                        }}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td data-label="Ações">
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {(bill.barcode || bill.numeric_code) && (
                                                <button
                                                    onClick={() => { setShowingBoleto(bill); setIsBoletoModalOpen(true); }}
                                                    className="btn-primary"
                                                    title="Ver Código de Barras"
                                                    style={{ padding: '0.6rem', backgroundColor: '#6366f1' }}
                                                >
                                                    <Barcode size={20} />
                                                </button>
                                            )}
                                            {bill.status === 'Pendente' && (
                                                <button
                                                    onClick={() => handlePay(bill.id)}
                                                    className="btn-primary"
                                                    title="Confirmar Pagamento"
                                                    style={{ padding: '0.6rem', backgroundColor: '#10b981' }}
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { setEditingBill(bill); setIsEditModalOpen(true); }}
                                                className="btn-primary"
                                                title="Editar"
                                                style={{ padding: '0.6rem', backgroundColor: 'var(--primary)' }}
                                            >
                                                <Edit2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => { setTargetBill(bill); setIsDeleteModalOpen(true); }}
                                                className="btn-primary"
                                                title="Excluir"
                                                style={{ padding: '0.6rem', backgroundColor: '#ef4444' }}
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL BOLETO */}
            <Modal isOpen={isBoletoModalOpen} onClose={() => setIsBoletoModalOpen(false)} title="Dados do Boleto / Duplicata">
                {showingBoleto && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'center', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <img
                                src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${showingBoleto.barcode || showingBoleto.numeric_code || '000'}&scale=3&rotate=N&includetext`}
                                alt="Barcode"
                                style={{ width: '100%', height: 'auto', maxHeight: '100px', objectFit: 'contain' }}
                            />
                        </div>
                        <div>
                            <label className="label">Linha Digitável / Código Escrito</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="input-field" readOnly value={showingBoleto.numeric_code || 'Não informado'} style={{ fontSize: '0.8rem' }} />
                                <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(showingBoleto.numeric_code); alert('Copiado!'); }} style={{ padding: '0.5rem' }}>
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="label">Código de Barras</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="input-field" readOnly value={showingBoleto.barcode || 'Não informado'} style={{ fontSize: '0.8rem' }} />
                                <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(showingBoleto.barcode); alert('Copiado!'); }} style={{ padding: '0.5rem' }}>
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vencimento</p>
                                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{format(parseISO(showingBoleto.due_date), 'dd/MM/yyyy')}</p>
                            </div>
                            <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor</p>
                                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>R$ {parseFloat(showingBoleto.value).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL ADICIONAR */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Conta">
                <form onSubmit={handleCreate} className="responsive-form-grid">
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Descrição da conta</label>
                        <input
                            className="input-field"
                            value={newBill.description}
                            onChange={e => setNewBill({ ...newBill, description: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Categoria</label>
                        <input
                            className="input-field"
                            value={newBill.category}
                            onChange={e => setNewBill({ ...newBill, category: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label">Valor</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={newBill.value}
                            onChange={e => setNewBill({ ...newBill, value: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Data de vencimento</label>
                        <input
                            type="date"
                            className="input-field"
                            value={newBill.due_date}
                            onChange={e => setNewBill({ ...newBill, due_date: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Recorrência</label>
                        <select
                            className="input-field"
                            value={newBill.recurrence}
                            onChange={e => setNewBill({ ...newBill, recurrence: e.target.value })}
                        >
                            <option value="Nenhuma">Nenhuma</option>
                            <option value="Semanal">Semanal</option>
                            <option value="Mensal">Mensal</option>
                            <option value="Anual">Anual</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Salvar Conta</button>
                </form>
            </Modal>

            {/* MODAL EDITAR */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Conta">
                {editingBill && (
                    <form onSubmit={handleUpdate} className="responsive-form-grid">
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Descrição da conta</label>
                            <input
                                className="input-field"
                                value={editingBill.description}
                                onChange={e => setEditingBill({ ...editingBill, description: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Categoria</label>
                            <input
                                className="input-field"
                                value={editingBill.category}
                                onChange={e => setEditingBill({ ...editingBill, category: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Valor</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field"
                                value={editingBill.value}
                                onChange={e => setEditingBill({ ...editingBill, value: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Data de vencimento</label>
                            <input
                                type="date"
                                className="input-field"
                                value={editingBill.due_date ? editingBill.due_date.split('T')[0] : ''}
                                onChange={e => setEditingBill({ ...editingBill, due_date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Recorrência</label>
                            <select
                                className="input-field"
                                value={editingBill.recurrence}
                                onChange={e => setEditingBill({ ...editingBill, recurrence: e.target.value })}
                            >
                                <option value="Nenhuma">Nenhuma</option>
                                <option value="Semanal">Semanal</option>
                                <option value="Mensal">Mensal</option>
                                <option value="Anual">Anual</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Salvar Alterações</button>
                    </form>
                )}
            </Modal>

            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Conta"
                message={`Tem certeza que deseja excluir a conta "${targetBill?.description}"?`}
            />
        </div>
    );
};

export default BillsPayablePage;
