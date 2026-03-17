import React, { useState, useEffect } from 'react';
import api from './api';
import { FileText, Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import ReportModal from './ReportModal';
import ModalConfirm from './ModalConfirm';
import { generateReportPDF } from './ReportGenerator';
import { useToast } from './ToastContext';

const ReportsPage = () => {
    const { showToast } = useToast();
    const [reports, setReports] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Edit/Delete state
    const [editingReport, setEditingReport] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports');
            setReports(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleViewPDF = async (report) => {
        // Open window immediately to avoid popup blocker
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
            pdfWindow.document.write('<html><head><title>Gerando PDF...</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;"><div><div style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:30px;height:30px;animation:spin 2s linear infinite;margin:0 auto 10px;"></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>Preparando relatório...</div></body></html>');
        }

        let imageBlobs = [];
        if (report.images && report.images.length > 0) {
            try {
                const promises = report.images.map(async (url) => {
                    if (url.startsWith('data:image')) {
                        return { base64: url };
                    }

                    try {
                        const baseUrl = api.defaults.baseURL.replace('/api', '');
                        const res = await fetch(baseUrl + url, {
                            headers: {
                                'ngrok-skip-browser-warning': 'true'
                            }
                        });
                        const blob = await res.blob();
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ base64: reader.result });
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.error("Failed to fetch image:", url, e);
                        return null;
                    }
                });
                const resolved = await Promise.all(promises);
                imageBlobs = resolved.filter(img => img !== null);
            } catch (e) {
                console.warn("Could not fetch remote images for PDF", e);
            }
        }

        try {
            const blobUrl = await generateReportPDF(report, imageBlobs);
            if (pdfWindow) {
                pdfWindow.location.href = blobUrl;
            } else {
                window.open(blobUrl, '_blank');
            }
        } catch (err) {
            console.error(err);
            if (pdfWindow) pdfWindow.close();
            alert('Erro ao gerar PDF');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/reports/${reportToDelete.id}`);
            showToast("Relatório excluído com sucesso!", "success");
            setIsDeleteModalOpen(false);
            fetchReports();
        } catch (err) {
            showToast("Erro ao excluir relatório", "error");
        }
    };

    const startEdit = (report) => {
        setEditingReport(report);
        setIsModalOpen(true);
    };

    const filteredReports = reports.filter(r => {
        if (searchTerm.startsWith('#')) {
            const id = searchTerm.substring(1);
            return r.client_id?.toString() === id || r.id.toString() === id;
        }
        return r.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Meus Relatórios</h2>
                <button onClick={() => { setEditingReport(null); setIsModalOpen(true); }} className="btn-primary">
                    <Plus size={20} /> Novo Relatório
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
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Tipo de Visita</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                        ) : filteredReports.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Nenhum relatório encontrado.</p>
                                </td>
                            </tr>
                        ) : filteredReports.map(report => (
                            <tr key={report.id} style={report.isPending ? { backgroundColor: 'rgba(245, 158, 11, 0.05)' } : {}}>
                                <td data-label="Data">
                                    {report.created_at ? format(new Date(report.created_at), 'dd/MM/yyyy') : '---'}
                                    {report.isPending && (
                                        <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, marginTop: '0.2rem' }}>
                                            PENDENTE SYNC
                                        </div>
                                    )}
                                </td>
                                <td data-label="Cliente">
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginRight: '0.5rem' }}>#{report.client_id}</span>
                                    {report.client_name}
                                    {report.isPending && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Offline)</span>}
                                </td>
                                <td data-label="Tipo">{report.visit_type || 'Chamado Técnico'}</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleViewPDF(report)} title="Visualizar PDF" className="btn-primary" style={{ padding: '0.8rem', backgroundColor: report.isPending ? '#f59e0b' : '#3b82f6' }}>
                                            <FileText size={18} />
                                        </button>
                                        <button onClick={() => startEdit(report)} title="Editar Relatório" className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#fbbf24' }}>
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => { setReportToDelete(report); setIsDeleteModalOpen(true); }} title="Excluir Relatório" className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#ef4444' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ReportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchReports}
                reportToEdit={editingReport}
            />

            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Relatório"
                message="Tem certeza que deseja excluir permanentemente este relatório?"
            />
        </div>
    );
};

export default ReportsPage;
