import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from './api';
import { generateReportPDF } from './ReportGenerator';
import { X, Search, Image as ImageIcon, Loader, Plus, FileText, PenTool } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { useToast } from './ToastContext';

import ClientQuickAddModal from './ClientQuickAddModal';

const ReportModal = ({ isOpen, onClose, onSave, reportToEdit }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1); // 1: Form, 2: Preview
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('01'); // '01' or '02'

    const [formData, setFormData] = useState({
        report_type: '01',
        client_id: '',
        client_name: '',
        client_cnpj: '',
        client_address: '',
        client_city: '',
        client_phone: '',
        client_email: '',
        contact_name: '',
        representative: 'ACQUA SERVICE – LUCAS – W209',
        visit_type: '',
        reason: '',
        sample_collection: '',
        comments: '',
        images: [], // contains { file: File, preview: string } or { url: string, preview: string }
        client_signature: null,
        // Fields for Relatorio 02
        equipment_items: [
            { name: 'MANGUEIRAS', status: '', obs: '' },
            { name: 'CABEÇOTE', status: '', obs: '' },
            { name: 'VÁLVULA DE INJEÇÃO', status: '', obs: '' },
            { name: 'FILTRO STD', status: '', obs: '' }
        ],
        dosage_regulation: '', // '20%' or '100%'
        client_brand: '',
        client_model: '',
        client_serial: '',
        defect_found: '',
        service_performed: '',
        second_signature: null,
        equipment_obs: ''
    });

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [activeSignatureField, setActiveSignatureField] = useState('client_signature');

    const fetchData = async () => {
        try {
            const { data } = await api.get('/clients');
            setClients(data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setStep(1);
            setSearchTerm('');

            if (reportToEdit) {
                // Formatting images for preview
                let formattedImages = [];
                if (reportToEdit.images) {
                    const parsed = typeof reportToEdit.images === 'string' ? JSON.parse(reportToEdit.images) : reportToEdit.images;
                    const baseUrl = api.defaults.baseURL.replace('/api', '');
                    formattedImages = parsed.map(url => ({
                        url,
                        preview: url.startsWith('data:') ? url : (baseUrl + url)
                    }));
                }

                const rType = reportToEdit.report_type || '01';
                setModalTab(rType);

                setFormData({
                    report_type: rType,
                    client_id: reportToEdit.client_id,
                    client_name: reportToEdit.client_name || '',
                    client_cnpj: reportToEdit.client_cnpj || '',
                    client_address: reportToEdit.client_address || '',
                    client_city: reportToEdit.client_city || '',
                    client_phone: reportToEdit.client_phone || '',
                    client_email: reportToEdit.client_email || '',
                    contact_name: reportToEdit.contact_name || '',
                    representative: reportToEdit.representative || 'ACQUA SERVICE – LUCAS – W209',
                    visit_type: reportToEdit.visit_type || '',
                    reason: reportToEdit.reason || '',
                    sample_collection: reportToEdit.sample_collection || '',
                    comments: reportToEdit.comments || '',
                    images: formattedImages,
                    client_signature: reportToEdit.client_signature ? (reportToEdit.client_signature.startsWith('data:') ? reportToEdit.client_signature : (api.defaults.baseURL.replace('/api', '') + reportToEdit.client_signature)) : null,
                    // 02 Fields
                    equipment_items: reportToEdit.equipment_items ? (typeof reportToEdit.equipment_items === 'string' ? JSON.parse(reportToEdit.equipment_items) : reportToEdit.equipment_items) : [
                        { name: 'MANGUEIRAS', status: '', obs: '' },
                        { name: 'CABEÇOTE', status: '', obs: '' },
                        { name: 'VÁLVULA DE INJEÇÃO', status: '', obs: '' },
                        { name: 'FILTRO STD', status: '', obs: '' }
                    ],
                    dosage_regulation: reportToEdit.dosage_regulation || '',
                    client_brand: reportToEdit.client_brand || '',
                    client_model: reportToEdit.client_model || '',
                    client_serial: reportToEdit.client_serial || '',
                    defect_found: reportToEdit.defect_found || '',
                    service_performed: reportToEdit.service_performed || '',
                    second_signature: reportToEdit.second_signature ? (reportToEdit.second_signature.startsWith('data:') ? reportToEdit.second_signature : (api.defaults.baseURL.replace('/api', '') + reportToEdit.second_signature)) : null
                });
            } else {
                setFormData({
                    report_type: modalTab,
                    client_id: '', client_name: '', client_cnpj: '', client_address: '', client_city: '', client_phone: '', client_email: '',
                    contact_name: '', representative: 'ACQUA SERVICE – LUCAS – W209',
                    visit_type: '', reason: '', sample_collection: '', comments: '',
                    images: [], client_signature: null,
                    equipment_items: [
                        { name: 'MANGUEIRAS', status: '', obs: '' },
                        { name: 'CABEÇOTE', status: '', obs: '' },
                        { name: 'VÁLVULA DE INJEÇÃO', status: '', obs: '' },
                        { name: 'FILTRO STD', status: '', obs: '' }
                    ],
                    dosage_regulation: '', client_brand: '', client_model: '', client_serial: '',
                    defect_found: '', service_performed: '', second_signature: null
                });
            }
        }
    }, [isOpen, reportToEdit]);

    useEffect(() => {
        if (!reportToEdit) {
            setFormData(prev => ({ ...prev, report_type: modalTab }));
        }
    }, [modalTab, reportToEdit]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cnpj && c.cnpj.includes(searchTerm)) ||
        (c.cpf && c.cpf.includes(searchTerm))
    );

    const handleSelectClient = (clientId) => {
        const client = clients.find(c => c.id == clientId);
        if (client) {
            setFormData(prev => ({
                ...prev,
                client_id: client.id,
                client_name: client.name,
                client_cnpj: client.cnpj || client.cpf || '',
                client_address: client.address || ((client.logradouro || '') + (client.numero ? ', ' + client.numero : '') + (client.bairro ? ', ' + client.bairro : '')),
                client_city: client.data?.municipio || client.cidade || client.municipio || '',
                client_phone: client.phone || '',
                client_email: client.email || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, client_id: '', client_name: '', client_address: '', client_email: '' }));
        }
    };

    const handleQuickClientAdded = (client) => {
        setClients([...clients, client]);
        handleSelectClient(client.id);
        setIsClientModalOpen(false);
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const uploadedUrls = [];
            const imageBlobsForPDF = [];

            // Helper to convert File to base64
            const fileToBase64 = (file) => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            // Helper to fetch URL to base64
            const urlToBase64 = async (url) => {
                try {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    return await fileToBase64(blob);
                } catch (e) {
                    return url;
                }
            };

            for (const img of formData.images) {
                if (img.file) {
                    const base64 = await fileToBase64(img.file);
                    imageBlobsForPDF.push({ base64 });

                    const uploadData = new FormData();
                    uploadData.append('image', img.file);

                    try {
                        const { data } = await api.post('/reports/upload-image', uploadData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        uploadedUrls.push(data.imageUrl);
                    } catch (e) {
                        uploadedUrls.push(base64);
                    }
                } else {
                    uploadedUrls.push(img.url);
                    const base64 = await urlToBase64(img.preview);
                    imageBlobsForPDF.push({ base64 });
                }
            }

            const finalData = { ...formData, images: uploadedUrls, offline_hash: Date.now().toString() + Math.random().toString(36).substring(2, 7) };

            if (reportToEdit) {
                await api.patch(`/reports/${reportToEdit.id}`, finalData);
                showToast("Relatório atualizado com sucesso!", "success");
            } else {
                await api.post('/reports', finalData);
                showToast("Relatório criado com sucesso!", "success");
            }

            // Generate PDF
            const blobUrl = await generateReportPDF(finalData, imageBlobsForPDF);
            window.open(blobUrl, '_blank');

            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            showToast('Erro ao salvar relatório', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEquipItemChange = (index, field, value) => {
        const newItems = [...formData.equipment_items];
        newItems[index][field] = value;
        setFormData({ ...formData, equipment_items: newItems });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? (reportToEdit ? "Editar Relatório" : "Gerar Novo Relatório") : "Preview do Relatório"}>
            {step === 1 && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setModalTab('01')}
                        style={{
                            padding: '0.5rem 1rem', background: 'none', borderBottom: modalTab === '01' ? '2px solid var(--primary)' : 'none',
                            color: modalTab === '01' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                        }}
                    >
                        Visita
                    </button>
                    <button
                        onClick={() => setModalTab('02')}
                        style={{
                            padding: '0.5rem 1rem', background: 'none', borderBottom: modalTab === '02' ? '2px solid var(--primary)' : 'none',
                            color: modalTab === '02' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                        }}
                    >
                        Locação
                    </button>
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="responsive-form-grid">
                    {/* BUSCA DE CLIENTE */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Pesquisar e Selecionar Cliente</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="Nome ou CNPJ/CPF..."
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        if (formData.client_id) handleSelectClient('');
                                    }}
                                />
                                {searchTerm && !formData.client_id && filteredClients.length > 0 && (
                                    <ul style={{ position: 'absolute', zIndex: 50, width: '100%', maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', marginTop: '0.25rem', boxShadow: 'var(--shadow-lg)', padding: '0.5rem 0' }}>
                                        {filteredClients.slice(0, 10).map(cl => (
                                            <li key={cl.id}
                                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
                                                onClick={() => {
                                                    handleSelectClient(cl.id);
                                                    setSearchTerm(cl.name);
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
                            <button type="button" onClick={() => setIsClientModalOpen(true)} className="btn-primary" style={{ backgroundColor: '#10b981', padding: '0.5rem' }}>
                                <Plus size={20} />
                            </button>
                        </div>
                        {!formData.client_id && searchTerm && filteredClients.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Nenhum cliente encontrado.</p>
                        )}
                        <input type="hidden" value={formData.client_id || ''} required />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.75rem', marginBottom: '0.5rem' }}>
                        <div>
                            <label className="label">Endereço da Unidade</label>
                            <input className="input-field" value={formData.client_address} onChange={e => setFormData({ ...formData, client_address: e.target.value })} placeholder="Logradouro, Nº, Bairro, Cidade..." />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mobile-full-width">
                            <div>
                                <label className="label">E-mail de Contrato</label>
                                <input className="input-field" value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} placeholder="envio@relatorio.com" />
                            </div>
                            <div>
                                <label className="label">Contato no Local / Responsável</label>
                                <input className="input-field" value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Quem atendeu?" required />
                            </div>
                        </div>
                    </div>

                    {modalTab === '01' ? (
                        <>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Representante NCH</label>
                                <input className="input-field" value={formData.representative} readOnly style={{ backgroundColor: 'var(--bg-system)', opacity: 0.8 }} />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                    background: formData.visit_type ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-sidebar)',
                                    borderRadius: '0.5rem', cursor: 'pointer', border: formData.visit_type ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    height: '48px', transition: 'all 0.2s'
                                }}>
                                    <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} checked={!!formData.visit_type} onChange={e => setFormData({ ...formData, visit_type: e.target.checked ? 'Visita de Rotina' : '' })} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: formData.visit_type ? 'var(--primary)' : 'var(--text-main)' }}>Visita de Rotina</span>
                                </label>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Motivo do Chamado / Objetivo</label>
                                <input className="input-field" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Descreva o motivo da visita..." required />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Coleta de Amostra (Opcional)</label>
                                <input className="input-field" value={formData.sample_collection} onChange={e => setFormData({ ...formData, sample_collection: e.target.value })} placeholder="" />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Comentários e Ações Realizadas (Obrigatório)</label>
                                <textarea className="input-field" rows="4" value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} placeholder="Relatório detalhado das ações..." required />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* FORM RELATORIO 02 */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Motivo da Visita</label>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {['Rotina', 'Problema com Equipamento', 'Conserto de Equipamento'].map(m => (
                                        <label key={m} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                                            background: formData.reason === m ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-sidebar)',
                                            borderRadius: '0.5rem', cursor: 'pointer', border: formData.reason === m ? '1px solid var(--primary)' : '1px solid var(--border)',
                                            flex: '1 1 auto', minWidth: '150px'
                                        }}>
                                            <input type="radio" name="reason" checked={formData.reason === m} onChange={() => setFormData({ ...formData, reason: m })} />
                                            <span style={{ fontSize: '0.8rem' }}>{m}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label" style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--primary)' }}>MANUTENÇÃO DE EQUIPAMENTOS EM COMODATO</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {formData.equipment_items.map((item, idx) => (
                                        <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.8rem' }}>{item.name}</div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                {['OK', 'SUBSTITUÍDO'].map(s => (
                                                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                        <input type="radio" name={`status-${idx}`} checked={item.status === s} onChange={() => handleEquipItemChange(idx, 'status', s)} />
                                                        <span style={{ fontSize: '0.75rem' }}>{s}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Regulagem / Dosador</label>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                    {['20%', '100%'].map(v => (
                                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" name="dosage" checked={formData.dosage_regulation === v} onChange={() => setFormData({ ...formData, dosage_regulation: v })} />
                                            <span style={{ fontSize: '0.8rem' }}>{v}</span>
                                        </label>
                                    ))}
                                </div>
                                <input className="input-field" style={{ padding: '0.4rem', fontSize: '0.8rem' }} placeholder="Observações do Equipamento em Comodato..." value={formData.equipment_obs} onChange={(e) => {
                                    setFormData({ ...formData, equipment_obs: e.target.value });
                                }} />
                            </div>

                            <div style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.5rem' }}>
                                <label className="label" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>MANUTENÇÃO DE EQUIPAMENTO DO CLIENTE</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }} className="mobile-full-width">
                                    <div><label className="label">Marca</label><input className="input-field" value={formData.client_brand} onChange={e => setFormData({ ...formData, client_brand: e.target.value })} /></div>
                                    <div><label className="label">Modelo</label><input className="input-field" value={formData.client_model} onChange={e => setFormData({ ...formData, client_model: e.target.value })} /></div>
                                    <div><label className="label">Nº Série</label><input className="input-field" value={formData.client_serial} onChange={e => setFormData({ ...formData, client_serial: e.target.value })} /></div>
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Defeito Constatado</label>
                                <input className="input-field" value={formData.defect_found} onChange={e => setFormData({ ...formData, defect_found: e.target.value })} placeholder="Descreva o defeito..." />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Serviço Realizado</label>
                                <textarea className="input-field" rows="2" value={formData.service_performed} onChange={e => setFormData({ ...formData, service_performed: e.target.value })} placeholder="O que foi feito?" />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="label">Observações Adicionais</label>
                                <textarea className="input-field" rows="3" value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} placeholder="Outras observações importantes..." />
                            </div>
                        </>
                    )}

                    {/* IMAGENS */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Fotos do Local</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <label className="btn-primary" style={{ backgroundColor: 'var(--border)', color: 'var(--text-main)', border: '1px dashed var(--text-muted)', cursor: 'pointer', padding: '1rem', width: '100px', height: '100px', flexDirection: 'column', gap: '0.25rem' }}>
                                <ImageIcon size={24} />
                                <span style={{ fontSize: '0.7rem' }}>Adicionar</span>
                                <input type="file" multiple accept="image/*" hidden onChange={handleImageUpload} />
                            </label>

                            {formData.images.map((img, i) => (
                                <div key={i} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <img src={img.preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ASSINATURAS */}
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label className="label">{modalTab === '01' ? "Assinatura do Responsável" : "Assinatura 01 (Contato)"}</label>
                            {!formData.client_signature ? (
                                <button type="button" onClick={() => { setActiveSignatureField('client_signature'); setIsSignatureModalOpen(true); }} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    <PenTool size={20} /> Coletar Assinatura Digital
                                </button>
                            ) : (
                                <div style={{ position: 'relative', padding: '1rem', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <img src={formData.client_signature} alt="assinatura" style={{ maxHeight: '80px', filter: 'contrast(1.5)' }} />
                                    <button type="button" onClick={() => setFormData({ ...formData, client_signature: null })} style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--bg-sidebar)', border: 'none', borderRadius: '50%', padding: '0.2rem' }}><X size={16} /></button>
                                </div>
                            )}
                        </div>

                        {modalTab === '02' && (
                            <div>
                                <label className="label">Assinatura 02 (Recebimento / Cliente)</label>
                                {!formData.second_signature ? (
                                    <button type="button" onClick={() => { setActiveSignatureField('second_signature'); setIsSignatureModalOpen(true); }} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                        <PenTool size={20} /> Coletar Segunda Assinatura
                                    </button>
                                ) : (
                                    <div style={{ position: 'relative', padding: '1rem', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <img src={formData.second_signature} alt="assinatura" style={{ maxHeight: '80px', filter: 'contrast(1.5)' }} />
                                        <button type="button" onClick={() => setFormData({ ...formData, second_signature: null })} style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--bg-sidebar)', border: 'none', borderRadius: '50%', padding: '0.2rem' }}><X size={16} /></button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isSignatureModalOpen && (
                        <SignaturePad
                            onConfirm={(sig) => {
                                setFormData({ ...formData, [activeSignatureField]: sig });
                                setIsSignatureModalOpen(false);
                            }}
                            onCancel={() => setIsSignatureModalOpen(false)}
                        />
                    )}

                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Ir para Preview</button>
                    </div>
                </form>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.75rem', lineHeight: '1.6', border: '1px solid var(--border)' }}>
                        <p style={{ fontWeight: 700, textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>PREVIEW DO RELATÓRIO {modalTab === '01' ? 'TÉCNICO' : '02 (DOSADORA)'}</p>
                        <p><b>Cliente:</b> {formData.client_name}</p>
                        <p><b>Unidade:</b> {formData.client_address || 'Não informada'}</p>
                        <p><b>Motivo/Tipo:</b> {formData.reason || formData.visit_type || 'Visita'}</p>
                        <p><b>Contato:</b> {formData.contact_name}</p>

                        {modalTab === '02' && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                <p><b>Regulagem:</b> {formData.dosage_regulation}</p>
                                <p><b>Equip. Cliente:</b> {formData.client_brand} {formData.client_model}</p>
                            </div>
                        )}

                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.4rem', fontSize: '0.85rem' }}>
                            <p><b>Comentários/Ações:</b> {formData.comments || formData.service_performed}</p>
                        </div>
                        <p style={{ marginTop: '0.5rem' }}><b>Fotos:</b> {formData.images.length}</p>
                        <p style={{ marginTop: '0.5rem' }}><b>Assinaturas:</b> {formData.client_signature ? '✅ 1' : '❌ 1'} {modalTab === '02' ? (formData.second_signature ? '✅ 2' : '❌ 2') : ''}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(1)} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-muted)' }}>Voltar e Editar</button>
                        <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ flex: 1, backgroundColor: '#10b981' }}>
                            {loading ? <Loader className="animate-spin" /> : <><FileText size={20} /> {reportToEdit ? "Salvar Alterações" : "Confirmar e Gerar PDF"}</>}
                        </button>
                    </div>
                </div>
            )}

            <ClientQuickAddModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onClientAdded={handleQuickClientAdded} />
        </Modal>
    );
};

export default ReportModal;
