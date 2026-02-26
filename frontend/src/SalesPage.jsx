import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import api from './api';
import { ShoppingCart, Plus, Search, FileText, CheckCircle, Clock, Trash2, Edit2, Package, XCircle } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import { format } from 'date-fns';
import { getReceiptPDFBlobURL } from './ReceiptGenerator';
import ClientQuickAddModal from './ClientQuickAddModal';

// Helpers de moeda BR
const parseCurrencyInput = (raw) => {
    if (raw === '' || raw === null || raw === undefined) return 0;
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim().replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
};

const formatCurrency = (val) => {
    const num = typeof val === 'number' ? val : parseCurrencyInput(val);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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

    // Edit state
    const [editingSaleId, setEditingSaleId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState(null);

    const [newSale, setNewSale] = useState({
        client_id: '', seller_id: '', partner_id: '',
        execution_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        items: [] // { product_id, description, quantity, price, cost }
    });

    const [tempItem, setTempItem] = useState({
        product_id: '',
        description: '',
        quantity: 1,
        price: '',
        cost: ''
    });

    const fetchData = async () => {
        try {
            const [sRes, clRes, slRes, pRes, prRes] = await Promise.all([
                api.get('/extra-sales'), api.get('/clients'), api.get('/sellers'), api.get('/partners'), api.get('/products')
            ]);
            setSales(sRes.data);
            setClients(clRes.data);
            setSellers(slRes.data);
            setPartners(pRes.data);
            setProducts(prRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const calculateTotals = (items) => {
        const totalCost = items.reduce((acc, curr) => acc + (parseCurrencyInput(curr.cost) * (curr.quantity || 1)), 0);
        const totalPrice = items.reduce((acc, curr) => acc + (parseCurrencyInput(curr.price) * (curr.quantity || 1)), 0);
        return { totalCost, totalPrice };
    };

    const addItem = () => {
        if (!tempItem.description || !tempItem.price) {
            showToast("Preencha a descrição e o preço do item", "warning");
            return;
        }

        const price = parseCurrencyInput(tempItem.price);
        const cost = parseCurrencyInput(tempItem.cost);
        const quantity = parseInt(tempItem.quantity) || 1;

        const updatedItems = [...newSale.items, {
            ...tempItem,
            price,
            cost,
            quantity
        }];

        const { totalCost, totalPrice } = calculateTotals(updatedItems);

        setNewSale({
            ...newSale,
            items: updatedItems,
            cost: totalCost,
            price: totalPrice,
            product_description: updatedItems.map(i => i.description).join(', ').substring(0, 200)
        });

        setTempItem({ product_id: '', description: '', quantity: 1, price: '', cost: '' });
    };


    const removeItem = (index) => {
        const updatedItems = newSale.items.filter((_, i) => i !== index);
        const { totalCost, totalPrice } = calculateTotals(updatedItems);
        setNewSale({
            ...newSale,
            items: updatedItems,
            cost: totalCost,
            price: totalPrice,
            product_description: updatedItems.map(i => i.description).join(', ').substring(0, 200)
        });
    };

    const handleCreate = async () => {
        try {
            const dataToSend = { ...newSale };
            if (!dataToSend.client_id) dataToSend.client_id = null;
            if (!dataToSend.seller_id) dataToSend.seller_id = null;
            if (!dataToSend.partner_id) dataToSend.partner_id = null;

            dataToSend.cost = parseCurrencyInput(dataToSend.cost);
            dataToSend.price = parseCurrencyInput(dataToSend.price);

            if (editingSaleId) {
                await api.patch(`/extra-sales/${editingSaleId}`, dataToSend);
                showToast("Venda atualizada com sucesso!", "success");
            } else {
                await api.post('/extra-sales', dataToSend);
                showToast("Venda registrada com sucesso!", "success");
            }

            setIsAddModalOpen(false);
            setPreviewSale(null);
            setEditingSaleId(null);
            resetNewSale();
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Erro ao processar venda: " + (err.response?.data?.error || err.message), "error");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/extra-sales/${saleToDelete.id}`);
            showToast("Venda excluída com sucesso!", "success");
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (err) {
            showToast("Erro ao excluir venda", "error");
        }
    };

    const startEdit = (sale) => {
        setEditingSaleId(sale.id);
        const saleItems = Array.isArray(sale.items) ? sale.items : [];
        const { totalCost, totalPrice } = calculateTotals(saleItems);

        setNewSale({
            client_id: sale.client_id,
            seller_id: sale.seller_id,
            partner_id: sale.partner_id,
            execution_date: format(new Date(sale.execution_date), 'yyyy-MM-dd'),
            description: sale.description || '',
            items: saleItems,
            cost: totalCost,
            price: totalPrice
        });
        setClientSearch(sale.client_name || '');
        setIsAddModalOpen(true);
    };

    const resetNewSale = () => {
        setNewSale({
            client_id: '', seller_id: '', partner_id: '',
            execution_date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            items: [],
            cost: 0,
            price: 0
        });
        setClientSearch('');
        setEditingSaleId(null);
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
                <button onClick={() => { resetNewSale(); setIsAddModalOpen(true); }} className="btn-primary">
                    <Plus size={18} /> Nova Venda/Serviço
                </button>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar por cliente, vendedor ou descrição..."
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
                            <th>Descrição / Itens</th>
                            <th>Valor Total</th>
                            <th>Vendedor</th>
                            <th>Status/Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.filter(s => {
                            const term = search.toLowerCase();
                            return s.client_name?.toLowerCase().includes(term) ||
                                s.seller_name?.toLowerCase().includes(term) ||
                                s.product_description?.toLowerCase().includes(term);
                        }).map(sale => (
                            <tr key={sale.id}>
                                <td data-label="Data">{format(new Date(sale.execution_date), 'dd/MM/yyyy')}</td>
                                <td data-label="Cliente">
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginRight: '0.5rem' }}>#{sale.client_id}</span>
                                    {sale.client_name}
                                </td>
                                <td data-label="Descrição" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {sale.product_description || 'Itens variados'}
                                </td>
                                <td data-label="Valor" style={{ fontWeight: 600 }}>R$ {formatCurrency(sale.price)}</td>
                                <td data-label="Vendedor">{sale.seller_name}</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => window.open(getReceiptPDFBlobURL(sale), '_blank')} className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#3b82f6' }} title="Gerar PDF">
                                            <FileText size={18} />
                                        </button>
                                        <button onClick={() => startEdit(sale)} className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#fbbf24' }} title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => { setSaleToDelete(sale); setIsDeleteModalOpen(true); }} className="btn-primary" style={{ padding: '0.6rem', backgroundColor: '#ef4444' }} title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setPreviewSale(null); }} title={previewSale ? "Preview da Venda" : (editingSaleId ? "Editar Venda" : "Nova Venda Avulsa")} width="900px">
                {!previewSale ? (
                    <div className="responsive-form-grid">
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

                        <div className="mobile-full-width">
                            <label className="label">Empresa Faturadora</label>
                            <select className="input-field" value={newSale.partner_id} onChange={e => setNewSale({ ...newSale, partner_id: e.target.value })} required>
                                <option value="">Selecionar Empresa</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="mobile-full-width">
                            <label className="label">Vendedor Responsável</label>
                            <select className="input-field" value={newSale.seller_id} onChange={e => setNewSale({ ...newSale, seller_id: e.target.value })} required>
                                <option value="">Selecionar Vendedor</option>
                                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2', padding: '1.5rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.75rem', marginTop: '1rem' }}>
                            <h4 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={18} /> Itens da Venda</h4>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                marginBottom: '1.5rem',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                    <div style={{ flex: '2', minWidth: '180px' }}>
                                        <label className="label">Produto/Serviço</label>
                                        <select className="input-field" value={tempItem.product_id} onChange={e => {
                                            const p = products.find(prod => prod.id == e.target.value);
                                            setTempItem({ ...tempItem, product_id: e.target.value, description: p ? p.description : '', cost: p ? p.cost : '', price: p ? p.price : '' });
                                        }}>
                                            <option value="">-- Selecionar ou Digitar abaixo --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
                                        </select>
                                        <input className="input-field" style={{ marginTop: '0.5rem' }} placeholder="Descrição manual..." value={tempItem.description} onChange={e => setTempItem({ ...tempItem, description: e.target.value, product_id: '' })} />
                                    </div>
                                    <div style={{ flex: '0.5', minWidth: '80px' }}>
                                        <label className="label">Qtd</label>
                                        <input type="number" className="input-field" value={tempItem.quantity} onChange={e => setTempItem({ ...tempItem, quantity: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div style={{ flex: '1', minWidth: '120px' }}>
                                        <label className="label">Custo Unit.</label>
                                        <input type="text" className="input-field" placeholder="0,00" value={tempItem.cost} onChange={e => setTempItem({ ...tempItem, cost: e.target.value })} />
                                    </div>
                                    <div style={{ flex: '1', minWidth: '120px' }}>
                                        <label className="label">Venda Unit.</label>
                                        <input type="text" className="input-field" placeholder="0,00" value={tempItem.price} onChange={e => setTempItem({ ...tempItem, price: e.target.value })} />
                                    </div>
                                </div>
                                <button type="button" onClick={addItem} className="btn-primary" style={{ backgroundColor: 'var(--primary)', alignSelf: 'flex-end', padding: '0.8rem 2rem', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Plus size={20} /> Adicionar Item ao Carrinho
                                </button>
                            </div>

                            {newSale.items.length > 0 && (
                                <div className="table-container" style={{ marginTop: '1.5rem' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qtd</th>
                                                <th>Custo</th>
                                                <th>Venda</th>
                                                <th>Total (Venda)</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newSale.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.description}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>R$ {formatCurrency(item.cost)}</td>
                                                    <td>R$ {formatCurrency(item.price)}</td>
                                                    <td style={{ fontWeight: 700 }}>R$ {formatCurrency(parseCurrencyInput(item.price) * item.quantity)}</td>
                                                    <td>
                                                        <button onClick={() => removeItem(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Observações da OS</label>
                            <textarea className="input-field" placeholder="Detalhes técnicos..." value={newSale.description} onChange={e => setNewSale({ ...newSale, description: e.target.value })} style={{ minHeight: '80px' }} />
                        </div>

                        <div className="mobile-full-width">
                            <label className="label">Data de Execução</label>
                            <input type="date" className="input-field" value={newSale.execution_date} onChange={e => setNewSale({ ...newSale, execution_date: e.target.value })} required />
                        </div>

                        <div className="mobile-full-width" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '0.6rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custo Total:</p>
                                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>R$ {formatCurrency(newSale.cost || 0)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Venda Total:</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>R$ {formatCurrency(newSale.price || 0)}</p>
                            </div>
                            <div style={{ textAlign: 'right', borderTop: '2px solid var(--border)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Abatimento (Margem):</p>
                                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>R$ {formatCurrency((newSale.price || 0) - (newSale.cost || 0))}</p>
                            </div>
                        </div>

                        <button onClick={() => { if (newSale.items.length === 0 && !newSale.product_description) { showToast("Adicione ao menos um item", "warning"); return; } setPreviewSale(newSale); }} className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Ir para Preview</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '0.75rem', backgroundColor: 'var(--bg-card)' }}>
                            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>RESUMO DA VENDA / OS</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>CLIENTE</p>
                                    <p style={{ fontWeight: 700 }}>{clients.find(c => c.id == previewSale.client_id)?.name}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>DATA</p>
                                    <p style={{ fontWeight: 700 }}>{previewSale.execution_date ? format(new Date(previewSale.execution_date + 'T12:00:00'), 'dd/MM/yyyy') : '--'}</p>
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
                                <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>ITENS:</p>
                                {previewSale.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                                        <span>{it.quantity}x {it.description}</span>
                                        <span>R$ {formatCurrency(parseCurrencyInput(it.price) * it.quantity)}</span>
                                    </div>
                                ))}
                                <div style={{ marginTop: '1rem', textAlign: 'right', borderTop: '2px solid var(--primary)', paddingTop: '0.5rem' }}>
                                    <span style={{ fontSize: '0.9rem' }}>TOTAL A RECEBER: </span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>R$ {formatCurrency(previewSale.price)}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setPreviewSale(null)} className="btn-primary" style={{ flex: 1, backgroundColor: '#6b7280' }}>Voltar e Corrigir</button>
                            <button onClick={handleCreate} className="btn-primary" style={{ flex: 1, backgroundColor: '#10b981' }}>{editingSaleId ? "Salvar Alterações" : "Confirmar e Gerar OS"}</button>
                        </div>
                    </div>
                )}
            </Modal>

            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Venda"
                message="Tem certeza que deseja excluir permanentemente esta venda avulsa e sua respectiva Ordem de Serviço?"
            />

            <ClientQuickAddModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientAdded={handleQuickClientAdded}
            />
        </div>
    );
};

export default SalesPage;
