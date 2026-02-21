/**
 * OfflineDatabase - Gerenciador OOP para IndexedDB
 * Armazena dados localmente quando offline e sincroniza quando online
 */
class OfflineDatabase {
    constructor(dbName = 'UniSisDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.syncQueue = [];
    }

    /**
     * Inicializa o banco de dados IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('[OfflineDB] Database initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[OfflineDB] Upgrading database schema...');

                // Criar object stores para cada entidade
                const stores = [
                    'clients',
                    'partners',
                    'products',
                    'contracts',
                    'sales',
                    'payments',
                    'serviceOrders',
                    'inventory',
                    'sellers',
                    'reports'
                ];

                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, {
                            keyPath: 'id',
                            autoIncrement: true
                        });

                        // Criar índices
                        store.createIndex('syncStatus', 'syncStatus', { unique: false });
                        store.createIndex('createdAt', 'createdAt', { unique: false });
                        store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                });

                // Store para fila de sincronização
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', {
                        keyPath: 'queueId',
                        autoIncrement: true
                    });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    /**
     * Adiciona um item ao store
     */
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        const item = {
            ...data,
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOffline: true
        };

        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => {
                console.log(`[OfflineDB] Added to ${storeName}:`, request.result);
                this.addToSyncQueue('CREATE', storeName, request.result, item);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Atualiza um item no store
     */
    async update(storeName, id, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (!item) {
                    reject(new Error('Item not found'));
                    return;
                }

                const updatedItem = {
                    ...item,
                    ...data,
                    updatedAt: new Date().toISOString(),
                    syncStatus: 'pending'
                };

                const putRequest = store.put(updatedItem);
                putRequest.onsuccess = () => {
                    console.log(`[OfflineDB] Updated in ${storeName}:`, id);
                    this.addToSyncQueue('UPDATE', storeName, id, updatedItem);
                    resolve(putRequest.result);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Remove um item do store
     */
    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => {
                console.log(`[OfflineDB] Deleted from ${storeName}:`, id);
                this.addToSyncQueue('DELETE', storeName, id);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Busca todos os itens de um store
     */
    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Busca um item específico
     */
    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Adiciona operação à fila de sincronização
     */
    async addToSyncQueue(operation, storeName, itemId, data = null) {
        if (!this.db) {
            await this.init();
        }

        if (!storeName) {
            console.error('[OfflineDB] Cannot add to sync queue: storeName is missing');
            return;
        }

        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');

        const queueItem = {
            operation,
            storeName,
            itemId,
            data,
            timestamp: new Date().toISOString(),
            status: 'pending',
            retryCount: 0
        };

        return new Promise((resolve, reject) => {
            const request = store.add(queueItem);
            request.onsuccess = () => {
                console.log('[OfflineDB] Added to sync queue:', queueItem);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtém itens pendentes de sincronização
     */
    async getPendingSyncItems() {
        if (!this.db) {
            await this.init();
        }

        try {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const index = store.index('status');

            return new Promise((resolve, reject) => {
                const request = index.getAll('pending');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('[OfflineDB] Could not get pending items (DB might not be ready yet):', error);
            return [];
        }
    }

    /**
     * Obtém itens pendentes filtrados por storeName
     */
    async getPendingByStore(storeName) {
        const pending = await this.getPendingSyncItems();
        return pending.filter(item => item.storeName === storeName);
    }

    /**
     * Marca item da fila como sincronizado
     */
    async markAsSynced(queueId) {
        if (!this.db) {
            await this.init();
        }

        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(queueId);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    item.status = 'synced';
                    item.syncedAt = new Date().toISOString();

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
     * Limpa itens sincronizados antigos
     */
    async cleanSyncedItems(daysOld = 7) {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const index = store.index('status');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only('synced'));
            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = cursor.value;
                    if (new Date(item.syncedAt) < cutoffDate) {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                } else {
                    console.log(`[OfflineDB] Cleaned ${deletedCount} old synced items`);
                    resolve(deletedCount);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Salva uma coleção inteira de itens (substituindo ou mesclando)
     * Útil para cache de GET requests
     */
    async saveAll(storeName, items) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            // Opcional: Limpar store antes de salvar tudo?
            // Para cache offline, talvez seja melhor mesclar para não perder pendentes?
            // Mas pendentes estão na fila de sync, então o store local pode refletir o servidor.
            // Vamos apenas adicionar/atualizar

            let count = 0;
            items.forEach(item => {
                // Adiciona flag cached para distinguir de criados localmente (se necessário)
                const itemToSave = { ...item, _cachedAt: new Date().toISOString() };
                store.put(itemToSave);
                count++;
            });

            transaction.oncomplete = () => {
                console.log(`[OfflineDB] Cached ${count} items in ${storeName}`);
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }
}


export default OfflineDatabase;
