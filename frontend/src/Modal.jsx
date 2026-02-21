import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '1.25rem',
                width: '100%',
                maxWidth: maxWidth,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.5rem',
                position: 'relative',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                transition: 'all 0.3s ease'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="nav-item">
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
