import axios from 'axios';
import OfflineDatabase from './services/OfflineDatabase';

const api = axios.create({
    baseURL: '/api',
});

// Inicializar banco de dados offline
const db = new OfflineDatabase();
db.init().catch(err => console.error('Failed to init offline DB:', err));

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para lidar com operações offline
// Interceptor para lidar com operações offline
api.interceptors.response.use(
    async (response) => {
        // Cachear respostas GET para uso offline
        if (response.config.method === 'get' && response.data && Array.isArray(response.data)) {
            const url = response.config.url.replace('/api', '').replace(/^\/+|\/+$/g, '');
            let storeName = url.split('/')[0];

            // Mapeamentos Corretos para OfflineDatabase
            if (url.includes('extra-sales')) storeName = 'sales';
            else if (url.includes('service-orders')) storeName = 'serviceOrders';
            else if (url.includes('inventory')) storeName = 'inventory';
            else if (url.includes('reports')) storeName = 'reports';

            const validStores = ['clients', 'partners', 'products', 'contracts', 'sales', 'payments', 'serviceOrders', 'inventory', 'sellers', 'reports'];

            if (validStores.includes(storeName)) {
                // Async save - não bloquear UI
                db.saveAll(storeName, response.data).catch(err =>
                    console.warn('[Offline API] Failed to cache data for', storeName, err)
                );

                // --- MERGE PENDING ITEMS ---
                // Se a resposta veio com sucesso (podendo ser do cache do SW), 
                // garantir que itens locais pendentes apareçam na lista.
                try {
                    const pendingQueue = await db.getPendingByStore(storeName);
                    const pendingItems = pendingQueue
                        .filter(item => item.operation === 'CREATE' && item.data && (item.data.client_name || item.data.name))
                        .map(item => ({
                            ...item.data,
                            id: `temp_${item.queueId}`,
                            isPending: true,
                            created_at: item.timestamp
                        }));

                    if (pendingItems.length > 0) {
                        // Evitar duplicatas se o navegador resolveu o cache de forma estranha
                        const existingIds = new Set(response.data.map(r => r.id));
                        const uniquePending = pendingItems.filter(p => !existingIds.has(p.id));

                        response.data = [...uniquePending, ...response.data];
                    }
                } catch (e) {
                    console.warn('[Offline API] Failed to merge pending items into success response', e);
                }
            }
        }
        return response;
    },
    async (error) => {
        const config = error.config;

        // Melhor detecção de erro de rede (incluindo estado offline do navegador)
        const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || !navigator.onLine;

        if (!isNetworkError) {
            return Promise.reject(error);
        }

        // Operações de leitura (GET) offline - Tentar Cache + Fila de Sync
        if (config.method === 'get') {
            console.warn(`[Offline API] Network Error for GET ${config.url}. Trying local cache + sync queue.`);
            try {
                let cleanUrl = config.url.replace('/api', '');
                cleanUrl = cleanUrl.replace(/^\/+|\/+$/g, '');

                let storeName = cleanUrl.split('/')[0];
                if (cleanUrl.includes('extra-sales')) storeName = 'sales';
                if (cleanUrl.includes('service-orders')) storeName = 'serviceOrders';
                if (cleanUrl.includes('reports')) storeName = 'reports';

                if (storeName) {
                    const cachedData = await db.getAll(storeName);

                    // Buscar itens pendentes na fila de sync para este store
                    const pendingQueue = await db.getPendingByStore(storeName);
                    const pendingItems = pendingQueue
                        .filter(item => item.operation === 'CREATE')
                        .map(item => ({
                            ...item.data,
                            id: `temp_${item.queueId}`,
                            isPending: true,
                            created_at: item.timestamp
                        }));

                    // Mesclar: itens do cache (servidor) + itens locais ainda não sincronizados
                    const mergedData = [...pendingItems, ...cachedData];

                    if (mergedData.length > 0) {
                        return {
                            data: mergedData, status: 200, statusText: 'OK (Cache Merged)', headers: {}, config: config, isCache: true
                        };
                    }
                }
            } catch (cacheErr) { console.error('[Offline API] Cache retrieval failed:', cacheErr); }
            return Promise.reject(error);
        }

        // Se for operação de escrita (POST, PUT, PATCH, DELETE) salvar na fila
        if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
            // Tratamento especial para upload de imagem individual em modo offline
            if (config.url.includes('/reports/upload-image')) {
                let base64 = 'offline-placeholder';
                if (config.data instanceof FormData) {
                    const file = config.data.get('image');
                    if (file instanceof File) {
                        base64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(file);
                        });
                    }
                }
                return {
                    data: { imageUrl: base64 },
                    status: 200,
                    statusText: 'OK (Captured Base64)',
                    config: config
                };
            }

            console.log(`[Offline API v3] Capturing offline request: ${config.method.toUpperCase()} ${config.url}`);
            try {
                // Determinar o nome do store baseado na URL
                let cleanUrl = config.url.replace('/api', '');
                cleanUrl = cleanUrl.replace(/^\/+|\/+$/g, '');

                const urlParts = cleanUrl.split('/');
                let storeName = urlParts[0];

                // Normalizações específicas
                if (cleanUrl.includes('extra-sales')) storeName = 'sales';
                if (cleanUrl.includes('service-orders')) storeName = 'serviceOrders';
                if (cleanUrl.includes('inventory')) storeName = 'inventory';
                if (cleanUrl.includes('reports')) storeName = 'reports';

                console.log(`[Offline API v4] Url: ${config.url}, Clean: ${cleanUrl}, Mapped Store: ${storeName}`);

                if (!storeName) {
                    console.error('[Offline API] Could not determine store name for URL:', config.url);
                    return Promise.reject(error);
                }

                // Improved data handling for sync queue
                let syncData = config.data;

                // Handle FormData specifically as it cannot be JSON.stringified directly
                if (config.data instanceof FormData) {
                    const formDataObj = {};
                    for (const [key, value] of config.data.entries()) {
                        if (value instanceof File) {
                            const base64 = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(value);
                            });
                            formDataObj[key] = {
                                _isFile: true,
                                name: value.name,
                                type: value.type,
                                data: base64
                            };
                        } else {
                            formDataObj[key] = value;
                        }
                    }
                    syncData = formDataObj;
                } else if (typeof config.data === 'string') {
                    try {
                        syncData = JSON.parse(config.data);
                    } catch (e) {
                        syncData = config.data;
                    }
                }

                const method = config.method.toUpperCase();
                let operation = 'CREATE';
                let itemId = null;

                if (method === 'POST') operation = 'CREATE';
                if (method === 'PUT' || method === 'PATCH') {
                    operation = 'UPDATE';
                    const idMatch = config.url.match(/\/(\d+)$/);
                    if (idMatch) itemId = parseInt(idMatch[1]);
                }
                if (method === 'DELETE') {
                    operation = 'DELETE';
                    const idMatch = config.url.match(/\/(\d+)$/);
                    if (idMatch) itemId = parseInt(idMatch[1]);
                }

                await db.addToSyncQueue(operation, storeName, itemId, syncData);

                return {
                    data: syncData || {},
                    status: 200,
                    statusText: 'OK (Offline Captured)',
                    headers: {},
                    config: config,
                    isOffline: true
                };

            } catch (dbError) {
                console.error('[Offline API] Error saving to queue:', dbError);
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
