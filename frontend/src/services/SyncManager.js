import api from '../api';
import OfflineDatabase from './OfflineDatabase';

/**
 * SyncManager - Gerenciador OOP para sincronização offline/online
 * Sincroniza dados do IndexedDB com o servidor quando a conexão é restaurada
 */
class SyncManager {
    constructor() {
        this.db = null;
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncListeners = [];
        this.retryDelay = 5000; // 5 segundos
        this.maxRetries = 3;
    }

    /**
     * Inicializa o gerenciador de sincronização
     */
    /**
     * Inicializa o gerenciador de sincronização
     */
    async init() {
        this.db = new OfflineDatabase();
        await this.db.init();

        // Monitorar mudanças de conectividade
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Verificação periódica de conexão ativa
        setInterval(() => this.checkConnection(), 15000);

        // Registrar service worker para sync em background
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                // Escutar mensagens do service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'SYNC_OFFLINE_DATA') {
                        this.syncAll();
                    }
                });
            } catch (e) { console.warn("SW not ready yet", e); }
        }

        // Se estiver online, tentar sincronizar e pre-cachear se houver um token
        if (this.isOnline) {
            const token = localStorage.getItem('token');
            if (token) {
                this.syncAll();
                this.preCacheData();
            }
        }

        console.log('[SyncManager] Initialized');
    }

    /**
     * Faz o download proativo dos dados principais para uso offline
     */
    async preCacheData() {
        if (!this.isOnline) return;

        // Throttling: evitar disparar pre-cache muitas vezes seguidas (mínimo 30s)
        const now = Date.now();
        if (this._lastPreCache && (now - this._lastPreCache < 30000)) {
            return;
        }
        this._lastPreCache = now;

        console.log('[SyncManager] Starting pre-cache of essential data...');
        const endpoints = [
            '/clients',
            '/reports',
            '/partners',
            '/products',
            '/sellers',
            '/contracts',
            '/service-orders',
            '/inventory-logs'
        ];

        // Disparar requisições em paralelo. O interceptor do api.js cuidará de salvar no IndexedDB.
        endpoints.forEach(endpoint => {
            api.get(endpoint).catch(err => {
                console.warn(`[SyncManager] Failed to pre-cache ${endpoint}:`, err.message);
            });
        });
    }

    /**
     * Verificação ativa de conexão (Ping)
     */
    async checkConnection() {
        try {
            // Adicionar timestamp para garantir que não pegue do cache
            await fetch(`/manifest.json?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
            if (!this.isOnline) this.handleOnline();
        } catch (e) {
            if (this.isOnline) this.handleOffline();
        }
    }

    /**
     * Handler quando volta online
     */
    handleOnline() {
        if (this.isOnline) return;
        console.log('[SyncManager] Connection restored');
        this.isOnline = true;
        this.notifyListeners({ type: 'online' });

        // Tentar sincronizar após 2 segundos
        setTimeout(() => this.syncAll(), 2000);
    }

    /**
     * Handler quando fica offline
     */
    handleOffline() {
        if (!this.isOnline) return;
        console.log('[SyncManager] Connection lost');
        this.isOnline = false;
        this.notifyListeners({ type: 'offline' });
    }

    /**
     * Adiciona listener para eventos de sincronização
     */
    addSyncListener(callback) {
        this.syncListeners.push(callback);
    }

    /**
     * Remove listener
     */
    removeSyncListener(callback) {
        this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    }

    /**
     * Notifica todos os listeners
     */
    notifyListeners(event) {
        this.syncListeners.forEach(callback => callback(event));
    }

    /**
     * Sincroniza todos os dados pendentes
     */
    async syncAll() {
        if (!this.isOnline || this.isSyncing) {
            console.log('[SyncManager] Skipping sync - offline or already syncing');
            return;
        }

        this.isSyncing = true;
        this.notifyListeners({ type: 'sync-start' });

        try {
            const pendingItems = await this.db.getPendingSyncItems();
            console.log(`[SyncManager] Found ${pendingItems.length} items to sync`);

            let successCount = 0;
            let errorCount = 0;

            for (const item of pendingItems) {
                try {
                    const serverResponse = await this.syncItem(item);

                    // Se a operação retornou dados do servidor, atualizar o cache local
                    if (serverResponse && item.storeName) {
                        // Salvar no store principal para substituir o placeholder offline
                        await this.db.saveAll(item.storeName, [serverResponse]);
                    }

                    await this.db.markAsSynced(item.queueId);
                    successCount++;
                } catch (error) {
                    console.error('[SyncManager] Error syncing item:', error);
                    errorCount++;

                    if (item.retryCount < this.maxRetries) {
                        await this.incrementRetryCount(item.queueId);
                    }
                }
            }

            console.log(`[SyncManager] Sync complete: ${successCount} success, ${errorCount} errors`);

            this.notifyListeners({
                type: 'sync-complete',
                success: successCount,
                errors: errorCount
            });

            // Limpar itens sincronizados antigos
            await this.db.cleanSyncedItems(7);

        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
            this.notifyListeners({ type: 'sync-error', error });
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sincroniza um item específico
     */
    async syncItem(item) {
        const { operation, storeName, itemId, data } = item;
        const endpoint = this.getEndpoint(storeName);

        console.log(`[SyncManager] Syncing ${operation} ${storeName} ${itemId}`);

        if (!storeName) {
            console.error(`[SyncManager] Invalid storeName for item ${item.queueId}. Marking as synced to clear queue.`);
            return; // Treat as success to clear it from queue
        }

        switch (operation) {
            case 'CREATE':
                return await this.syncCreate(endpoint, data);

            case 'UPDATE':
                return await this.syncUpdate(endpoint, itemId, data);

            case 'DELETE':
                return await this.syncDelete(endpoint, itemId);

            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Sincroniza criação
     */
    async syncCreate(endpoint, data) {
        // Remover campos de controle offline
        const cleanData = { ...data };
        delete cleanData.id;
        delete cleanData.syncStatus;
        delete cleanData.isOffline;
        delete cleanData.createdAt;
        delete cleanData.updatedAt;

        // Check if data contains file objects that need to be reconstituted as FormData
        let payload = cleanData;
        let isFormData = false;

        for (const key in cleanData) {
            if (cleanData[key] && cleanData[key]._isFile) {
                isFormData = true;
                break;
            }
        }

        if (isFormData) {
            payload = new FormData();
            for (const key in cleanData) {
                if (cleanData[key] && cleanData[key]._isFile) {
                    // Re-convert Base64 to Blob
                    const base64Data = cleanData[key].data;
                    const response = await fetch(base64Data);
                    const blob = await response.blob();
                    payload.append(key, blob, cleanData[key].name);
                } else {
                    payload.append(key, cleanData[key]);
                }
            }
        }

        const response = await api.post(endpoint, payload, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
        });
        return response.data;
    }

    /**
     * Sincroniza atualização
     */
    async syncUpdate(endpoint, itemId, data) {
        // Remover campos de controle offline
        const cleanData = { ...data };
        delete cleanData.syncStatus;
        delete cleanData.isOffline;
        delete cleanData.createdAt;
        delete cleanData.updatedAt;

        const response = await api.patch(`${endpoint}/${itemId}`, cleanData);
        return response.data;
    }

    /**
     * Sincroniza exclusão
     */
    async syncDelete(endpoint, itemId) {
        const response = await api.delete(`${endpoint}/${itemId}`);
        return response.data;
    }

    /**
     * Mapeia store name para endpoint da API
     */
    getEndpoint(storeName) {
        const endpoints = {
            clients: '/clients',
            partners: '/partners',
            products: '/products',
            contracts: '/contracts',
            sales: '/extra-sales',
            payments: '/payments',
            serviceOrders: '/service-orders',
            inventory: '/inventory/log',
            sellers: '/sellers'
        };

        return endpoints[storeName] || `/${storeName}`;
    }

    /**
     * Incrementa contador de retry
     */
    async incrementRetryCount(queueId) {
        const transaction = this.db.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(queueId);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    item.retryCount = (item.retryCount || 0) + 1;
                    item.lastRetry = new Date().toISOString();

                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Força sincronização manual
     */
    async forceSync() {
        console.log('[SyncManager] Force sync requested');
        return await this.syncAll();
    }

    /**
     * Verifica se há dados pendentes
     */
    async hasPendingData() {
        const pendingItems = await this.db.getPendingSyncItems();
        return pendingItems.length > 0;
    }

    /**
     * Obtém estatísticas de sincronização
     */
    async getSyncStats() {
        if (!this.db || !this.db.db) {
            // Banco não inicializado ainda
            return {
                isOnline: this.isOnline,
                isSyncing: this.isSyncing,
                pendingCount: 0,
                pendingItems: []
            };
        }

        try {
            const pendingItems = await this.db.getPendingSyncItems();

            return {
                isOnline: this.isOnline,
                isSyncing: this.isSyncing,
                pendingCount: pendingItems.length,
                pendingItems: pendingItems.map(item => ({
                    operation: item.operation,
                    storeName: item.storeName,
                    timestamp: item.timestamp,
                    retryCount: item.retryCount
                }))
            };
        } catch (error) {
            console.warn('[SyncManager] Error getting stats:', error);
            return {
                isOnline: this.isOnline,
                isSyncing: false,
                pendingCount: 0,
                pendingItems: []
            };
        }
    }
}

// Singleton instance
const syncManager = new SyncManager();

export default syncManager;
