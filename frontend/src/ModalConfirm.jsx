import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const ModalConfirm = ({ isOpen, onClose, onConfirm, title, message }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '50%', color: '#ef4444' }}>
                    <AlertTriangle size={32} />
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{message}</p>
                <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                    <button onClick={onClose} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="btn-primary" style={{ flex: 1, backgroundColor: '#ef4444' }}>
                        Confirmar Exclusão
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalConfirm;
