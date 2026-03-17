
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const ToastNotification = ({ message, type = 'success', onClose, duration = 4000 }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getStyles = () => {
        const base = {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: isVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100px)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
            minWidth: '300px',
            maxWidth: '90vw',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
        };

        switch (type) {
            case 'success':
                return { ...base, backgroundColor: 'rgba(16, 185, 129, 0.95)', color: '#fff' };
            case 'error':
                return { ...base, backgroundColor: 'rgba(239, 68, 68, 0.95)', color: '#fff' };
            case 'warning':
                return { ...base, backgroundColor: 'rgba(245, 158, 11, 0.95)', color: '#fff' };
            default:
                return { ...base, backgroundColor: 'rgba(59, 130, 246, 0.95)', color: '#fff' };
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'error': return <AlertTriangle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            default: return <Info size={20} />;
        }
    };

    return (
        <div style={getStyles()}>
            {getIcon()}
            <span style={{ fontSize: '14px', fontWeight: 500, flex: 1 }}>{message}</span>
            <button
                onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }}
                style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', opacity: 0.8 }}
            >
                <X size={18} />
            </button>
        </div>
    );
};

export default ToastNotification;
