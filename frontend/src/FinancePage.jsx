import React, { useState, useEffect } from 'react';
import api from './api';
import { Search, CreditCard, ShoppingBag, CheckCircle, Clock, Info, ArrowLeft } from 'lucide-react';
import Modal from './Modal';
import { format, addMonths, isSameMonth, isSameYear } from 'date-fns';

const FinancePage = () => {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    // Monthly Fees (Contracts) States
    const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
    const [clientContracts, setClientContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payments, setPayments] = useState([]);
    const [invoicePage, setInvoicePage] = useState(0);

    // Extra Sales States
    const [isExtraSalesModalOpen, setIsExtraSalesModalOpen] = useState(false);
    const [extraSales, setExtraSales] = useState([]);
    const [editableInvoices, setEditableInvoices] = useState([]);

    const fetchData = async () => {
        try {
            const res = await api.get('/clients', { params: { search } });
            setClients(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const timer = setTimeout(fetchData, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const openContracts = async (client) => {
        setSelectedClient(client);
        try {
            const { data } = await api.get('/contracts');
            setClientContracts(data.filter(c => c.client_id === client.id && c.status === 'Ativo'));
            setIsContractsModalOpen(true);
        } catch (err) { console.error(err); }
    };

    const openPayments = async (contract) => {
        setSelectedContract(contract);
        setInvoicePage(0);
        try {
            const { data } = await api.get(`/contracts/${contract.id}/payments`);
            setPayments(data);
            setEditableInvoices(buildInvoices(contract, data));
            setIsPaymentModalOpen(true);
        } catch (err) { console.error(err); }
    };

    const buildInvoices = (contract, currentPayments) => {
        if (!contract) return [];
        const invoices = [];
        const startDate = new Date(contract.start_date);

        for (let i = 0; i < contract.duration_months; i++) {
            const dueDate = addMonths(startDate, i);
            dueDate.setDate(contract.payment_day);

            const isPaid = currentPayments.some(p =>
                isSameMonth(new Date(p.payment_date), dueDate) &&
                isSameYear(new Date(p.payment_date), dueDate)
            );

            invoices.push({
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                amount: contract.total_value,
                isPaid
            });
        }
        return invoices;
    };

    const handleInvoiceChange = (index, field, value) => {
        const newInvoices = [...editableInvoices];
        newInvoices[index] = { ...newInvoices[index], [field]: value };
        setEditableInvoices(newInvoices);
    };

    const handlePayInvoice = async (invoice, index) => {
        try {
            await api.post('/payments', {
                amount: invoice.amount,
                description: `Mensalidade ref. ${format(new Date(invoice.dueDate), 'MM/yyyy')}`,
                payment_date: format(new Date(), 'yyyy-MM-dd'),
                due_date_ref: format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
                contract_id: selectedContract.id
            });
            const { data } = await api.get(`/contracts/${selectedContract.id}/payments`);
            setPayments(data);

            const updated = [...editableInvoices];
            updated[index].isPaid = true;
            setEditableInvoices(updated);
        } catch (err) {
            console.error('Erro ao registrar pagamento:', err);
            alert(`Erro ao registrar pagamento: ${err.response?.data?.error || err.message}`);
        }
    };

    const generateInvoices = () => {
        if (!selectedContract) return [];
        const invoices = [];
        const startDate = new Date(selectedContract.start_date);

        for (let i = 0; i < selectedContract.duration_months; i++) {
            const dueDate = addMonths(startDate, i);
            dueDate.setDate(selectedContract.payment_day);

            const isPaid = payments.some(p => {
                const pDate = p.due_date_ref ? new Date(p.due_date_ref) : new Date(p.payment_date);
                // Adjust for timezone if necessary or just compare components
                return pDate.getUTCMonth() === dueDate.getUTCMonth() &&
                    pDate.getUTCFullYear() === dueDate.getUTCFullYear();
            });

            invoices.push({
                dueDate,
                amount: selectedContract.total_value,
                isPaid
            });
        }
        return invoices;
    };

    const openExtraSales = async (client) => {
        setSelectedClient(client);
        try {
            const { data } = await api.get('/extra-sales');
            setExtraSales(data.filter(s => s.client_id === client.id));
            setIsExtraSalesModalOpen(true);
        } catch (err) { console.error(err); }
    };

    const markSaleAsPaid = async (sale) => {
        try {
            await api.patch(`/extra-sales/${sale.id}/status`, { status: 'Pago' });
            const { data } = await api.get('/extra-sales');
            setExtraSales(data.filter(s => s.client_id === selectedClient.id));
        } catch (err) { alert("Erro ao atualizar status"); }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestão Financeira</h2>
                <p style={{ color: 'var(--text-muted)' }}>Controle de mensalidades e vendas avulsas por cliente.</p>
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
                            <th>Telefone</th>
                            <th>Endereço</th>
                            <th style={{ width: '200px' }}>Ações Financeiras</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id}>
                                <td data-label="Cliente" style={{ fontWeight: 600 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginRight: '0.5rem' }}>#{client.id}</span>
                                    {client.name}
                                </td>
                                <td data-label="Telefone">{client.phone}</td>
                                <td data-label="Endereço" style={{ fontSize: '0.85rem' }}>{client.address}</td>
                                <td data-label="Ações Financeiras">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => openContracts(client)} className="btn-primary" title="Mensalidades" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }}>
                                            <CreditCard size={22} />
                                        </button>
                                        <button onClick={() => openExtraSales(client)} className="btn-primary" title="Vendas Avulsas" style={{ padding: '0.8rem', backgroundColor: '#8b5cf6' }}>
                                            <ShoppingBag size={22} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL CONTRATOS (MENSALIDADES) */}
            <Modal isOpen={isContractsModalOpen} onClose={() => setIsContractsModalOpen(false)} title={`Contratos Ativos: ${selectedClient?.name}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {clientContracts.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum contrato ativo para este cliente.</p>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Valor Mensal</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientContracts.map(c => (
                                        <tr key={c.id}>
                                            <td data-label="Tipo">{c.type}</td>
                                            <td data-label="Valor Mensal">R$ {parseFloat(c.total_value).toFixed(2)}</td>
                                            <td data-label="Ação">
                                                <button onClick={() => openPayments(c)} className="btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 1.6rem' }}>Faturas / Receber</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            {/* MODAL PAGAMENTOS MENSALIDADES - Versão Faturas Geradas */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Faturas: ${selectedClient?.name}`} width="800px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Vencimento</th>
                                    <th>Valor Estimado</th>
                                    <th>Status</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const perPage = 12;
                                    const displayed = editableInvoices.slice(invoicePage * perPage, (invoicePage + 1) * perPage);

                                    return displayed.map((inv, idx) => {
                                        const globalIndex = invoicePage * perPage + idx;
                                        return (
                                            <tr key={globalIndex}>
                                                <td data-label="Vencimento">
                                                    <input
                                                        type="date"
                                                        className="input-field"
                                                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                                        value={inv.dueDate}
                                                        onChange={(e) => handleInvoiceChange(globalIndex, 'dueDate', e.target.value)}
                                                        disabled={inv.isPaid}
                                                    />
                                                </td>
                                                <td data-label="Valor Estimado">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <span style={{ fontSize: '0.85rem' }}>R$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input-field"
                                                            style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                                            value={inv.amount}
                                                            onChange={(e) => handleInvoiceChange(globalIndex, 'amount', parseFloat(e.target.value))}
                                                            disabled={inv.isPaid}
                                                        />
                                                    </div>
                                                </td>
                                                <td data-label="Status">
                                                    <span style={{
                                                        padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem',
                                                        backgroundColor: inv.isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: inv.isPaid ? '#10b981' : '#ef4444'
                                                    }}>
                                                        {inv.isPaid ? 'Pago' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td data-label="Ação">
                                                    {!inv.isPaid && (
                                                        <button onClick={() => handlePayInvoice(inv, globalIndex)} className="btn-primary" style={{ fontSize: '0.9rem', padding: '0.8rem 1.2rem', backgroundColor: '#10b981' }}>
                                                            Confirmar Pagamento
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINAÇÃO */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                        <button
                            disabled={invoicePage === 0}
                            onClick={() => setInvoicePage(p => p - 1)}
                            className="btn-primary"
                            style={{ padding: '0.5rem 1rem', opacity: invoicePage === 0 ? 0.5 : 1 }}
                        >
                            Anterior
                        </button>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Página {invoicePage + 1}</span>
                        <button
                            disabled={(invoicePage + 1) * 12 >= editableInvoices.length}
                            onClick={() => setInvoicePage(p => p + 1)}
                            className="btn-primary"
                            style={{ padding: '0.5rem 1rem', opacity: (invoicePage + 1) * 12 >= editableInvoices.length ? 0.5 : 1 }}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL VENDAS/SERVIÇOS AVULSOS */}
            <Modal isOpen={isExtraSalesModalOpen} onClose={() => setIsExtraSalesModalOpen(false)} title={`Vendas e Serviços: ${selectedClient?.name}`} width="800px">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th style={{ width: '150px' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {extraSales.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma venda avulsa para este cliente.</td></tr>
                            ) : extraSales.map(s => (
                                <tr key={s.id}>
                                    <td data-label="Data">{format(new Date(s.execution_date), 'dd/MM/yyyy')}</td>
                                    <td data-label="Descrição">{s.product_description}</td>
                                    <td data-label="Valor" style={{ fontWeight: 600 }}>R$ {parseFloat(s.price).toFixed(2)}</td>
                                    <td data-label="Status">
                                        <span style={{
                                            padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem',
                                            backgroundColor: s.status === 'Pago' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: s.status === 'Pago' ? '#10b981' : '#f59e0b'
                                        }}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td data-label="Ação">
                                        {s.status !== 'Pago' && (
                                            <button onClick={() => markSaleAsPaid(s)} className="btn-primary" style={{ backgroundColor: '#10b981', fontSize: '0.9rem', padding: '0.8rem 1.2rem' }}>
                                                Marcar Pago
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
};

export default FinancePage;
