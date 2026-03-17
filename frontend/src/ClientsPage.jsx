import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import { Search, Plus, Trash2, Building2, User, Edit2 } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import ClientQuickAddModal from './ClientQuickAddModal';

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [targetClient, setTargetClient] = useState(null);
    const [editingClient, setEditingClient] = useState(null);

    // Helper to format date for input (yyyy-MM-dd)
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        // If already ISO yyyy-MM-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        // If dd/MM/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
            const [day, month, year] = dateString.split('/');
            return `${year}-${month}-${day}`;
        }
        // Try Date parse
        const date = new Date(dateString);
        if (!isNaN(date)) return date.toISOString().split('T')[0];

        return '';
    };

    const fetchClients = useCallback(async () => {
        try {
            const { data } = await api.get('/clients', { params: { search } });
            setClients(data);
        } catch (err) {
            console.error(err);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(fetchClients, 500);
        return () => clearTimeout(timer);
    }, [fetchClients]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { id, created_at, ...updates } = editingClient;

            const dataObj = {
                ...(editingClient.data || {}),
                nome: editingClient.name,
                fantasia: editingClient.fantasy_name,
                cnpj: editingClient.cnpj,
                cpf: editingClient.cpf,
                email: editingClient.email,
                telefone: editingClient.phone,
                capital_social: editingClient.capital_social,
                abertura: editingClient.abertura,
                situacao: editingClient.situacao,
                data_situacao: editingClient.data_situacao,
                motivo_situacao: editingClient.motivo_situacao,
                status: editingClient.status,
                ultima_atualizacao: editingClient.ultima_atualizacao,
                atividade_principal: [{ code: editingClient.atividade_principal_code, text: editingClient.atividade_principal_text }],
                atividades_secundarias: (editingClient.atividades_secundarias_text || '').split('\n').filter(line => line.trim() !== '').map(line => ({ text: line.trim() })),
                logradouro: editingClient.logradouro,
                numero: editingClient.numero,
                complemento: editingClient.complemento,
                bairro: editingClient.bairro,
                municipio: editingClient.municipio,
                uf: editingClient.uf,
                cep: editingClient.cep
            };

            const updatedData = {
                ...editingClient,
                address: `${editingClient.logradouro}, ${editingClient.numero}${editingClient.complemento ? ` - ${editingClient.complemento}` : ''} - ${editingClient.bairro}, ${editingClient.municipio}/${editingClient.uf}`,
                data: dataObj
            };

            // Remove virtual fields from updates to avoid backend errors
            const fieldsToRemove = [
                'fantasy_name', 'capital_social', 'abertura', 'situacao', 'data_situacao', 'motivo_situacao',
                'atividade_principal_code', 'atividade_principal_text', 'atividades_secundarias_text',
                'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'cep', 'status', 'ultima_atualizacao'
            ];
            fieldsToRemove.forEach(field => delete updates[field]);

            await api.patch(`/clients/${id}`, { ...updates, address: updatedData.address, data: dataObj });
            setIsEditModalOpen(false);
            setEditingClient(null);
            fetchClients();
        } catch (err) {
            console.error("Erro update:", err);
            alert("Erro ao atualizar cadastro");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/clients/${targetClient.id}`);
            setIsDeleteModalOpen(false);
            fetchClients();
        } catch (err) {
            alert("Erro ao excluir");
        }
    };

    const openEditModal = (client) => {
        const cData = client.data || {};
        const ativPrinc = (cData.atividade_principal && cData.atividade_principal[0]) || { code: '', text: '' };
        const ativSec = (cData.atividades_secundarias || []).map(a => a.text).join('\n');

        setEditingClient({
            ...client,
            fantasy_name: cData.fantasia || '',
            capital_social: cData.capital_social || '',
            abertura: formatDateForInput(cData.abertura) || '',
            situacao: cData.situacao || 'Ativa',
            data_situacao: formatDateForInput(cData.data_situacao) || '',
            motivo_situacao: cData.motivo_situacao || '',
            status: cData.status || 'OK',
            ultima_atualizacao: cData.ultima_atualizacao || new Date().toISOString(),
            atividade_principal_code: ativPrinc.code || '',
            atividade_principal_text: ativPrinc.text || '',
            atividades_secundarias_text: ativSec,
            logradouro: cData.logradouro || '',
            numero: cData.numero || '',
            complemento: cData.complemento || '',
            bairro: cData.bairro || '',
            municipio: cData.municipio || '',
            uf: cData.uf || '',
            cep: cData.cep || ''
        });
        setIsEditModalOpen(true);
    };

    return (
        <div>
            {/* ... (Header and Search remain same) ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cadastro de Clientes</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                        <Plus size={18} /> Novo Cliente
                    </button>
                </div>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar por nome, documento ou #Nº..."
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
                            <th>Nº</th>
                            <th>Tipo</th>
                            <th>Nome / Razão Social</th>
                            <th>Documento</th>
                            <th>Contato</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id}>
                                <td data-label="Nº" style={{ fontWeight: 700, color: 'var(--primary)' }}>{client.id}</td>
                                <td data-label="Tipo">{client.is_manual ? <User size={16} title="CPF/Manual" /> : <Building2 size={16} title="CNPJ" />}</td>
                                <td data-label="Nome">{client.name}</td>
                                <td data-label="Documento">{client.is_manual ? client.cpf : client.cnpj}</td>
                                <td data-label="Contato">{client.phone}</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => openEditModal(client)}
                                            className="btn-primary" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }}
                                        >
                                            <Edit2 size={24} />
                                        </button>
                                        <button
                                            onClick={() => { setTargetClient(client); setIsDeleteModalOpen(true); }}
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

            {/* MODAL ADICIONAR (QUICK ADD) */}
            <ClientQuickAddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onClientAdded={() => fetchClients()}
            />

            {/* MODAL EDITAR */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editando: ${editingClient?.name}`}>
                {editingClient && (
                    <form onSubmit={handleUpdate} className="responsive-form-grid">
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Nome / Razão Social</label>
                            <input className="input-field" value={editingClient.name} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} required />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Nome Fantasia</label>
                            <input className="input-field" value={editingClient.fantasy_name} onChange={e => setEditingClient({ ...editingClient, fantasy_name: e.target.value })} />
                        </div>

                        <div>
                            <label className="label">{editingClient.is_manual ? 'CPF' : 'CNPJ'}</label>
                            <input className="input-field" value={editingClient.is_manual ? editingClient.cpf : editingClient.cnpj} onChange={e => setEditingClient({ ...editingClient, [editingClient.is_manual ? 'cpf' : 'cnpj']: e.target.value })} />
                        </div>

                        {/* Status Info */}
                        <div>
                            <label className="label">Situação Cadastral</label>
                            <select className="input-field" value={editingClient.situacao} onChange={e => setEditingClient({ ...editingClient, situacao: e.target.value })}>
                                <option value="Ativa">Ativa</option>
                                <option value="Baixada">Baixada</option>
                                <option value="Inapta">Inapta</option>
                                <option value="Suspensa">Suspensa</option>
                                <option value="Nula">Nula</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Data Situação</label>
                            <input className="input-field" type="date" value={editingClient.data_situacao} onChange={e => setEditingClient({ ...editingClient, data_situacao: e.target.value })} />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Motivo Situação</label>
                            <input className="input-field" value={editingClient.motivo_situacao} onChange={e => setEditingClient({ ...editingClient, motivo_situacao: e.target.value })} />
                        </div>

                        {/* Contact */}
                        <div>
                            <label className="label">Telefone</label>
                            <input className="input-field" value={editingClient.phone} onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input className="input-field" value={editingClient.email} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} />
                        </div>

                        {/* Opening & Capital */}
                        <div>
                            <label className="label">Capital Social</label>
                            <input className="input-field" value={editingClient.capital_social} onChange={e => setEditingClient({ ...editingClient, capital_social: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Data Abertura</label>
                            <input className="input-field" type="date" value={editingClient.abertura} onChange={e => setEditingClient({ ...editingClient, abertura: e.target.value })} />
                        </div>

                        {/* CNAE */}
                        <div>
                            <label className="label">CNAE Principal (Código)</label>
                            <input className="input-field" value={editingClient.atividade_principal_code} onChange={e => setEditingClient({ ...editingClient, atividade_principal_code: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">CNAE Principal (Texto)</label>
                            <input className="input-field" value={editingClient.atividade_principal_text} onChange={e => setEditingClient({ ...editingClient, atividade_principal_text: e.target.value })} />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Atividades Secundárias (uma por linha)</label>
                            <textarea className="input-field" rows="3" value={editingClient.atividades_secundarias_text} onChange={e => setEditingClient({ ...editingClient, atividades_secundarias_text: e.target.value })} placeholder="Texto da atividade..." />
                        </div>

                        {/* Address Breakdown */}
                        <div>
                            <label className="label">CEP</label>
                            <input className="input-field" value={editingClient.cep} onChange={e => setEditingClient({ ...editingClient, cep: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">UF</label>
                            <input className="input-field" maxLength="2" value={editingClient.uf} onChange={e => setEditingClient({ ...editingClient, uf: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Logradouro</label>
                            <input className="input-field" value={editingClient.logradouro} onChange={e => setEditingClient({ ...editingClient, logradouro: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Número</label>
                            <input className="input-field" value={editingClient.numero} onChange={e => setEditingClient({ ...editingClient, numero: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Complemento</label>
                            <input className="input-field" value={editingClient.complemento} onChange={e => setEditingClient({ ...editingClient, complemento: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Bairro</label>
                            <input className="input-field" value={editingClient.bairro} onChange={e => setEditingClient({ ...editingClient, bairro: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Município</label>
                            <input className="input-field" value={editingClient.municipio} onChange={e => setEditingClient({ ...editingClient, municipio: e.target.value })} />
                        </div>

                        {/* API Status (Manual override) */}
                        <div>
                            <label className="label">Status API (Simulado)</label>
                            <input className="input-field" value={editingClient.status} onChange={e => setEditingClient({ ...editingClient, status: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Última Atualização</label>
                            <input className="input-field" type="datetime-local" value={editingClient.ultima_atualizacao ? new Date(editingClient.ultima_atualizacao).toISOString().slice(0, 16) : ''} onChange={e => setEditingClient({ ...editingClient, ultima_atualizacao: new Date(e.target.value).toISOString() })} />
                        </div>

                        <button type="submit" className="btn-primary mobile-full-width" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Salvar Alterações</button>
                    </form>
                )}
            </Modal>

            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Cliente"
                message={`Deseja realmente excluir o cliente ${targetClient?.name}?`}
            />
        </div>
    );
};

export default ClientsPage;
