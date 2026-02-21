import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from './api';
import { generateReportPDF } from './ReportGenerator';
import { X, Search, Image as ImageIcon, Loader, Plus, FileText, PenTool, RotateCcw } from 'lucide-react';
import SignaturePad from './SignaturePad';

import ClientQuickAddModal from './ClientQuickAddModal';

const ReportModal = ({ isOpen, onClose, onSave }) => {
    const [step, setStep] = useState(1); // 1: Form, 2: Preview
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        client_id: '',
        client_name: '',
        client_address: '',
        client_email: '',
        contact_name: '',
        representative: 'ACQUA SERVICE – LUCAS – W209',
        visit_type: '',
        reason: '',
        sample_collection: '',
        comments: '',
        images: [],
        client_signature: null
    });

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

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
            setFormData({
                client_id: '', client_name: '', client_address: '', client_email: '',
                contact_name: '', representative: 'ACQUA SERVICE – LUCAS – W209',
                visit_type: '', reason: '', sample_collection: '', comments: '',
                images: [], client_signature: null
            });
        }
    }, [isOpen]);

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
                client_address: client.address || '',
                client_email: client.email || ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                client_id: '',
                client_name: '',
                client_address: '',
                client_email: ''
            }));
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

            for (const img of formData.images) {
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
                    console.warn("Upload failed, capturing for offline sync", e);
                    // When offline, we use the base64 as a placeholder URL
                    // The backend sync will handle the real upload later
                    uploadedUrls.push(base64);
                }
            }

            const finalData = { ...formData, images: uploadedUrls, client_signature: formData.client_signature };

            // Save report (will be queued if offline)
            await api.post('/reports', finalData);

            // Generate PDF with local base64 images (works offline)
            const blobUrl = await generateReportPDF(finalData, imageBlobsForPDF);
            window.open(blobUrl, '_blank');

            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar relatório');
        } finally {
            setLoading(false);
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? "Gerar Novo Relatório" : "Preview do Relatório"}>
            {step === 1 ? (
                <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="responsive-form-grid">

                    {/* BUSCA DE CLIENTE */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Pesquisar e Selecionar Cliente</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                <input type="text" className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="Nome ou CNPJ/CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <button type="button" onClick={() => setIsClientModalOpen(true)} className="btn-primary" style={{ backgroundColor: '#10b981', padding: '0.5rem' }}>
                                <Plus size={20} />
                            </button>
                        </div>
                        <select className="input-field" value={formData.client_id} onChange={e => handleSelectClient(e.target.value)} required>
                            <option value="">-- Selecione o Cliente na Lista --</option>
                            {filteredClients.map(cl => <option key={cl.id} value={cl.id}>{cl.name} ({cl.cnpj || cl.cpf || 'S/D'})</option>)}
                        </select>
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-sidebar)', borderRadius: '0.75rem', marginBottom: '0.5rem' }}>
                        <div>
                            <label className="label">Endereço da Unidade</label>
                            <input className="input-field" value={formData.client_address} onChange={e => setFormData({ ...formData, client_address: e.target.value })} placeholder="Logradouro, Nº, Bairro, Cidade..." />
                        </div>
                        <div>
                            <label className="label">E-mail de Contrato</label>
                            <input className="input-field" value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} placeholder="envio@relatorio.com" />
                        </div>
                        <div>
                            <label className="label">Contato no Local</label>
                            <input className="input-field" value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Quem atendeu?" required />
                        </div>
                    </div>

                    {/* DETALHES DA VISITA */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Representante NCH</label>
                        <input className="input-field" value={formData.representative} readOnly style={{ backgroundColor: 'var(--bg-system)', opacity: 0.8 }} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label" style={{ opacity: 0, marginBottom: 0 }}>Visita de Rotina</label>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: formData.visit_type ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-sidebar)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            border: formData.visit_type ? '1px solid var(--primary)' : '1px solid var(--border)',
                            height: '48px',
                            transition: 'all 0.2s'
                        }}>
                            <input
                                type="checkbox"
                                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                checked={!!formData.visit_type}
                                onChange={e => setFormData({ ...formData, visit_type: e.target.checked ? 'Visita de Rotina' : '' })}
                            />
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: formData.visit_type ? 'var(--primary)' : 'var(--text-main)' }}>Visita de Rotina</span>
                        </label>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Motivo do Chamado / Objetivo</label>
                        <input className="input-field" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Descreva o motivo da visita..." required />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Coleta de Amostra (Opcional)</label>
                        <input className="input-field" value={formData.sample_collection} onChange={e => setFormData({ ...formData, sample_collection: e.target.value })} placeholder="Ex: Galão de 5L para laboratório..." />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Comentários e Ações Realizadas (Obrigatório)</label>
                        <textarea
                            className="input-field"
                            rows="4"
                            value={formData.comments}
                            onChange={e => setFormData({ ...formData, comments: e.target.value })}
                            placeholder="Relatório detalhado das ações..."
                            required
                        />
                    </div>

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

                    {/* ASSINATURA ELETRONICA */}
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <label className="label">Assinatura do Responsável</label>
                        {!formData.client_signature ? (
                            <button
                                type="button"
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="btn-primary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                            >
                                <PenTool size={20} /> Coletar Assinatura Digital
                            </button>
                        ) : (
                            <div style={{ position: 'relative', padding: '1rem', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <img src={formData.client_signature} alt="assinatura" style={{ maxHeight: '80px', filter: 'contrast(1.5)' }} />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, client_signature: null })}
                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--bg-sidebar)', border: 'none', borderRadius: '50%', padding: '0.2rem' }}
                                >
                                    <X size={16} />
                                </button>
                                <span style={{ position: 'absolute', bottom: '5px', left: '10px', fontSize: '0.6rem', color: 'var(--text-muted)' }}>Assinatura Coletada</span>
                            </div>
                        )}
                    </div>

                    {isSignatureModalOpen && (
                        <SignaturePad
                            onConfirm={(sig) => {
                                setFormData({ ...formData, client_signature: sig });
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
                        <p style={{ fontWeight: 700, textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>PREVIEW DO RELATÓRIO TÉCNICO</p>
                        <p><b>Cliente:</b> {formData.client_name}</p>
                        <p><b>Unidade:</b> {formData.client_address || 'Não informada'}</p>
                        <p><b>Tipo de Visita:</b> {formData.visit_type || 'Chamado Técnico'}</p>
                        <p><b>Contato:</b> {formData.contact_name}</p>
                        <p><b>Motivo:</b> {formData.reason}</p>
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.4rem', fontSize: '0.85rem' }}>
                            <p><b>Comentários:</b> {formData.comments}</p>
                        </div>
                        <p style={{ marginTop: '0.5rem' }}><b>Fotos anexadas:</b> {formData.images.length} foto(s)</p>
                        <p style={{ marginTop: '0.5rem' }}><b>Assinatura do Cliente:</b> {formData.client_signature ? '✅ Coletada' : '❌ Não coletada'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(1)} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-muted)' }}>Voltar e Editar</button>
                        <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ flex: 1 }}>
                            {loading ? <Loader className="animate-spin" /> : <><FileText size={20} /> Confirmar e Gerar PDF</>}
                        </button>
                    </div>
                </div>
            )}

            <ClientQuickAddModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientAdded={handleQuickClientAdded}
            />
        </Modal>
    );
};

export default ReportModal;
