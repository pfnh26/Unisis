import React, { useState, useEffect } from 'react';
import api from './api';
import { ClipboardList, CheckCircle, XCircle, Clock, MapPin, Phone, Info, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';
import { format, isAfter, startOfDay } from 'date-fns';

const safeDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'object') return dateStr;
    // Se a string for YYYY-MM-DD, divide e cria em hora local para evitar o shift de timezone
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
};

const ServiceOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [tempStatus, setTempStatus] = useState(null);

    const fetchOrders = async () => {
        try {
            const { data } = await api.get('/service-orders');
            setOrders(data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchOrders(); }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/service-orders/${id}`, { status });
            setIsConfirmModalOpen(false);
            fetchOrders();
            if (isDetailsModalOpen) setIsDetailsModalOpen(false);
        } catch (err) { alert("Erro ao atualizar status"); }
    };

    const confirmCancel = (order) => {
        setSelectedOrder(order);
        setTempStatus('Cancelado');
        setIsConfirmModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Feito': return '#10b981';
            case 'Cancelado': return '#ef4444';
            default: return '#f59e0b';
        }
    };

    const isDelayed = (date, status) => {
        return status === 'Pendente' && isAfter(startOfDay(new Date()), startOfDay(safeDate(date)));
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Minhas Ordens de Serviço</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#f59e0b' }}><Clock size={14} /> Pendente</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#10b981' }}><CheckCircle size={14} /> Feito</span>
                </div>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Atividade</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Nenhuma ordem de serviço encontrada.</p>
                                </td>
                            </tr>
                        ) : orders.map(order => (
                            <tr key={order.id}>
                                <td data-label="Data">
                                    {format(safeDate(order.execution_date), 'dd/MM/yyyy')}
                                    {isDelayed(order.execution_date, order.status) && (
                                        <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>ATRASADO</span>
                                    )}
                                </td>
                                <td data-label="Cliente">{order.client_name}</td>
                                <td data-label="Atividade">{order.activity}</td>
                                <td data-label="Status" style={{ color: getStatusColor(order.status), fontWeight: 600 }}>{order.status}</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => { setSelectedOrder(order); setIsDetailsModalOpen(true); }} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#3b82f6' }} title="Detalhes">
                                            <Info size={22} />
                                        </button>

                                        {order.status === 'Pendente' && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(order.id, 'Feito')} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#10b981' }} title="Concluir">
                                                    <CheckCircle size={22} />
                                                </button>
                                                <button onClick={() => confirmCancel(order)} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#ef4444' }} title="Cancelar">
                                                    <XCircle size={22} />
                                                </button>
                                            </>
                                        )}

                                        {order.status !== 'Pendente' && (
                                            <button onClick={() => handleStatusUpdate(order.id, 'Pendente')} className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#6b7280' }} title="Reativar / Voltar para Pendente">
                                                <RotateCcw size={22} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Detalhes da Ordem de Serviço">
                {selectedOrder && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div className="card" style={{ padding: '1rem', borderLeft: `4px solid ${getStatusColor(selectedOrder.status)}` }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{selectedOrder.activity}</p>
                            <p style={{ color: 'var(--text-muted)' }}>Status: {selectedOrder.status}</p>
                        </div>

                        <div>
                            <p className="label">Cliente</p>
                            <p style={{ fontWeight: 600, fontSize: '1.2rem' }}>{selectedOrder.client_name}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <p className="label"><MapPin size={12} inline="true" /> Endereço</p>
                                <p>{selectedOrder.client_address}</p>
                            </div>
                            <div>
                                <p className="label"><Phone size={12} inline="true" /> Telefone</p>
                                <p>{selectedOrder.client_phone}</p>
                            </div>
                        </div>

                        <div>
                            <p className="label">Data Programada</p>
                            <p>{format(safeDate(selectedOrder.execution_date), 'dd/MM/yyyy')}</p>
                        </div>

                        <div>
                            <p className="label">Descrição</p>
                            <p className="description-text">{selectedOrder.details_description}</p>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-muted)' }}>Fechar</button>
                            {selectedOrder.status === 'Pendente' && (
                                <button onClick={() => handleStatusUpdate(selectedOrder.id, 'Feito')} className="btn-primary" style={{ flex: 1 }}>Marcar como Concluída</button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <ModalConfirm
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={() => handleStatusUpdate(selectedOrder.id, tempStatus)}
                title="Confirmar Cancelamento"
                message={`Deseja realmente cancelar a Ordem de Serviço #${selectedOrder?.id} para ${selectedOrder?.client_name}?`}
            />
        </div>
    );
};

export default ServiceOrdersPage;
