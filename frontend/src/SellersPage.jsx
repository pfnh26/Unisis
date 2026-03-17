import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import { Search, Plus, Trash2, Edit2, Key } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';

const SellersPage = () => {
    const [sellers, setSellers] = useState([]);
    const [search, setSearch] = useState('');

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [targetSeller, setTargetSeller] = useState(null);
    const [editingSeller, setEditingSeller] = useState(null);
    const [newSeller, setNewSeller] = useState({ name: '', username: '', password: '', profit_percentage: 0 });

    const fetchSellers = useCallback(async () => {
        try {
            const { data } = await api.get(`/sellers?search=${search}`);
            setSellers(data);
        } catch (err) {
            console.error(err);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(fetchSellers, 500);
        return () => clearTimeout(timer);
    }, [fetchSellers]);

    const handleAddSeller = async (e) => {
        e.preventDefault();
        try {
            await api.post('/sellers', newSeller);
            setIsAddModalOpen(false);
            setNewSeller({ name: '', username: '', password: '', profit_percentage: 0 });
            fetchSellers();
        } catch (err) {
            alert("Erro ao criar vendedor: " + (err.response?.data?.error || "Verifique os dados"));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { id, created_at, user_id, ...updates } = editingSeller;
            await api.patch(`/sellers/${id}`, updates);
            setIsEditModalOpen(false);
            setEditingSeller(null);
            fetchSellers();
        } catch (err) {
            alert("Erro ao atualizar vendedor");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/sellers/${targetSeller.id}`);
            setIsDeleteModalOpen(false);
            fetchSellers();
        } catch (err) {
            alert("Erro ao excluir");
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cadastro de Vendedores</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                    <Plus size={18} /> Novo Vendedor
                </button>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar por nome..."
                        style={{ paddingLeft: '3rem' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>% Comissão</th>
                            <th style={{ width: '100px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sellers.map(seller => (
                            <tr key={seller.id}>
                                <td data-label="Nome" style={{ fontWeight: 600 }}>{seller.name}</td>
                                <td data-label="% Comissão">{seller.profit_percentage}%</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => { setEditingSeller(seller); setIsEditModalOpen(true); }}
                                            className="btn-primary" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }}
                                        >
                                            <Edit2 size={24} />
                                        </button>
                                        <button
                                            onClick={() => { setTargetSeller(seller); setIsDeleteModalOpen(true); }}
                                            className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#ef4444' }}
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

            {/* MODAL ADICIONAR */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Vendedor">
                <form onSubmit={handleAddSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome Completo</label>
                    <input className="input-field" placeholder="Nome Completo" value={newSeller.name} onChange={e => setNewSeller({ ...newSeller, name: e.target.value })} required />
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome de Usuário</label>
                    <input className="input-field" placeholder="Nome de Usuário" value={newSeller.username} onChange={e => setNewSeller({ ...newSeller, username: e.target.value })} required />
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Senha de Acesso</label>
                    <input type="password" className="input-field" placeholder="Senha" value={newSeller.password} onChange={e => setNewSeller({ ...newSeller, password: e.target.value })} required />
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>% de Comissão</label>
                    <input type="number" step="0.1" className="input-field" value={newSeller.profit_percentage} onChange={e => setNewSeller({ ...newSeller, profit_percentage: parseFloat(e.target.value) })} required />
                    <button type="submit" className="btn-primary">Criar Vendedor</button>
                </form>
            </Modal>

            {/* MODAL EDITAR */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editando: ${editingSeller?.name}`}>
                {editingSeller && (
                    <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome do Vendedor</label>
                        <input className="input-field" value={editingSeller.name} onChange={e => setEditingSeller({ ...editingSeller, name: e.target.value })} required />

                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>% de Comissão</label>
                        <input type="number" step="0.1" className="input-field" value={editingSeller.profit_percentage} onChange={e => setEditingSeller({ ...editingSeller, profit_percentage: parseFloat(e.target.value) })} required />

                        <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Salvar Alterações</button>
                    </form>
                )}
            </Modal>
            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Vendedor"
                message={`Deseja excluir o vendedor ${targetSeller?.name}? A conta de acesso será removida.`}
            />
        </div>
    );
};

export default SellersPage;
