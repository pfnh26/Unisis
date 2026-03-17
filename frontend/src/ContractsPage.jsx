import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import api from './api';
import { Search, Plus, FileText, CheckCircle, Trash2, Edit2, CreditCard } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import { generateContractPDF, getContractPDFBlobURL } from './ContractGenerator';
import { format } from 'date-fns';
import ClientQuickAddModal from './ClientQuickAddModal';

// Helpers de moeda BR
const parseCurrencyInput = (raw) => {
    if (raw === '' || raw === null || raw === undefined) return '';
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim().replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(s);
    return isNaN(num) ? '' : num;
};
const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ContractsPage = () => {
    const { showToast } = useToast();
    const [contracts, setContracts] = useState([]);
    const [clients, setClients] = useState([]);
    const [partners, setPartners] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [search, setSearch] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addStep, setAddStep] = useState(1); // 1: Form, 2: Preview
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contractToDelete, setContractToDelete] = useState(null);
    const [editingContractId, setEditingContractId] = useState(null);

    const [selectedContract, setSelectedContract] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [osExecutionDate, setOsExecutionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [clientSearch, setClientSearch] = useState('');
    const [useClientAddress, setUseClientAddress] = useState(false);

    const [newContract, setNewContract] = useState({
        client_id: '', partner_id: '', seller_id: '', type: 'Locação',
        total_value: 0, cost_value: 0, has_pump: false, pump_quantity: 1, pump_value: 0,
        pump_delivery_address: '', duration_months: 12, start_date: format(new Date(), 'yyyy-MM-dd'), payment_day: 1,
        description: '', no_amortization: false
    });

    const [modalTab, setModalTab] = useState('Locação');

    const fetchData = async () => {
        const [cRes, clRes, pRes, sRes] = await Promise.all([
            api.get('/contracts'), api.get('/clients'), api.get('/partners'), api.get('/sellers')
        ]);
        setContracts(cRes.data);
        setClients(clRes.data);
        setPartners(pRes.data);
        setSellers(sRes.data);
    };

    useEffect(() => { fetchData(); }, []);

    const handleViewPDF = (contract) => {
        if (contract.pdf_url) {
            const url = `${api.defaults.baseURL.replace('/api', '')}${contract.pdf_url}`;
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error("Network response was not ok");
                    return res.blob();
                })
                .then(blob => {
                    const fileURL = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                    window.open(fileURL, '_blank');
                })
                .catch(err => {
                    console.warn("Could not fetch remote PDF, trying local generation...", err);
                    tryGenerateLocalPDF(contract);
                });
        } else {
            tryGenerateLocalPDF(contract);
        }
    };

    const tryGenerateLocalPDF = (contract) => {
        try {
            const fullData = {
                ...contract,
                client: clients.find(c => c.id == contract.client_id) || { name: contract.client_name || 'Cliente' },
                partner: partners.find(p => p.id == contract.partner_id) || { name: 'Empresa' }
            };
            const url = getContractPDFBlobURL(fullData);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Error generating local PDF:", error);
            alert("Erro ao visualizar contrato.");
        }
    };

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        try {
            const dataToSend = { ...newContract, offline_hash: Date.now().toString() + Math.random().toString(36).substring(2, 7) };
            dataToSend.total_value = parseCurrencyInput(dataToSend.total_value) || 0;
            dataToSend.cost_value = parseCurrencyInput(dataToSend.cost_value) || 0;
            dataToSend.pump_value = parseCurrencyInput(dataToSend.pump_value) || 0;

            if (editingContractId) {
                await api.patch(`/contracts/${editingContractId}`, dataToSend);
                showToast("Contrato atualizado com sucesso!", "success");
            } else {
                const today = new Date();
                const paymentDay = parseInt(dataToSend.payment_day);
                if (today.getDate() > paymentDay) {
                    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    dataToSend.start_date = format(nextMonth, 'yyyy-MM-dd');
                }
                await api.post('/contracts', dataToSend);
                showToast("Contrato criado com sucesso!", "success");
            }

            setIsAddModalOpen(false);
            setAddStep(1);
            setEditingContractId(null);
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Erro ao processar contrato: " + (err.response?.data?.error || err.message), "error");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/contracts/${contractToDelete.id}`);
            showToast("Contrato e dependências excluídos!", "success");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (err) {
            showToast("Erro ao excluir contrato", "error");
        }
    };

    const startEdit = (contract) => {
        setEditingContractId(contract.id);
        setNewContract({
            client_id: contract.client_id,
            partner_id: contract.partner_id,
            seller_id: contract.seller_id,
            type: contract.type,
            total_value: formatCurrency(contract.total_value),
            cost_value: formatCurrency(contract.cost_value),
            has_pump: contract.has_pump,
            pump_quantity: contract.pump_quantity || 1,
            pump_value: formatCurrency(contract.pump_value || 0),
            pump_delivery_address: contract.pump_delivery_address || '',
            duration_months: contract.duration_months,
            start_date: format(new Date(contract.start_date), 'yyyy-MM-dd'),
            payment_day: contract.payment_day,
            description: contract.description || '',
            no_amortization: contract.no_amortization
        });
        setModalTab(contract.type);
        setClientSearch(contract.client_name || '');
        setIsAddModalOpen(true);
    };

    const handleStatusUpdate = async (id, status, execution_date) => {
        try {
            await api.patch(`/contracts/${id}/status`, { status, execution_date });
            showToast("Status atualizado com sucesso!", "success");
            setIsStatusModalOpen(false);
            fetchData();
        } catch (err) { showToast("Erro ao atualizar status", "error"); }
    };

    const handleFileUpload = async (e, contractId) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            await api.post(`/contracts/${contractId}/upload`, formData);
            showToast("Arquivo enviado com sucesso!", "success");
            fetchData();
        } catch (err) { showToast("Erro ao enviar arquivo", "error"); }
    };

    const filteredClients = clients.filter(c => {
        if (clientSearch.startsWith('#')) {
            const id = clientSearch.substring(1);
            return c.id.toString() === id;
        }
        return c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            (c.cnpj && c.cnpj.includes(clientSearch)) ||
            (c.cpf && c.cpf.includes(clientSearch));
    });

    const toggleClientAddress = (checked) => {
        setUseClientAddress(checked);
        if (checked && newContract.client_id) {
            const client = clients.find(c => c.id === parseInt(newContract.client_id));
            if (client) {
                setNewContract({ ...newContract, pump_delivery_address: client.address });
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestão de Contratos</h2>
                <button onClick={() => {
                    setEditingContractId(null);
                    setNewContract({
                        client_id: '', partner_id: '', seller_id: '', type: 'Locação',
                        total_value: 0, cost_value: 0, has_pump: false, pump_quantity: 1, pump_value: 0,
                        pump_delivery_address: '', duration_months: 12, start_date: format(new Date(), 'yyyy-MM-dd'), payment_day: 1,
                        description: '', no_amortization: false
                    });
                    setClientSearch('');
                    setIsAddModalOpen(true);
                }} className="btn-primary">
                    <Plus size={18} /> Novo Contrato
                </button>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar por cliente (nome ou #Nº)..."
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
                            <th>Cliente</th>
                            <th>Tipo</th>
                            <th>Status</th>
                            <th>Valor</th>
                            <th>Duração</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.filter(c => {
                            if (search.startsWith('#')) {
                                const id = search.substring(1);
                                return c.client_id?.toString() === id;
                            }
                            return c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
                                c.type?.toLowerCase().includes(search.toLowerCase()) ||
                                c.status?.toLowerCase().includes(search.toLowerCase());
                        }).map(c => (
                            <tr key={c.id}>
                                <td data-label="Cliente">
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginRight: '0.5rem' }}>#{c.client_id}</span>
                                    {c.client_name}
                                </td>
                                <td data-label="Tipo">{c.type}</td>
                                <td data-label="Status">
                                    <span style={{
                                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem',
                                        backgroundColor: c.status === 'Ativo' ? '#dcfce7' : c.status === 'Cancelado' ? '#fee2e2' : '#fef9c3',
                                        color: c.status === 'Ativo' ? '#166534' : c.status === 'Cancelado' ? '#991b1b' : '#854d0e'
                                    }}>
                                        {c.status}
                                    </span>
                                </td>
                                <td data-label="Valor">R$ {formatCurrency(c.total_value)}</td>
                                <td data-label="Duração">{c.duration_months} meses</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleViewPDF(c)} title="Ver PDF" className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#3b82f6' }}><FileText size={18} /></button>
                                        <button onClick={() => { setSelectedContract(c); setIsStatusModalOpen(true); }} title="Status/OS" className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#8b5cf6' }}><CheckCircle size={18} /></button>
                                        <button onClick={() => startEdit(c)} title="Editar" className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#fbbf24' }}><Edit2 size={18} /></button>
                                        <button onClick={() => { setContractToDelete(c); setIsDeleteModalOpen(true); }} title="Excluir" className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#ef4444' }}><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setAddStep(1); }} title={addStep === 1 ? (editingContractId ? "Editar Contrato" : "Gerador de Novo Contrato") : "Preview do Contrato"}>
                {addStep === 1 && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <button
                            onClick={() => { setModalTab('Locação'); setNewContract(prev => ({ ...prev, type: 'Locação' })); }}
                            style={{
                                padding: '0.5rem 1rem', background: 'none', borderBottom: modalTab === 'Locação' ? '2px solid var(--primary)' : 'none',
                                color: modalTab === 'Locação' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                            }}
                        >
                            Locação
                        </button>
                        <button
                            onClick={() => { setModalTab('Prestação de Serviços'); setNewContract(prev => ({ ...prev, type: 'Prestação de Serviços', has_pump: false })); }}
                            style={{
                                padding: '0.5rem 1rem', background: 'none', borderBottom: modalTab === 'Prestação de Serviços' ? '2px solid var(--primary)' : 'none',
                                color: modalTab === 'Prestação de Serviços' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                            }}
                        >
                            Prestação de Serviços
                        </button>
                    </div>
                )}
                {addStep === 1 ? (
                    <form onSubmit={(e) => { e.preventDefault(); setAddStep(2); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Pesquisar e Selecionar Cliente</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                    <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="Nome ou CNPJ/CPF..."
                                        value={clientSearch}
                                        onChange={e => {
                                            setClientSearch(e.target.value);
                                            if (newContract.client_id) setNewContract({ ...newContract, client_id: '' });
                                        }}
                                    />
                                    {clientSearch && !newContract.client_id && filteredClients.length > 0 && (
                                        <ul style={{ position: 'absolute', zIndex: 50, width: '100%', maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', marginTop: '0.25rem', boxShadow: 'var(--shadow-lg)', padding: '0.5rem 0' }}>
                                            {filteredClients.slice(0, 10).map(cl => (
                                                <li key={cl.id}
                                                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
                                                    onClick={() => {
                                                        setNewContract({ ...newContract, client_id: cl.id });
                                                        setClientSearch(cl.name);
                                                        if (useClientAddress) {
                                                            setNewContract(prev => ({ ...prev, client_id: cl.id, pump_delivery_address: cl.address }));
                                                        }
                                                    }}
                                                    onMouseEnter={e => e.target.style.backgroundColor = 'var(--bg-sidebar)'}
                                                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    <span style={{ fontWeight: 'bold' }}>#{cl.id}</span> - {cl.name} <br />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cl.cnpj || cl.cpf}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <button type="button" onClick={() => setIsClientModalOpen(true)} className="btn-primary" style={{ backgroundColor: '#10b981', padding: '0.5rem' }}><Plus size={20} /></button>
                            </div>
                            {!newContract.client_id && clientSearch && filteredClients.length === 0 && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Nenhum cliente encontrado.</p>
                            )}
                            <input type="hidden" value={newContract.client_id || ''} required />
                        </div>
                        <div>
                            <label className="label">Empresa Colaboradora</label>
                            <select className="input-field" value={newContract.partner_id} onChange={e => setNewContract({ ...newContract, partner_id: e.target.value })} required>
                                <option value="">Selecionar Empresa</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Valor Total Mensal (R$)</label>
                            <input
                                type="text" inputMode="decimal" placeholder="Ex: 1.200,00"
                                className="input-field"
                                value={newContract.total_value}
                                onChange={e => setNewContract({ ...newContract, total_value: e.target.value })}
                                onBlur={e => {
                                    const p = parseCurrencyInput(e.target.value);
                                    if (p !== '') setNewContract(prev => ({ ...prev, total_value: formatCurrency(p) }));
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Custos do Contrato (R$)</label>
                            <input
                                type="text" inputMode="decimal" placeholder="Ex: 800,00"
                                className="input-field"
                                value={newContract.cost_value}
                                onChange={e => setNewContract({ ...newContract, cost_value: e.target.value })}
                                onBlur={e => {
                                    const p = parseCurrencyInput(e.target.value);
                                    if (p !== '') setNewContract(prev => ({ ...prev, cost_value: formatCurrency(p) }));
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Duração (Meses)</label>
                            <input type="number" className="input-field" value={newContract.duration_months} onChange={e => setNewContract({ ...newContract, duration_months: parseInt(e.target.value) || 0 })} required />
                        </div>
                        <div>
                            <label className="label">Dia de Vencimento</label>
                            <input type="number" min="1" max="31" className="input-field" value={newContract.payment_day} onChange={e => setNewContract({ ...newContract, payment_day: parseInt(e.target.value) || 1 })} required />
                        </div>

                        {modalTab === 'Locação' && (
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem' }} checked={newContract.has_pump} onChange={e => setNewContract({ ...newContract, has_pump: e.target.checked })} />
                                    <b>Habilitar Bomba Dosadora em Comodato</b>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem' }} checked={newContract.no_amortization} onChange={e => setNewContract({ ...newContract, no_amortization: e.target.checked })} />
                                    <b>Sem Amortização</b>
                                </label>
                            </div>
                        )}

                        {newContract.has_pump && (
                            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label className="label">Quantidade de Bombas</label>
                                        <input type="number" min="1" className="input-field" value={newContract.pump_quantity} onChange={e => setNewContract({ ...newContract, pump_quantity: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div>
                                        <label className="label">Custo Unitário da Bomba (R$)</label>
                                        <input
                                            type="text" inputMode="decimal" placeholder="Ex: 1.700,00"
                                            className="input-field"
                                            value={newContract.pump_value}
                                            onChange={e => setNewContract({ ...newContract, pump_value: e.target.value })}
                                            onBlur={e => {
                                                const p = parseCurrencyInput(e.target.value);
                                                if (p !== '') setNewContract(prev => ({ ...prev, pump_value: formatCurrency(p) }));
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label className="label" style={{ marginBottom: 0 }}>Endereço de Instalação</label>
                                        <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={useClientAddress} onChange={e => toggleClientAddress(e.target.checked)} /> Usar end. do cliente
                                        </label>
                                    </div>
                                    <input className="input-field" placeholder="Endereço de instalação" value={newContract.pump_delivery_address} onChange={e => {
                                        setNewContract({ ...newContract, pump_delivery_address: e.target.value });
                                        setUseClientAddress(false);
                                    }} disabled={useClientAddress} />
                                </div>
                            </div>
                        )}

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Vendedor Responsável</label>
                            <select className="input-field" value={newContract.seller_id} onChange={e => setNewContract({ ...newContract, seller_id: e.target.value })} required>
                                <option value="">Selecionar Vendedor</option>
                                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Descrição do Serviço (Obrigatório)</label>
                            <textarea className="input-field" value={newContract.description} onChange={e => setNewContract({ ...newContract, description: e.target.value })} required style={{ minHeight: '80px' }} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Ir para Preview</button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.5rem', lineHeight: '1.6' }}>
                            <p><b>Cliente:</b> {clients.find(c => c.id == newContract.client_id)?.name}</p>
                            <p><b>Valor Mensal:</b> R$ {formatCurrency(parseCurrencyInput(newContract.total_value) || newContract.total_value)}</p>
                            <p><b>Custo Contrato:</b> R$ {formatCurrency(parseCurrencyInput(newContract.cost_value) || newContract.cost_value)}</p>
                            {newContract.type === 'Locação' && <p><b>Bomba em Comodato:</b> {newContract.has_pump ? `${newContract.pump_quantity} un. (Custo: R$ ${formatCurrency(parseCurrencyInput(newContract.pump_value) || 0)})` : 'Não'}</p>}
                            {newContract.no_amortization && <p style={{ color: '#10b981', fontWeight: 700 }}>✓ SEM AMORTIZAÇÃO</p>}
                            <p><b>Tipo:</b> {newContract.type}</p>
                            <p><b>Duração:</b> {newContract.duration_months} meses</p>
                            <p><b>Vencimento:</b> Todo dia {newContract.payment_day}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setAddStep(1)} className="btn-primary" style={{ flex: 1, backgroundColor: '#6b7280' }}>Voltar</button>
                            <button onClick={handleCreate} className="btn-primary" style={{ flex: 1, backgroundColor: '#10b981' }}>{editingContractId ? "Salvar Alterações" : "Confirmar e Gerar"}</button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Gestão do Contrato">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '0.5rem' }}>
                        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Contrato Assinado (Upload)</p>
                        {selectedContract?.pdf_url && (
                            <button onClick={() => handleViewPDF(selectedContract)} className="btn-primary" style={{ background: '#3b82f6', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Ver Arquivo Atual</button>
                        )}
                        <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, selectedContract.id)} />
                    </div>
                    <div>
                        <label className="label">Data de Execução da OS</label>
                        <input type="date" className="input-field" value={osExecutionDate} onChange={e => setOsExecutionDate(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => handleStatusUpdate(selectedContract.id, 'Ativo', osExecutionDate)} className="btn-primary" style={{ backgroundColor: '#10b981', flex: 1 }}>Ativar e Gerar OS</button>
                        <button onClick={() => handleStatusUpdate(selectedContract.id, 'Cancelado')} className="btn-primary" style={{ backgroundColor: '#ef4444', flex: 1 }}>Cancelar Contrato</button>
                    </div>
                </div>
            </Modal>

            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Contrato"
                message="Tem certeza que deseja excluir este contrato? Isso apagará também todas as cobranças e comissões relacionadas."
            />

            <ClientQuickAddModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientAdded={(cl) => { setClients([...clients, cl]); setNewContract({ ...newContract, client_id: cl.id }); setIsClientModalOpen(false); }}
            />
        </div>
    );
};

export default ContractsPage;
