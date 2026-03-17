import React, { useState, useEffect } from 'react';
import api from './api';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import PartnerQuickAddModal from './PartnerQuickAddModal';

const PartnersPage = () => {
    const [partners, setPartners] = useState([]);
    const [search, setSearch] = useState('');
    const [editingPartner, setEditingPartner] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [targetPartner, setTargetPartner] = useState(null);

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) return dateString.split('T')[0];
        const parts = dateString.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateString;
    };

    const fetchPartners = async () => {
        try {
            const { data } = await api.get('/partners?search=' + search);
            setPartners(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, [search]);

    const [newCertificate, setNewCertificate] = useState(null);
    const [newCertPassword, setNewCertPassword] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { id, created_at, certificate_url, certificate_password, ...updates } = editingPartner;

            const dataObj = {
                ...(editingPartner.data || {}),
                nome: editingPartner.name,
                fantasia: editingPartner.fantasy_name,
                cnpj: editingPartner.cnpj,
                natureza_juridica: editingPartner.type,
                email: editingPartner.email,
                telefone: editingPartner.phone,
                capital_social: editingPartner.capital_social,
                abertura: editingPartner.abertura,
                situacao: editingPartner.situacao,
                data_situacao: editingPartner.data_situacao,
                motivo_situacao: editingPartner.motivo_situacao,
                status: editingPartner.status,
                ultima_atualizacao: editingPartner.ultima_atualizacao,
                atividade_principal: [{ code: editingPartner.atividade_principal_code, text: editingPartner.atividade_principal_text }],
                atividades_secundarias: (editingPartner.atividades_secundarias_text || '').split('\n').filter(line => line.trim() !== '').map(line => ({ text: line.trim() })),
                logradouro: editingPartner.logradouro,
                numero: editingPartner.numero,
                complemento: editingPartner.complemento,
                bairro: editingPartner.bairro,
                municipio: editingPartner.municipio,
                uf: editingPartner.uf,
                cep: editingPartner.cep
            };

            const fullAddress = `${editingPartner.logradouro}, ${editingPartner.numero}${editingPartner.complemento ? ` - ${editingPartner.complemento}` : ''} - ${editingPartner.bairro}, ${editingPartner.municipio}/${editingPartner.uf}`;

            const formData = new FormData();
            formData.append('name', editingPartner.name);
            formData.append('type', editingPartner.type);
            formData.append('cnpj', editingPartner.cnpj);
            formData.append('cep', editingPartner.cep);
            formData.append('address', fullAddress);
            formData.append('data', JSON.stringify(dataObj));

            if (newCertificate) {
                formData.append('certificate', newCertificate);
            }
            if (newCertPassword || editingPartner.newCertPassword) {
                formData.append('certificate_password', newCertPassword || editingPartner.newCertPassword);
            }

            await api.patch(`/partners/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsEditModalOpen(false);
            setEditingPartner(null);
            setNewCertificate(null);
            setNewCertPassword('');
            fetchPartners();
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar empresa");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/partners/${targetPartner.id}`);
            setIsDeleteModalOpen(false);
            fetchPartners();
        } catch (err) {
            alert("Erro ao excluir empresa");
        }
    };

    const openEditModal = (partner) => {
        const pData = partner.data || {};
        const ativPrinc = (pData.atividade_principal && pData.atividade_principal[0]) || { code: '', text: '' };
        const ativSec = (pData.atividades_secundarias || []).map(a => a.text).join('\n');

        setEditingPartner({
            ...partner,
            fantasy_name: pData.fantasia || '',
            email: pData.email || '',
            phone: pData.telefone || '',
            capital_social: pData.capital_social || '',
            abertura: formatDateForInput(pData.abertura) || '',
            situacao: pData.situacao || 'Ativa',
            data_situacao: formatDateForInput(pData.data_situacao) || '',
            motivo_situacao: pData.motivo_situacao || '',
            status: pData.status || 'OK',
            ultima_atualizacao: pData.ultima_atualizacao || new Date().toISOString(),
            atividade_principal_code: ativPrinc.code || '',
            atividade_principal_text: ativPrinc.text || '',
            atividades_secundarias_text: ativSec,
            logradouro: pData.logradouro || '',
            numero: pData.numero || '',
            complemento: pData.complemento || '',
            bairro: pData.bairro || '',
            municipio: pData.municipio || '',
            uf: pData.uf || '',
            cep: pData.cep || partner.cep || ''
        });
        setIsEditModalOpen(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>PJ Prestador</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                    <Plus size={18} /> Nova Empresa
                </button>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar empresa..."
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
                            <th>Tipo</th>
                            <th>CNPJ</th>
                            <th style={{ width: '120px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {partners.map(partner => (
                            <tr key={partner.id}>
                                <td data-label="Nome" style={{ fontWeight: 600 }}>{partner.name}</td>
                                <td data-label="Tipo">{partner.type}</td>
                                <td data-label="CNPJ">{partner.cnpj}</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                        <button onClick={() => openEditModal(partner)} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }}>
                                            <Edit2 size={24} />
                                        </button>
                                        <button onClick={() => { setTargetPartner(partner); setIsDeleteModalOpen(true); }} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#ef4444' }}>
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <PartnerQuickAddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onPartnerAdded={() => fetchPartners()}
            />

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editando: ${editingPartner?.name || ''}`}>
                {editingPartner && (
                    <form onSubmit={handleUpdate} className="responsive-form-grid">
                        <div style={{ gridColumn: 'span 2', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 1rem 0' }}>Certificado Digital (Opcional)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label">Atualizar Arquivo .p12 / .pfx</label>
                                    <input type="file" className="input-field" onChange={e => setNewCertificate(e.target.files[0])} accept=".p12,.pfx" />
                                    {editingPartner.certificate_url && <small style={{ color: 'var(--primary)' }}>Certificado já enviado</small>}
                                </div>
                                <div>
                                    <label className="label">Nova Senha</label>
                                    <input type="password" className="input-field" value={newCertPassword} onChange={e => setNewCertPassword(e.target.value)} placeholder="Deixe em branco para manter" />
                                </div>
                            </div>
                        </div>

                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Razão Social</label>
                            <input className="input-field" value={editingPartner.name} onChange={e => setEditingPartner({ ...editingPartner, name: e.target.value })} required />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Nome Fantasia</label>
                            <input className="input-field" value={editingPartner.fantasy_name} onChange={e => setEditingPartner({ ...editingPartner, fantasy_name: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">CNPJ</label>
                            <input className="input-field" value={editingPartner.cnpj} onChange={e => setEditingPartner({ ...editingPartner, cnpj: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Tipo / Regime</label>
                            <input className="input-field" value={editingPartner.type} onChange={e => setEditingPartner({ ...editingPartner, type: e.target.value })} />
                        </div>

                        {/* Status Info */}
                        <div>
                            <label className="label">Situação Cadastral</label>
                            <select className="input-field" value={editingPartner.situacao} onChange={e => setEditingPartner({ ...editingPartner, situacao: e.target.value })}>
                                <option value="Ativa">Ativa</option>
                                <option value="Baixada">Baixada</option>
                                <option value="Inapta">Inapta</option>
                                <option value="Suspensa">Suspensa</option>
                                <option value="Nula">Nula</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Data Situação</label>
                            <input className="input-field" type="date" value={editingPartner.data_situacao} onChange={e => setEditingPartner({ ...editingPartner, data_situacao: e.target.value })} />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Motivo Situação</label>
                            <input className="input-field" value={editingPartner.motivo_situacao} onChange={e => setEditingPartner({ ...editingPartner, motivo_situacao: e.target.value })} />
                        </div>

                        {/* Contact */}
                        <div>
                            <label className="label">Email</label>
                            <input className="input-field" type="email" value={editingPartner.email} onChange={e => setEditingPartner({ ...editingPartner, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Telefone</label>
                            <input className="input-field" value={editingPartner.phone} onChange={e => setEditingPartner({ ...editingPartner, phone: e.target.value })} />
                        </div>

                        {/* Opening & Capital */}
                        <div>
                            <label className="label">Capital Social</label>
                            <input className="input-field" value={editingPartner.capital_social} onChange={e => setEditingPartner({ ...editingPartner, capital_social: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Data Abertura</label>
                            <input className="input-field" type="date" value={editingPartner.abertura} onChange={e => setEditingPartner({ ...editingPartner, abertura: e.target.value })} />
                        </div>

                        {/* CNAE */}
                        <div>
                            <label className="label">CNAE Principal (Código)</label>
                            <input className="input-field" value={editingPartner.atividade_principal_code} onChange={e => setEditingPartner({ ...editingPartner, atividade_principal_code: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">CNAE Principal (Texto)</label>
                            <input className="input-field" value={editingPartner.atividade_principal_text} onChange={e => setEditingPartner({ ...editingPartner, atividade_principal_text: e.target.value })} />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Atividades Secundárias (uma por linha)</label>
                            <textarea className="input-field" rows="3" value={editingPartner.atividades_secundarias_text} onChange={e => setEditingPartner({ ...editingPartner, atividades_secundarias_text: e.target.value })} placeholder="Texto da atividade..." />
                        </div>

                        {/* Address Breakdown */}
                        <div>
                            <label className="label">CEP</label>
                            <input className="input-field" value={editingPartner.cep} onChange={e => setEditingPartner({ ...editingPartner, cep: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">UF</label>
                            <input className="input-field" maxLength="2" value={editingPartner.uf} onChange={e => setEditingPartner({ ...editingPartner, uf: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Logradouro</label>
                            <input className="input-field" value={editingPartner.logradouro} onChange={e => setEditingPartner({ ...editingPartner, logradouro: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Número</label>
                            <input className="input-field" value={editingPartner.numero} onChange={e => setEditingPartner({ ...editingPartner, numero: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Complemento</label>
                            <input className="input-field" value={editingPartner.complemento} onChange={e => setEditingPartner({ ...editingPartner, complemento: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Bairro</label>
                            <input className="input-field" value={editingPartner.bairro} onChange={e => setEditingPartner({ ...editingPartner, bairro: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Município</label>
                            <input className="input-field" value={editingPartner.municipio} onChange={e => setEditingPartner({ ...editingPartner, municipio: e.target.value })} />
                        </div>

                        {/* API Status (Manual override) */}
                        <div>
                            <label className="label">Status API (Simulado)</label>
                            <input className="input-field" value={editingPartner.status} onChange={e => setEditingPartner({ ...editingPartner, status: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Última Atualização</label>
                            <input className="input-field" type="datetime-local" value={editingPartner.ultima_atualizacao ? new Date(editingPartner.ultima_atualizacao).toISOString().slice(0, 16) : ''} onChange={e => setEditingPartner({ ...editingPartner, ultima_atualizacao: new Date(e.target.value).toISOString() })} />
                        </div>

                        <button type="submit" className="btn-primary mobile-full-width" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Salvar Alterações</button>
                    </form>
                )}
            </Modal>

            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Empresa"
                message={`Tem certeza que deseja excluir a empresa ${targetPartner?.name}?`}
            />
        </div>
    );
};

export default PartnersPage;
