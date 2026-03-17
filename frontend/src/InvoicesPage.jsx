import React, { useState, useEffect } from 'react';
import api from './api';
import { FileText, Search, ExternalLink, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const InvoicesPage = () => {
    const [invoices, setInvoices] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/invoices');
            setInvoices(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter(i =>
        i.description?.toLowerCase().includes(search.toLowerCase()) ||
        i.access_key?.includes(search) ||
        i.partner_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenPdf = async (invoice) => {
        try {
            const response = await api.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        } catch (err) {
            alert('Erro ao gerar PDF da nota. Verifique se o XML foi importado corretamente.');
            console.error(err);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Notas</h2>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar por descrição, chave ou parceiro..."
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
                            <th>Descrição</th>
                            <th>Parceiro</th>
                            <th>Valor Total</th>
                            <th style={{ width: '100px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</td></tr>
                        ) : filteredInvoices.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Nenhuma nota encontrada.</td></tr>
                        ) : filteredInvoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td data-label="Data">{invoice.date ? format(parseISO(invoice.date), 'dd/MM/yyyy') : '-'}</td>
                                <td data-label="Descrição" className="client-name-card" style={{ fontWeight: 600 }}>
                                    {invoice.description}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                                        Chave: {invoice.access_key}
                                    </div>
                                </td>
                                <td data-label="Parceiro">{invoice.partner_name}</td>
                                <td data-label="Valor Total">R$ {parseFloat(invoice.total_value).toFixed(2)}</td>
                                <td data-label="Ações">
                                    <button
                                        onClick={() => handleOpenPdf(invoice)}
                                        className="btn-primary"
                                        title="Abrir PDF"
                                        style={{ padding: '0.6rem' }}
                                    >
                                        <FileText size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvoicesPage;
