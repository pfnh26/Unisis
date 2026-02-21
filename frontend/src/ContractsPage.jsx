import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import api from './api';
import { Search, Plus, FileText, CheckCircle, XCircle, Download, Trash2, History, CreditCard } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import { generateContractPDF, getContractPDFBlobURL } from './ContractGenerator';
import { format } from 'date-fns';
import ClientQuickAddModal from './ClientQuickAddModal';

const ContractsPage = () => {
    const { showToast } = useToast();
    const [contracts, setContracts] = useState([]);

    const handleViewPDF = (contract) => {
        // Tenta obter via URL se existir
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
                    // Fallback: Gerar localmente se falhar o download (ex: offline)
                    tryGenerateLocalPDF(contract);
                });
        } else {
            // Contrato novo ou sem PDF gerado: gerar localmente
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
            // Último recurso: HTML estático
            if (!navigator.onLine) {
                window.open('/contrato_modelo.html', '_blank');
            } else {
                alert("Erro ao visualizar contrato.");
            }
        }
    };
    const [clients, setClients] = useState([]);
    const [partners, setPartners] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [search, setSearch] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addStep, setAddStep] = useState(1); // 1: Form, 2: Preview
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [selectedContract, setSelectedContract] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', cnpj: '', phone: '', email: '', address: '' });
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

    const [paymentData, setPaymentData] = useState({ amount: 0, description: '', payment_date: format(new Date(), 'yyyy-MM-dd') });
    const [payments, setPayments] = useState([]);

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

    const handleQuickClientAdded = (client) => {
        setClients([...clients, client]);
        setNewContract({ ...newContract, client_id: client.id });
        setIsClientModalOpen(false);
    };

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        try {
            const dataToSend = { ...newContract };
            if (!dataToSend.client_id) dataToSend.client_id = null;
            if (!dataToSend.partner_id) dataToSend.partner_id = null;
            if (!dataToSend.seller_id) dataToSend.seller_id = null;

            const res = await api.post('/contracts', dataToSend);

            if (res.isOffline) {
                showToast("Contrato salvo offline! Será sincronizado assim que a conexão retornar.", "warning");
            } else {
                showToast("Contrato criado com sucesso!", "success");
            }

            setIsAddModalOpen(false);
            setAddStep(1);
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Erro ao criar contrato: " + (err.response?.data?.error || err.message), "error");
        }
    };

    const handleStatusUpdate = async (id, status, execution_date) => {
        try {
            await api.patch(`/contracts/${id}`, { status, execution_date });
            setIsStatusModalOpen(false);
            fetchData();
        } catch (err) { alert("Erro ao atualizar status"); }
    };

    const handleFileUpload = async (e, contractId) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            await api.post(`/contracts/${contractId}/upload`, formData);
            alert("Arquivo enviado com sucesso!");
            fetchData();
        } catch (err) { alert("Erro ao enviar arquivo"); }
    };

    const handleDownloadPDF = (contract) => {
        const fullData = {
            ...contract,
            client: clients.find(c => c.id === contract.client_id),
            partner: partners.find(p => p.id === contract.partner_id)
        };
        generateContractPDF(fullData);
    };

    const openPaymentModal = async (contract) => {
        setSelectedContract(contract);
        const { data } = await api.get(`/contracts/${contract.id}/payments`);
        setPayments(data);
        setIsPaymentModalOpen(true);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/payments', { ...paymentData, contract_id: selectedContract.id });
            setPaymentData({ amount: 0, description: '', payment_date: format(new Date(), 'yyyy-MM-dd') });
            const { data } = await api.get(`/contracts/${selectedContract.id}/payments`);
            setPayments(data);
        } catch (err) { alert("Erro ao registrar pagamento"); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestão de Contratos</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
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
                            <th>Restante</th>
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
                                <td data-label="Valor">R$ {parseFloat(c.total_value).toFixed(2)}</td>
                                <td data-label="Duração">{c.duration_months} meses</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleViewPDF(c)} title="Visualizar Contrato" className="btn-primary" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }}><FileText size={22} /></button>
                                        <button onClick={() => { setSelectedContract(c); setIsStatusModalOpen(true); }} title="Status/OS" className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#8b5cf6' }}><CheckCircle size={22} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


            {/* MODAL NOVO CONTRATO - MULTI STEP */}
            <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setAddStep(1); }} title={addStep === 1 ? "Gerador de Novo Contrato" : "Preview do Contrato"}>
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
                                    <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="Nome ou CNPJ/CPF..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                                </div>
                                <button type="button" onClick={() => setIsClientModalOpen(true)} className="btn-primary" style={{ backgroundColor: '#10b981', padding: '0.5rem' }}>
                                    <Plus size={20} />
                                </button>
                            </div>
                            <select className="input-field" value={newContract.client_id} onChange={e => {
                                setNewContract({ ...newContract, client_id: e.target.value });
                                if (useClientAddress) {
                                    const client = clients.find(c => c.id === parseInt(e.target.value));
                                    if (client) setNewContract(prev => ({ ...prev, pump_delivery_address: client.address }));
                                }
                            }} required>
                                <option value="">-- Selecione o Cliente na Lista --</option>
                                {filteredClients.map(cl => <option key={cl.id} value={cl.id}>[#{cl.id}] {cl.name} ({cl.cnpj || cl.cpf})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Empresa Colaboradora (LOCADORA)</label>
                            <select className="input-field" value={newContract.partner_id} onChange={e => setNewContract({ ...newContract, partner_id: e.target.value })} required>
                                <option value="">Selecionar Empresa</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Valor Total Mensal (R$)</label>
                            <input type="number" step="0.01" className="input-field" value={newContract.total_value} onChange={e => setNewContract({ ...newContract, total_value: e.target.value === '' ? '' : parseFloat(e.target.value) })} required />
                        </div>
                        <div>
                            <label className="label">Custos do Contrato (R$)</label>
                            <input type="number" step="0.01" className="input-field" value={newContract.cost_value} onChange={e => setNewContract({ ...newContract, cost_value: e.target.value === '' ? '' : parseFloat(e.target.value) })} required />
                        </div>
                        <div>
                            <label className="label">Duração (Meses)</label>
                            <input type="number" className="input-field" value={newContract.duration_months} onChange={e => setNewContract({ ...newContract, duration_months: e.target.value === '' ? '' : parseInt(e.target.value) })} required />
                        </div>
                        <div>
                            <label className="label">Dia de Vencimento</label>
                            <input type="number" min="1" max="31" className="input-field" value={newContract.payment_day} onChange={e => setNewContract({ ...newContract, payment_day: e.target.value === '' ? '' : parseInt(e.target.value) })} required />
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
                                        <input type="number" min="1" className="input-field" value={newContract.pump_quantity} onChange={e => setNewContract({ ...newContract, pump_quantity: parseInt(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="label">Custo Unitário (R$)</label>
                                        <input type="number" step="0.01" className="input-field" value={newContract.pump_value} onChange={e => setNewContract({ ...newContract, pump_value: parseFloat(e.target.value) })} />
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
                            <textarea
                                className="input-field"
                                placeholder="Descreva detalhes importantes para a execução do serviço..."
                                value={newContract.description}
                                onChange={e => setNewContract({ ...newContract, description: e.target.value })}
                                required
                                style={{ minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Ir para Preview</button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.5rem', lineHeight: '1.6' }}>
                            <p><b>Cliente:</b> {clients.find(c => c.id == newContract.client_id)?.name}</p>
                            <p><b>Empresa:</b> {partners.find(p => p.id == newContract.partner_id)?.name}</p>
                            <p><b>Valor Mensal:</b> R$ {newContract.total_value.toFixed(2)}</p>
                            <p><b>Custo Contrato:</b> R$ {newContract.cost_value.toFixed(2)}</p>
                            {newContract.type === 'Locação' && <p><b>Bomba em Comodato:</b> {newContract.has_pump ? `${newContract.pump_quantity} un.` : 'Não'}</p>}
                            {newContract.no_amortization && <p style={{ color: '#10b981', fontWeight: 700 }}>✓ SEM AMORTIZAÇÃO</p>}
                            <p><b>Tipo:</b> {newContract.type}</p>
                            <p><b>Vencimento:</b> Dia {newContract.payment_day}</p>
                            <p><b>Descrição:</b> {newContract.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setAddStep(1)} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-muted)' }}>Voltar e Editar</button>
                            <button onClick={handleCreate} className="btn-primary" style={{ flex: 1 }}>Confirmar e Gerar PDF</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL STATUS E GESTÃO DO ARQUIVO */}
            <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Gestão do Contrato">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '0.5rem' }}>
                        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Contrato Assinado (Upload)</p>
                        {selectedContract?.pdf_url ? (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button onClick={() => handleViewPDF(selectedContract)} className="btn-primary" style={{ background: '#3b82f6', fontSize: '0.8rem' }}>Ver Arquivo Atual</button>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ou envie uma nova versão:</p>
                            </div>
                        ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nenhum arquivo enviado ainda.</p>}
                        <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, selectedContract.id)} style={{ marginTop: '0.5rem' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontWeight: 700 }}>Preview da Ordem de Serviço</p>
                        <p style={{ fontSize: '0.9rem' }}><b>Cliente:</b> {selectedContract?.client_name}</p>
                        <label className="label">Data de Execução da OS</label>
                        <input type="date" className="input-field" value={osExecutionDate} onChange={e => setOsExecutionDate(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => handleStatusUpdate(selectedContract.id, 'Ativo', osExecutionDate)} className="btn-primary" style={{ backgroundColor: '#10b981', flex: 1 }}>Ativar e Gerar OS</button>
                        <button onClick={() => handleStatusUpdate(selectedContract.id, 'Cancelado')} className="btn-primary" style={{ backgroundColor: '#ef4444', flex: 1 }}>Cancelar Contrato</button>
                    </div>
                </div>
            </Modal>

            {/* QUICK CLIENT ADD MODAL */}
            <ClientQuickAddModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientAdded={handleQuickClientAdded}
            />

            {/* MODAL FINANCEIRO REDESENHADO */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Financeiro - ${selectedContract?.client_name}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
                        {Array.from({ length: selectedContract?.duration_months || 12 }).map((_, i) => {
                            const rawDate = selectedContract?.start_date;
                            if (!rawDate) return null;
                            const dueDate = new Date(rawDate);
                            if (isNaN(dueDate.getTime())) return null;

                            dueDate.setMonth(dueDate.getMonth() + i);
                            dueDate.setDate(selectedContract?.payment_day || 1);

                            const isPaid = payments.some(p => {
                                const pDate = new Date(p.payment_date);
                                return pDate.getMonth() === dueDate.getMonth() && pDate.getFullYear() === dueDate.getFullYear();
                            });

                            return (
                                <div key={i} style={{
                                    padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                                    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Parcela {i + 1}</p>
                                    <p style={{ fontSize: '0.9rem' }}>{format(dueDate, 'dd/MM/yyyy')}</p>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>R$ {parseFloat(selectedContract?.total_value).toFixed(2)}</p>
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: isPaid ? '#10b981' : '#f59e0b' }}>{isPaid ? 'PAGO' : 'PENDENTE'}</span>
                                        {!isPaid && (
                                            <button
                                                onClick={() => {
                                                    setPaymentData({ amount: selectedContract.total_value, description: `Parcela ${i + 1}`, payment_date: format(dueDate, 'yyyy-MM-dd') });
                                                    // Trigger manual handleAddPayment or show confirmation
                                                    if (confirm(`Confirmar pagamento da Parcela ${i + 1}?`)) {
                                                        api.post('/payments', {
                                                            contract_id: selectedContract.id,
                                                            amount: selectedContract.total_value,
                                                            description: `Parcela ${i + 1}`,
                                                            payment_date: format(new Date(), 'yyyy-MM-dd')
                                                        }).then(() => openPaymentModal(selectedContract));
                                                    }
                                                }}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                className="btn-primary"
                                            >
                                                Pagar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default ContractsPage;
