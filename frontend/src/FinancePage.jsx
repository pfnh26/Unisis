import React, { useState, useEffect } from 'react';
import api from './api';
import { Search, CreditCard, ShoppingBag, CheckCircle, Clock, Info, ArrowLeft, Send } from 'lucide-react';
import Modal from './Modal';
import { format, addMonths, isSameMonth, isSameYear } from 'date-fns';
import { FileText } from 'lucide-react';
import { generateInvoicePDF } from './InvoiceGenerator';

const FinancePage = () => {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [partners, setPartners] = useState([]);

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
    const [isSaving, setIsSaving] = useState(false);

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

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const { data } = await api.get('/partners');
                setPartners(data);
            } catch (err) { console.error(err); }
        };
        fetchPartners();
    }, []);

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

        // Determine the first month's due date (sempre para o mês seguinte conforme o contrato)
        let firstDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, paymentDay);

        for (let i = 0; i < durationMonths; i++) {
            // Generate each month independently
            let dueDate = addMonths(firstDueDate, i);

            // Re-apply the payment day, capping to the month's maximum (e.g. 31 in Feb becomes 28)
            const year = dueDate.getFullYear();
            const month = dueDate.getMonth();
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            dueDate.setDate(Math.min(paymentDay, lastDayOfMonth));

            if (isNaN(dueDate.getTime())) continue;

            let paymentId = null;
            const isPaid = currentPayments.some(p => {
                const refDate = p.due_date_ref ? new Date(p.due_date_ref) : null;
                if (refDate && !isNaN(refDate.getTime())) {
                    if (isSameMonth(refDate, dueDate) && isSameYear(refDate, dueDate)) {
                        paymentId = p.id;
                        return true;
                    }
                }

                if (p.description === `Parcela ${i + 1}`) {
                    paymentId = p.id;
                    return true;
                }

                const pDate = p.payment_date ? new Date(p.payment_date) : null;
                if (pDate && !isNaN(pDate.getTime())) {
                    if (isSameMonth(pDate, dueDate) && isSameYear(pDate, dueDate)) {
                        paymentId = p.id;
                        return true;
                    }
                }
                return false;
            });

            invoices.push({
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                amount: contract.total_value,
                isPaid,
                paymentId,
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
        if (isSaving) return;
        setIsSaving(true);
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
        } finally {
            setIsSaving(false);
        }
    };

    const handleUndoPayment = async (invoice, index) => {
        if (!invoice.paymentId) return;
        if (!confirm('Deseja realmente cancelar o recebimento desta fatura?')) return;

        if (isSaving) return;
        setIsSaving(true);
        try {
            await api.delete(`/payments/${invoice.paymentId}`);
            const { data } = await api.get(`/contracts/${selectedContract.id}/payments`);
            setPayments(data);

            const updated = [...editableInvoices];
            updated[index].isPaid = false;
            updated[index].paymentId = null;
            setEditableInvoices(updated);
        } catch (err) {
            console.error('Erro ao cancelar recebimento:', err);
            alert(`Erro ao cancelar recebimento: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadPDF = async (invoice) => {
        try {
            const partner = partners.find(p => p.id === selectedContract.partner_id) || {};
            const fullInvoice = {
                ...invoice,
                id: invoice.id || Math.floor(Math.random() * 100000),
                contract: {
                    ...selectedContract,
                    client: selectedClient,
                    partner: partner
                }
            };
            const blobUrl = await generateInvoicePDF(fullInvoice);
            window.open(blobUrl, '_blank');
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            alert("Erro ao gerar PDF da fatura.");
        }
    };

    const handleSendSingleInvoice = async (invoice) => {
        if (!selectedClient?.email) return alert("Cliente não possui e-mail cadastrado.");
        if (!confirm(`Deseja enviar a fatura de ${format(new Date(invoice.dueDate), 'MM/yyyy')} para ${selectedClient.email}?`)) return;

        try {
            const partner = partners.find(p => p.id === selectedContract.partner_id) || {};
            const fullInvoice = {
                ...invoice,
                id: invoice.id || Math.floor(Math.random() * 100000),
                contract: { ...selectedContract, client: selectedClient, partner }
            };
            
            const pdfBlob = await generateInvoicePDF(fullInvoice, true); // True to return blob/base64
            
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob);
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];
                const [y, m, d] = invoice.dueDate.split('-').map(Number);
                const dueDateObj = new Date(y, m - 1, d);
                
                await api.post('/notifications/send-invoice', {
                    to: selectedClient.email,
                    subject: `Fatura UniSis - Vencimento ${format(dueDateObj, 'dd/MM/yyyy')}`,
                    html: `<p>Olá <b>${selectedClient.name}</b>,</p><p>Segue em anexo a sua fatura com vencimento em ${format(dueDateObj, 'dd/MM/yyyy')}.</p><p>Atenciosamente,<br>Equipe UniSis</p>`,
                    attachments: [{ filename: `Fatura_${format(dueDateObj, 'dd-MM-yyyy')}.pdf`, content: base64data }]
                });
                alert("E-mail enviado com sucesso!");
            };
        } catch (err) {
            alert("Erro ao enviar e-mail: " + err.message);
        }
    };

    const handleSendAllInvoices = async () => {
        const openInvoices = editableInvoices.filter(i => !i.isPaid);
        if (openInvoices.length === 0) return alert("Não existem faturas em aberto para enviar.");
        if (!selectedClient?.email) return alert("Cliente não possui e-mail cadastrado.");
        
        if (!confirm(`Deseja enviar as ${openInvoices.length} faturas em aberto para ${selectedClient.email}?`)) return;

        setIsSaving(true);
        try {
            const partner = partners.find(p => p.id === selectedContract.partner_id) || {};
            const attachments = [];

            for (const inv of openInvoices) {
                const fullInvoice = {
                    ...inv,
                    id: inv.id || Math.floor(Math.random() * 100000),
                    contract: { ...selectedContract, client: selectedClient, partner }
                };
                const pdfBlob = await generateInvoicePDF(fullInvoice, true);
                
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(pdfBlob);
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                });

                const [y, m, d] = inv.dueDate.split('-').map(Number);
                const dueDateObj = new Date(y, m - 1, d);
                attachments.push({
                    filename: `Fatura_${format(dueDateObj, 'dd-MM-yyyy')}.pdf`,
                    content: base64
                });
            }

            await api.post('/notifications/send-invoice', {
                to: selectedClient.email,
                subject: `Faturas UniSis - Pendências em Aberto`,
                html: `<p>Olá <b>${selectedClient.name}</b>,</p><p>Seguem em anexo as suas faturas em aberto no sistema UniSis.</p><p>Total de faturas: ${openInvoices.length}</p><p>Atenciosamente,<br>Equipe UniSis</p>`,
                attachments
            });
            alert("E-mails enviados com sucesso!");
        } catch (err) {
            alert("Erro ao enviar e-mails: " + (err.response?.data?.error || err.message));
        } finally {
            setIsSaving(false);
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
        if (isSaving) return;
        setIsSaving(true);
        try {
            await api.patch(`/extra-sales/${sale.id}/status`, { status: 'Pago' });
            const { data } = await api.get('/extra-sales');
            setExtraSales(data.filter(s => s.client_id === selectedClient.id));
        } catch (err) { 
            alert("Erro ao atualizar status"); 
        } finally {
            setIsSaving(false);
        }
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
                <div className="inner-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Faturas: ${selectedClient?.name}`} maxWidth="900px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        backgroundColor: 'var(--bg-sidebar)',
                        borderRadius: '0.75rem',
                        border: '1px dashed var(--primary)'
                    }}>
                        <button onClick={handleSendAllInvoices} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#3b82f6', width: '220px', justifyContent: 'center' }}>
                            <Send size={18} /> Enviar Todas as Faturas
                        </button>
                    </div>

                    <div className="inner-scroll-container" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1.2rem',
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
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {inv.isPaid && <CheckCircle size={16} color="#10b981" />}
                                    </div>
                                </div>

                                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Vencimento</p>
                                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{inv.dueDate.split('-').reverse().join('/')}</p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Valor</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                        <p style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
                                            R$ {parseFloat(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                onClick={() => handleSendSingleInvoice(inv)}
                                                className="btn-primary"
                                                style={{ padding: '0.8rem', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Enviar Fatura por E-mail"
                                            >
                                                <Send size={22} />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(inv)}
                                                className="btn-primary"
                                                style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Ver PDF da Fatura"
                                            >
                                                <FileText size={22} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '0.5rem' }}>
                                    {inv.isPaid ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                backgroundColor: '#dcfce7',
                                                color: '#166534'
                                            }}>PAGO</span>
                                            {inv.paymentId && (
                                                <button
                                                    disabled={isSaving}
                                                    onClick={() => handleUndoPayment(inv, idx)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.5rem 0.8rem', backgroundColor: '#ef4444', fontSize: '0.75rem' }}
                                                    title="Desfazer Recebimento"
                                                >
                                                    Desfazer
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            disabled={isSaving}
                                            onClick={() => handlePayInvoice(inv, idx)}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '0.6rem', backgroundColor: '#10b981', fontSize: '0.8rem' }}
                                        >
                                            {isSaving ? 'Processando...' : 'Confirmar Recebimento'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* MODAL VENDAS/SERVIÇOS AVULSOS */}
            <Modal isOpen={isExtraSalesModalOpen} onClose={() => setIsExtraSalesModalOpen(false)} title={`Vendas e Serviços: ${selectedClient?.name}`} maxWidth="900px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {extraSales.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma venda avulsa para este cliente.</p>
                    ) : (
                        <div className="inner-scroll-container" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: '1.2rem',
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
                                                disabled={isSaving}
                                                onClick={() => markSaleAsPaid(s)}
                                                className="btn-primary"
                                                style={{ width: '100%', padding: '0.6rem', backgroundColor: '#10b981', fontSize: '0.8rem' }}
                                            >
                                                {isSaving ? 'Processando...' : 'Confirmar Recebimento'}
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
