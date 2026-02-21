import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import api from './api';
import { ShoppingCart, Plus, Search, FileText, CheckCircle, Clock } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import { format } from 'date-fns';
import { generateReceiptPDF, getReceiptPDFBlobURL } from './ReceiptGenerator';
import ClientQuickAddModal from './ClientQuickAddModal';

const SalesPage = () => {
    const { showToast } = useToast();
    const [sales, setSales] = useState([]);
    const [clients, setClients] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [partners, setPartners] = useState([]);
    const [products, setProducts] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [previewSale, setPreviewSale] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const [newSale, setNewSale] = useState({
        client_id: '', seller_id: '', partner_id: '', product_id: '',
        product_description: '', cost: 0, price: 0, execution_date: format(new Date(), 'yyyy-MM-dd'),
        description: ''
    });

    const fetchData = async () => {
        const [sRes, clRes, slRes, pRes, prRes] = await Promise.all([
            api.get('/extra-sales'), api.get('/clients'), api.get('/sellers'), api.get('/partners'), api.get('/products')
        ]);
        setSales(sRes.data);
        setClients(clRes.data);
        setSellers(slRes.data);
        setPartners(pRes.data);
        setProducts(prRes.data);
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async () => {
        try {
            const dataToSend = { ...newSale };
            if (!dataToSend.client_id) dataToSend.client_id = null;
            if (!dataToSend.seller_id) dataToSend.seller_id = null;
            if (!dataToSend.partner_id) dataToSend.partner_id = null;
            if (!dataToSend.product_id) dataToSend.product_id = null;

            const res = await api.post('/extra-sales', dataToSend);

            if (res.isOffline) {
                showToast("Venda salva offline! Será sincronizada assim que a conexão retornar.", "warning");
            } else {
                showToast("Venda registrada com sucesso!", "success");
            }

            setIsAddModalOpen(false);
            setPreviewSale(null);
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Erro ao registrar venda: " + (err.response?.data?.error || err.message), "error");
        }
    };

    const filteredClients = clients.filter(c => {
        if (clientSearch.startsWith('#')) {
            const id = clientSearch.substring(1).toLowerCase();
            return c.id.toString() === id;
        }
        return c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            (c.cnpj && c.cnpj.includes(clientSearch));
    });

    const handleQuickClientAdded = (client) => {
        setClients([...clients, client]);
        setNewSale({ ...newSale, client_id: client.id });
        setIsClientModalOpen(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Vendas e Serviços Avulsos</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                    <Plus size={18} /> Nova Venda/Serviço
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
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Descrição / Produto</th>
                            <th>Valor</th>
                            <th>Vendedor</th>
                            <th>Status OS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.filter(s => {
                            if (search.startsWith('#')) {
                                const id = search.substring(1).toLowerCase();
                                return s.client_id?.toString() === id;
                            }
                            return s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
                                s.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
                                s.product_description?.toLowerCase().includes(search.toLowerCase());
                        }).map(sale => (
                            <tr key={sale.id}>
                                <td data-label="Data">{format(new Date(sale.execution_date), 'dd/MM/yyyy')}</td>
                                <td data-label="Cliente">
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginRight: '0.5rem' }}>#{sale.client_id}</span>
                                    {sale.client_name}
                                </td>
                                <td data-label="Descrição">{sale.product_description || 'Produto do Estoque'}</td>
                                <td data-label="Valor" style={{ fontWeight: 600 }}>R$ {parseFloat(sale.price).toFixed(2)}</td>
                                <td data-label="Vendedor">{sale.seller_name}</td>
                                <td data-label="Status OS">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.8rem' }}>
                                            <Clock size={14} /> OS Gerada
                                        </span>
                                        <button onClick={() => window.open(getReceiptPDFBlobURL(sale), '_blank')} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#3b82f6' }}>
                                            <FileText size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


            <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setPreviewSale(null); }} title={previewSale ? "Preview da Ordem de Venda" : "Nova Venda de Serviço/Produto"}>
                {!previewSale ? (
                    <form onSubmit={(e) => { e.preventDefault(); setPreviewSale(newSale); }} className="responsive-form-grid">
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Pesquisar Cliente</label>
                            <input className="input-field" placeholder="Nome ou CNPJ..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <select className="input-field" value={newSale.client_id} onChange={e => setNewSale({ ...newSale, client_id: e.target.value })} required style={{ flex: 1 }}>
                                    <option value="">-- Selecionar Cliente --</option>
                                    {filteredClients.map(cl => <option key={cl.id} value={cl.id}>[#{cl.id}] {cl.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setIsClientModalOpen(true)} className="btn-primary" style={{ backgroundColor: '#10b981', padding: '0.5rem' }}>
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Empresa Faturadora</label>
                            <select className="input-field" value={newSale.partner_id} onChange={e => setNewSale({ ...newSale, partner_id: e.target.value })} required>
                                <option value="">Selecionar Empresa</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Produto do Estoque (Opcional)</label>
                            <select className="input-field" value={newSale.product_id} onChange={e => {
                                const prod = products.find(p => p.id == e.target.value);
                                setNewSale({
                                    ...newSale,
                                    product_id: e.target.value,
                                    product_description: prod ? prod.description : '',
                                    cost: prod ? parseFloat(prod.cost) : 0
                                });
                            }}>
                                <option value="">-- Selecionar do Estoque ou digitar abaixo --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.description} (Custo: R$ {parseFloat(p.cost).toFixed(2)})</option>)}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Produto / Serviço Principal</label>
                            <input className="input-field" value={newSale.product_description} onChange={e => setNewSale({ ...newSale, product_description: e.target.value })} required />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Descrição do Serviço (Obrigatório)</label>
                            <textarea
                                className="input-field"
                                placeholder="Descreva os detalhes importantes para a execução..."
                                value={newSale.description}
                                onChange={e => setNewSale({ ...newSale, description: e.target.value })}
                                required
                                style={{ minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Custo da Venda (R$)</label>
                            <input type="number" step="0.01" className="input-field" value={newSale.cost} onChange={e => setNewSale({ ...newSale, cost: parseFloat(e.target.value) })} required />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Preço de Venda (R$)</label>
                            <input type="number" step="0.01" className="input-field" value={newSale.price} onChange={e => setNewSale({ ...newSale, price: parseFloat(e.target.value) })} required />
                        </div>

                        <div className="mobile-full-width">
                            <label className="label">Vendedor Responsável</label>
                            <select className="input-field" value={newSale.seller_id} onChange={e => setNewSale({ ...newSale, seller_id: e.target.value })} required>
                                <option value="">Selecionar Vendedor</option>
                                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="mobile-full-width">
                            <label className="label">Data de Execução</label>
                            <input type="date" className="input-field" value={newSale.execution_date} onChange={e => setNewSale({ ...newSale, execution_date: e.target.value })} required />
                        </div>

                        <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Gerar Preview de OS</button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-sidebar)' }}>
                            <p style={{ fontWeight: 700, textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>ORDEM DE SERVIÇO / VENDA AVULSA</p>
                            <p><b>Cliente:</b> {clients.find(c => c.id == previewSale.client_id)?.name}</p>
                            <p><b>Data:</b> {format(new Date(previewSale.execution_date), 'dd/MM/yyyy')}</p>
                            <p><b>Descrição:</b> {previewSale.product_description}</p>
                            <p><b>Valor:</b> R$ {previewSale.price.toFixed(2)}</p>
                            <p><b>Vendedor:</b> {sellers.find(s => s.id == previewSale.seller_id)?.name}</p>
                            <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.4rem', fontSize: '0.8rem' }}>
                                <p>Nota: Esta venda debitará 1 un. do estoque (se selecionado) e gerará comissão sobre o lucro.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setPreviewSale(null)} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-muted)' }}>Editar</button>
                            <button onClick={handleCreate} className="btn-primary" style={{ flex: 1 }}>Aprovar e Emitir</button>
                        </div>
                    </div>
                )}
            </Modal>

            <ClientQuickAddModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientAdded={handleQuickClientAdded}
            />
        </div>
    );
};

export default SalesPage;
