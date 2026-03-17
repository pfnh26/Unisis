import React, { useState } from 'react';
import Modal from './Modal';
import api from './api';
import { Building2, User, Search, Save, Loader2 } from 'lucide-react';

const PartnerQuickAddModal = ({ isOpen, onClose, onPartnerAdded }) => {
    const [activeTab, setActiveTab] = useState('cnpj');
    const [loading, setLoading] = useState(false);
    const [cnpjInput, setCnpjInput] = useState('');
    const [manualData, setManualData] = useState({
        name: '', fantasy_name: '', type: 'Empresa', cnpj: '',
        phone: '', email: '',
        capital_social: '', abertura: '', situacao: 'Ativa',
        data_situacao: '', motivo_situacao: '',
        status: 'OK', ultima_atualizacao: new Date().toISOString(),
        atividade_principal_code: '', atividade_principal_text: '',
        atividades_secundarias_text: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: ''
    });

    const [certificate, setCertificate] = useState(null);
    const [certPassword, setCertPassword] = useState('');

    const handleCNPJLookup = async () => {
        if (!cnpjInput) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/cnpj/${cnpjInput.replace(/\D/g, '')}`);
            if (data.status === 'ERROR') throw new Error(data.message);

            const formData = new FormData();
            formData.append('name', data.nome);
            formData.append('cnpj', data.cnpj);
            formData.append('address', `${data.logradouro}, ${data.numero} - ${data.municipio}/${data.uf}`);
            formData.append('cep', data.cep);
            formData.append('type', data.natureza_juridica || 'Empresa');
            formData.append('data', JSON.stringify({ ...data, email: data.email, telefone: data.telefone }));

            if (certificate) {
                formData.append('certificate', certificate);
            }
            if (certPassword) {
                formData.append('certificate_password', certPassword);
            }

            const res = await api.post('/partners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onPartnerAdded(res.data);
            onClose();
            setCnpjInput('');
            setCertificate(null);
            setCertPassword('');
        } catch (err) {
            alert("Erro ao consultar CNPJ: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateManual = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataObj = {
                nome: manualData.name,
                fantasia: manualData.fantasy_name,
                cnpj: manualData.cnpj,
                natureza_juridica: manualData.type,
                logradouro: manualData.logradouro,
                numero: manualData.numero,
                complemento: manualData.complemento,
                bairro: manualData.bairro,
                municipio: manualData.municipio,
                uf: manualData.uf,
                cep: manualData.cep,
                email: manualData.email,
                telefone: manualData.phone,
                capital_social: manualData.capital_social,
                abertura: manualData.abertura,
                situacao: manualData.situacao,
                data_situacao: manualData.data_situacao,
                motivo_situacao: manualData.motivo_situacao,
                status: manualData.status,
                ultima_atualizacao: manualData.ultima_atualizacao,
                atividade_principal: [{ code: manualData.atividade_principal_code, text: manualData.atividade_principal_text }],
                atividades_secundarias: manualData.atividades_secundarias_text.split('\n').filter(line => line.trim() !== '').map(line => ({ text: line.trim() }))
            };

            const formData = new FormData();
            formData.append('name', manualData.name);
            formData.append('cnpj', manualData.cnpj);
            formData.append('type', manualData.type);
            formData.append('address', `${manualData.logradouro}, ${manualData.numero}${manualData.complemento ? ` - ${manualData.complemento}` : ''} - ${manualData.bairro}, ${manualData.municipio}/${manualData.uf}`);
            formData.append('data', JSON.stringify(dataObj));

            if (certificate) {
                formData.append('certificate', certificate);
            }
            if (certPassword) {
                formData.append('certificate_password', certPassword);
            }

            const res = await api.post('/partners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onPartnerAdded(res.data);
            onClose();
            // Reset form
            setManualData({
                name: '', fantasy_name: '', type: 'Empresa', cnpj: '',
                phone: '', email: '',
                capital_social: '', abertura: '', situacao: 'Ativa',
                data_situacao: '', motivo_situacao: '',
                status: 'OK', ultima_atualizacao: new Date().toISOString(),
                atividade_principal_code: '', atividade_principal_text: '',
                atividades_secundarias_text: '',
                cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: ''
            });
            setCertificate(null);
            setCertPassword('');
        } catch (err) {
            alert("Erro ao criar cadastro manual");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo PJ Prestador">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('cnpj')}
                    style={{
                        padding: '0.5rem 1rem', background: 'none', borderBottom: activeTab === 'cnpj' ? '2px solid var(--primary)' : 'none',
                        color: activeTab === 'cnpj' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Building2 size={16} /> Por CNPJ
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    style={{
                        padding: '0.5rem 1rem', background: 'none', borderBottom: activeTab === 'manual' ? '2px solid var(--primary)' : 'none',
                        color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <User size={16} /> Manual
                </button>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}> Certificado Digital (Opcional)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label className="label">Arquivo .p12 / .pfx</label>
                        <input type="file" className="input-field" onChange={e => setCertificate(e.target.files[0])} accept=".p12,.pfx" />
                    </div>
                    <div>
                        <label className="label">Senha do Certificado</label>
                        <input type="password" className="input-field" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="Senha" />
                    </div>
                </div>
            </div>

            {activeTab === 'cnpj' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label className="label">Digite o CNPJ</label>
                    <div className="responsive-search-group">
                        <input
                            className="input-field"
                            placeholder="00.000.000/0000-00"
                            value={cnpjInput}
                            onChange={e => setCnpjInput(e.target.value)}
                        />
                        <button onClick={handleCNPJLookup} className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Consultar e Salvar
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleCreateManual} className="responsive-form-grid">
                    <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                        <label className="label">Razão Social</label>
                        <input className="input-field" value={manualData.name} onChange={e => setManualData({ ...manualData, name: e.target.value })} required />
                    </div>
                    <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                        <label className="label">Nome Fantasia</label>
                        <input className="input-field" value={manualData.fantasy_name} onChange={e => setManualData({ ...manualData, fantasy_name: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">CNPJ</label>
                        <input className="input-field" value={manualData.cnpj} onChange={e => setManualData({ ...manualData, cnpj: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Tipo / Regime</label>
                        <input className="input-field" value={manualData.type} onChange={e => setManualData({ ...manualData, type: e.target.value })} />
                    </div>

                    {/* Status Info */}
                    <div>
                        <label className="label">Situação Cadastral</label>
                        <select className="input-field" value={manualData.situacao} onChange={e => setManualData({ ...manualData, situacao: e.target.value })}>
                            <option value="Ativa">Ativa</option>
                            <option value="Baixada">Baixada</option>
                            <option value="Inapta">Inapta</option>
                            <option value="Suspensa">Suspensa</option>
                            <option value="Nula">Nula</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Data Situação</label>
                        <input className="input-field" type="date" value={manualData.data_situacao} onChange={e => setManualData({ ...manualData, data_situacao: e.target.value })} />
                    </div>
                    <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                        <label className="label">Motivo Situação</label>
                        <input className="input-field" value={manualData.motivo_situacao} onChange={e => setManualData({ ...manualData, motivo_situacao: e.target.value })} />
                    </div>

                    {/* Contact */}
                    <div>
                        <label className="label">Email</label>
                        <input className="input-field" type="email" value={manualData.email} onChange={e => setManualData({ ...manualData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Telefone</label>
                        <input className="input-field" value={manualData.phone} onChange={e => setManualData({ ...manualData, phone: e.target.value })} />
                    </div>

                    {/* Opening & Capital */}
                    <div>
                        <label className="label">Capital Social</label>
                        <input className="input-field" value={manualData.capital_social} onChange={e => setManualData({ ...manualData, capital_social: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Data Abertura</label>
                        <input className="input-field" type="date" value={manualData.abertura} onChange={e => setManualData({ ...manualData, abertura: e.target.value })} />
                    </div>

                    {/* CNAE */}
                    <div>
                        <label className="label">CNAE Principal (Código)</label>
                        <input className="input-field" value={manualData.atividade_principal_code} onChange={e => setManualData({ ...manualData, atividade_principal_code: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">CNAE Principal (Texto)</label>
                        <input className="input-field" value={manualData.atividade_principal_text} onChange={e => setManualData({ ...manualData, atividade_principal_text: e.target.value })} />
                    </div>
                    <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                        <label className="label">Atividades Secundárias (uma por linha)</label>
                        <textarea className="input-field" rows="3" value={manualData.atividades_secundarias_text} onChange={e => setManualData({ ...manualData, atividades_secundarias_text: e.target.value })} placeholder="Texto da atividade..." />
                    </div>

                    {/* Address Breakdown */}
                    <div>
                        <label className="label">CEP</label>
                        <input className="input-field" value={manualData.cep} onChange={e => setManualData({ ...manualData, cep: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">UF</label>
                        <input className="input-field" maxLength="2" value={manualData.uf} onChange={e => setManualData({ ...manualData, uf: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="mobile-full-width" style={{ gridColumn: 'span 2' }}>
                        <label className="label">Logradouro</label>
                        <input className="input-field" value={manualData.logradouro} onChange={e => setManualData({ ...manualData, logradouro: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Número</label>
                        <input className="input-field" value={manualData.numero} onChange={e => setManualData({ ...manualData, numero: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Complemento</label>
                        <input className="input-field" value={manualData.complemento} onChange={e => setManualData({ ...manualData, complemento: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Bairro</label>
                        <input className="input-field" value={manualData.bairro} onChange={e => setManualData({ ...manualData, bairro: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Município</label>
                        <input className="input-field" value={manualData.municipio} onChange={e => setManualData({ ...manualData, municipio: e.target.value })} />
                    </div>

                    {/* API Status */}
                    <div>
                        <label className="label">Status API (Simulado)</label>
                        <input className="input-field" value={manualData.status} onChange={e => setManualData({ ...manualData, status: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Última Atualização</label>
                        <input className="input-field" type="datetime-local" value={manualData.ultima_atualizacao ? new Date(manualData.ultima_atualizacao).toISOString().slice(0, 16) : ''} onChange={e => setManualData({ ...manualData, ultima_atualizacao: new Date(e.target.value).toISOString() })} />
                    </div>

                    <button type="submit" className="btn-primary mobile-full-width" style={{ gridColumn: 'span 2', marginTop: '1rem' }} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Empresa
                    </button>
                </form>
            )}
        </Modal>
    );
};

export default PartnerQuickAddModal;
