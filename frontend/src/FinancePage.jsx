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
        if (!contract || !contract.start_date) return [];
        const invoices = [];

        // Parse date manually or use new Date if ISO string to avoid timezone shifts
        let startDate;
        if (contract.start_date.includes('-')) {
            const dateParts = contract.start_date.split('T')[0].split('-');
            startDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        } else {
            startDate = new Date(contract.start_date);
        }

        if (isNaN(startDate.getTime())) return [];

        const paymentDay = parseInt(contract.payment_day) || 1;
        const durationMonths = parseInt(contract.duration_months) || 0;

        // Determine the first month's due date
        let firstDueDate = new Date(startDate.getFullYear(), startDate.getMonth(), paymentDay);

        // If firstDueDate is before startDate, we move to next month to ensure payment is after start
        if (firstDueDate < startDate) {
            firstDueDate = addMonths(firstDueDate, 1);
        }

        for (let i = 0; i < durationMonths; i++) {
            // Generate each month independently
            let dueDate = addMonths(firstDueDate, i);

            // Re-apply the payment day, capping to the month's maximum (e.g. 31 in Feb becomes 28)
            const year = dueDate.getFullYear();
            const month = dueDate.getMonth();
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            dueDate.setDate(Math.min(paymentDay, lastDayOfMonth));

            if (isNaN(dueDate.getTime())) continue;

            const isPaid = currentPayments.some(p => {
                const refDate = p.due_date_ref ? new Date(p.due_date_ref) : null;
                if (refDate && !isNaN(refDate.getTime())) {
                    return isSameMonth(refDate, dueDate) && isSameYear(refDate, dueDate);
                }

                if (p.description === `Parcela ${i + 1}`) return true;

                const pDate = p.payment_date ? new Date(p.payment_date) : null;
                if (pDate && !isNaN(pDate.getTime())) {
                    return isSameMonth(pDate, dueDate) && isSameYear(pDate, dueDate);
                }
                return false;
            });

            invoices.push({
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                amount: contract.total_value,
                isPaid,
                label: `Parcela ${i + 1}`
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
                description: invoice.label,
                payment_date: format(new Date(), 'yyyy-MM-dd'),
                due_date_ref: invoice.dueDate,
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

            {/* MODAL PAGAMENTOS MENSALIDADES - Versão Grid de Parcelas (Transportada de Contratos) */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Faturas: ${selectedClient?.name}`} width="900px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1.2rem',
                        maxHeight: '600px',
                        overflowY: 'auto',
                        padding: '1rem',
                        backgroundColor: 'var(--bg-sidebar)',
                        borderRadius: '0.75rem'
                    }}>
                        {editableInvoices.map((inv, idx) => (
                            <div key={idx} style={{
                                padding: '1.2rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border)',
                                backgroundColor: inv.isPaid ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem',
                                position: 'relative',
                                transition: 'transform 0.2s',
                                boxShadow: inv.isPaid ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>{inv.label}</span>
                                    {inv.isPaid && <CheckCircle size={16} color="#10b981" />}
                                </div>

                                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Vencimento</p>
                                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{format(new Date(inv.dueDate), 'dd/MM/yyyy')}</p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Valor</p>
                                    <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                                        R$ {parseFloat(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div style={{ marginTop: '0.5rem' }}>
                                    {inv.isPaid ? (
                                        <span style={{
                                            display: 'block',
                                            textAlign: 'center',
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            backgroundColor: '#dcfce7',
                                            color: '#166534'
                                        }}>PAGO</span>
                                    ) : (
                                        <button
                                            onClick={() => handlePayInvoice(inv, idx)}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '0.6rem', backgroundColor: '#10b981', fontSize: '0.8rem' }}
                                        >
                                            Confirmar Recebimento
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* MODAL VENDAS/SERVIÇOS AVULSOS */}
            <Modal isOpen={isExtraSalesModalOpen} onClose={() => setIsExtraSalesModalOpen(false)} title={`Vendas e Serviços: ${selectedClient?.name}`} width="900px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {extraSales.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma venda avulsa para este cliente.</p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: '1.2rem',
                            maxHeight: '600px',
                            overflowY: 'auto',
                            padding: '1rem',
                            backgroundColor: 'var(--bg-sidebar)',
                            borderRadius: '0.75rem'
                        }}>
                            {extraSales.map(s => (
                                <div key={s.id} style={{
                                    padding: '1.2rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border)',
                                    backgroundColor: s.status === 'Pago' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.6rem',
                                    position: 'relative',
                                    boxShadow: s.status === 'Pago' ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>#{s.id} - VAN/SERVIÇO</span>
                                        {s.status === 'Pago' && <CheckCircle size={16} color="#10b981" />}
                                    </div>

                                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Execução / Venda</p>
                                        <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{format(new Date(s.execution_date), 'dd/MM/yyyy')}</p>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Descrição</p>
                                        <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-main)', fontWeight: 500 }}>
                                            {s.product_description || 'Itens diversos'}
                                        </p>
                                    </div>

                                    <div style={{ marginTop: '0.5rem' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Valor Total</p>
                                        <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                                            R$ {parseFloat(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>

                                    <div style={{ marginTop: '0.5rem' }}>
                                        {s.status === 'Pago' ? (
                                            <span style={{
                                                display: 'block',
                                                textAlign: 'center',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                backgroundColor: '#dcfce7',
                                                color: '#166534'
                                            }}>PAGO</span>
                                        ) : (
                                            <button
                                                onClick={() => markSaleAsPaid(s)}
                                                className="btn-primary"
                                                style={{ width: '100%', padding: '0.6rem', backgroundColor: '#10b981', fontSize: '0.8rem' }}
                                            >
                                                Confirmar Recebimento
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default FinancePage;
