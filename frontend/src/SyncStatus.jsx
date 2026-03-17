
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import syncManager from './services/SyncManager';

const SyncStatus = () => {
    const [status, setStatus] = useState('online');
    const [stats, setStats] = useState({ pendingCount: 0 });
    const [errorDetails, setErrorDetails] = useState('');

    useEffect(() => {
        // Inicializar gerenciador de sync
        syncManager.init();

        // Configurar estado inicial
        setStatus(navigator.onLine ? 'online' : 'offline');
        updateStats();

        // Listeners para eventos de sync
        const handler = (event) => {
            switch (event.type) {
                case 'online':
                    setStatus('online');
                    updateStats();
                    break;
                case 'offline':
                    setStatus('offline');
                    setErrorDetails('Sem conexão com internet');
                    break;
                case 'sync-start':
                    setStatus('syncing');
                    setErrorDetails('');
                    break;
                case 'sync-complete':
                    setStatus('online');
                    updateStats();
                    // Timeout para limpar mensagem de sucesso
                    setTimeout(() => setErrorDetails('Sincronização concluída!'), 100);
                    setTimeout(() => setErrorDetails(''), 3000);
                    break;
                case 'sync-error':
                    setStatus('error');
                    setErrorDetails('Erro na sincronização');
                    updateStats();
                    break;
                default:
                    break;
            }
        };

        syncManager.addSyncListener(handler);

        // Intervalo para atualizar contagem pendente
        const interval = setInterval(updateStats, 5000);

        return () => {
            syncManager.removeSyncListener(handler);
            clearInterval(interval);
        };
    }, []);

    const updateStats = async () => {
        try {
            const currentStats = await syncManager.getSyncStats();
            setStats(currentStats);
        } catch (err) {
            console.warn('Could not fetch sync stats', err);
        }
    };

    const forceSync = () => {
        syncManager.forceSync();
    };

    if (status === 'online' && stats.pendingCount === 0 && !errorDetails) {
        return null; // Não mostrar nada se estiver tudo ok
    }

    const getStatusColor = () => {
        switch (status) {
            case 'offline': return '#ef4444'; // Red
            case 'syncing': return '#3b82f6'; // Blue
            case 'error': return '#f59e0b'; // Yellow/Orange
            default: return '#10b981'; // Green
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${getStatusColor()}`,
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <style>
                {`
          @keyframes slideIn {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes spin { 
            from { transform: rotate(0deg); } 
            to { transform: rotate(360deg); } 
          }
        `}
            </style>

            <div style={{
                color: getStatusColor(),
                display: 'flex',
                alignItems: 'center'
            }}>
                {status === 'offline' && <WifiOff size={20} />}
                {status === 'online' && <Wifi size={20} />}
                {status === 'syncing' && <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />}
                {status === 'error' && <WifiOff size={20} />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {status === 'offline' ? 'Modo Offline' :
                        status === 'syncing' ? 'Sincronizando...' :
                            status === 'error' ? 'Erro de Sincronização' : 'Online'}
                </div>

                {(stats.pendingCount > 0 || errorDetails) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {errorDetails || `${stats.pendingCount} item(s) pendente(s)`}
                    </div>
                )}
            </div>

            {stats.pendingCount > 0 && status !== 'syncing' && (
                <button
                    onClick={forceSync}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                    title="Sincronizar agora"
                >
                    <RefreshCw size={16} />
                </button>
            )}
        </div>
    );
};

export default SyncStatus;
