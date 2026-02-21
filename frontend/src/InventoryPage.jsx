import React, { useState, useEffect } from 'react';
import api from './api';
import { Box, Plus, Minus, History, Search } from 'lucide-react';
import Modal from './Modal';
import { format } from 'date-fns';

const InventoryPage = () => {
    const [products, setProducts] = useState([]);
    const [logs, setLogs] = useState([]);
    const [partners, setPartners] = useState([]);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('danfe');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [newLog, setNewLog] = useState({
        product_id: '', type: 'Entrada', quantity: 1, reason: '',
        ncm: '', cfop: '', v_bc: 0, v_icms: 0, v_ipi: 0, v_pis: 0, v_cofins: 0, unit_cost: 0
    });
    const [danfeKey, setDanfeKey] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');

    const fetchData = async () => {
        try {
            const [pRes, lRes, parRes] = await Promise.all([
                api.get('/products'),
                api.get('/inventory-logs'),
                api.get('/partners')
            ]);
            setProducts(pRes.data);
            setLogs(lRes.data);
            setPartners(parRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleUpdateStock = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventory/log', newLog);
            setIsLogModalOpen(false);
            setNewLog({
                product_id: '', type: 'Entrada', quantity: 1, reason: '',
                ncm: '', cfop: '', v_bc: 0, v_icms: 0, v_ipi: 0, v_pis: 0, v_cofins: 0, unit_cost: 0
            });
            fetchData();
        } catch (err) { alert("Erro ao atualizar estoque"); }
    };

    const handleDanfeProcess = async (e) => {
        e.preventDefault();
        if (!danfeKey || !selectedPartner) return alert("Informe a chave e o parceiro");
        setLoading(true);
        try {
            await api.post('/inventory/danfe', { accessKey: danfeKey, partnerId: selectedPartner });
            setIsLogModalOpen(false);
            setDanfeKey('');
            setSelectedPartner('');
            fetchData();
        } catch (err) {
            alert("Erro ao processar DANFE: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => p.description.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search));

    const renderMovementReason = (log) => {
        if (!log.unit_cost && !log.v_icms) return <div className="client-name-card">{log.reason}</div>;

        return (
            <div className="client-name-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 'fit-content' }}>
                <span style={{ fontWeight: 600 }}>{log.reason}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Custo Un: R$ {parseFloat(log.unit_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} |
                    NCM: {log.ncm || 'N/A'} | CFOP: {log.cfop || 'N/A'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tributos: ICMS: R$ {parseFloat(log.v_icms || 0).toFixed(2)} |
                    IPI: R$ {parseFloat(log.v_ipi || 0).toFixed(2)} |
                    PIS/COF: R$ {(parseFloat(log.v_pis || 0) + parseFloat(log.v_cofins || 0)).toFixed(2)}
                </span>
            </div>
        );
    };

    return (
        <div>
            {/* ... title and header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Controle de Estoque</h2>
                <button onClick={() => { setIsLogModalOpen(true); setActiveTab('danfe'); }} className="btn-primary">
                    <History size={18} /> Movimentar Estoque
                </button>
            </div>

            <div className="inventory-grid">
                {/* Stock List */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                        <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="Pesquisar produto..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredProducts.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                                <div>
                                    <p style={{ fontWeight: 600 }}>{p.description}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cód: {p.code}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 700, color: p.stock < 5 ? '#ef4444' : 'inherit' }}>{p.stock}</p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estoque: {p.unit}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History Logs */}
                <div className="table-container card">
                    <p style={{ padding: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Histórico de Movimentações</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Produto</th>
                                <th>Tipo</th>
                                <th>Qtd</th>
                                <th>Motivo / Custos / Impostos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td data-label="Data">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</td>
                                    <td data-label="Produto">{log.product_name}</td>
                                    <td data-label="Tipo">
                                        <span style={{ color: log.type === 'Entrada' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td data-label="Qtd">{log.quantity}</td>
                                    <td data-label="Motivo" style={{ fontSize: '0.8rem' }}>
                                        {renderMovementReason(log)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Nova Movimentação">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setActiveTab('danfe')}
                        style={{
                            padding: '0.5rem 1rem', background: 'none', borderBottom: activeTab === 'danfe' ? '2px solid var(--primary)' : 'none',
                            color: activeTab === 'danfe' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                        }}
                    >
                        DANFE
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        style={{
                            padding: '0.5rem 1rem', background: 'none', borderBottom: activeTab === 'manual' ? '2px solid var(--primary)' : 'none',
                            color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                        }}
                    >
                        Manual
                    </button>
                </div>

                {activeTab === 'manual' ? (
                    <form onSubmit={handleUpdateStock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', padding: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Produto</label>
                                <select className="input-field" value={newLog.product_id} onChange={e => {
                                    const p = products.find(x => x.id == e.target.value);
                                    setNewLog({
                                        ...newLog,
                                        product_id: e.target.value,
                                        ncm: p?.ncm || '',
                                        cfop: p?.cfop || '',
                                        unit_cost: p?.cost || 0,
                                        v_bc: p?.v_bc || 0,
                                        v_icms: p?.v_icms || 0,
                                        v_ipi: p?.v_ipi || 0,
                                        v_pis: p?.v_pis || 0,
                                        v_cofins: p?.v_cofins || 0
                                    });
                                }} required>
                                    <option value="">Selecionar Produto</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.description} (Cód: {p.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Tipo</label>
                                <select className="input-field" value={newLog.type} onChange={e => setNewLog({ ...newLog, type: e.target.value })}>
                                    <option value="Entrada">Entrada (+)</option>
                                    <option value="Saída">Saída (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Quantidade</label>
                                <input type="number" min="1" className="input-field" value={newLog.quantity} onChange={e => setNewLog({ ...newLog, quantity: parseInt(e.target.value) })} required />
                            </div>

                            <div>
                                <label className="label">Custo Unitário (R$)</label>
                                <input type="number" step="0.01" className="input-field" value={newLog.unit_cost} onChange={e => setNewLog({ ...newLog, unit_cost: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="label">NCM</label>
                                <input className="input-field" value={newLog.ncm} onChange={e => setNewLog({ ...newLog, ncm: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">CFOP</label>
                                <input className="input-field" value={newLog.cfop} onChange={e => setNewLog({ ...newLog, cfop: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Base Cálc. (R$)</label>
                                <input type="number" step="0.01" className="input-field" value={newLog.v_bc} onChange={e => setNewLog({ ...newLog, v_bc: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="label">Vlr ICMS (R$)</label>
                                <input type="number" step="0.01" className="input-field" value={newLog.v_icms} onChange={e => setNewLog({ ...newLog, v_icms: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="label">Vlr IPI (R$)</label>
                                <input type="number" step="0.01" className="input-field" value={newLog.v_ipi} onChange={e => setNewLog({ ...newLog, v_ipi: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="label">Vlr PIS (R$)</label>
                                <input type="number" step="0.01" className="input-field" value={newLog.v_pis} onChange={e => setNewLog({ ...newLog, v_pis: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="label">Vlr COFINS (R$)</label>
                                <input type="number" step="0.01" className="input-field" value={newLog.v_cofins} onChange={e => setNewLog({ ...newLog, v_cofins: parseFloat(e.target.value) })} />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Motivo / Observação</label>
                                <input className="input-field" placeholder="Ex: Compra de estoque, Ajuste, Venda..." value={newLog.reason} onChange={e => setNewLog({ ...newLog, reason: e.target.value })} required />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Registrar Movimentação</button>
                    </form>
                ) : (
                    <form onSubmit={handleDanfeProcess} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="label">PJ Prestador Responsável</label>
                            <select className="input-field" value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)} required>
                                <option value="">Selecionar Parceiro</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.cnpj})</option>)}
                            </select>
                            <small color="var(--text-muted)">O parceiro deve ter o certificado .p12 cadastrado.</small>
                        </div>
                        <div>
                            <label className="label">Chave de Acesso da DANFE</label>
                            <input
                                className="input-field"
                                placeholder="44 dígitos da chave"
                                value={danfeKey}
                                onChange={e => setDanfeKey(e.target.value.replace(/[^0-9]/g, ''))}
                                required
                                maxLength={44}
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
                            {loading ? 'Processando... (Pode levar alguns segundos)' : 'Importar DANFE e Gerar Estoque'}
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default InventoryPage;
