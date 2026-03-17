import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import Modal from './Modal';
import ModalConfirm from './ModalConfirm';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [targetProduct, setTargetProduct] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({ description: '', code: '', unit: 'Unidade', cost: 0 });

    const fetchProducts = useCallback(async () => {
        try {
            const { data } = await api.get(`/products?search=${search}`);
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(fetchProducts, 500);
        return () => clearTimeout(timer);
    }, [fetchProducts]);

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            await api.post('/products', newProduct);
            setIsAddModalOpen(false);
            setNewProduct({ description: '', code: '', unit: 'Unidade', cost: 0 });
            fetchProducts();
        } catch (err) {
            alert("Erro ao adicionar produto. Verifique se o código é único.");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { id, created_at, ...updates } = editingProduct;
            await api.patch(`/products/${id}`, updates);
            setIsEditModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
        } catch (err) {
            alert("Erro ao atualizar produto");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/products/${targetProduct.id}`);
            setIsDeleteModalOpen(false);
            fetchProducts();
        } catch (err) {
            alert("Erro ao excluir");
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cadastro de Produtos e Insumos</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                    <Plus size={18} /> Novo Produto
                </button>
            </div>

            <div className="search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Pesquisar por descrição ou código único..."
                        style={{ paddingLeft: '3rem' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Unidade</th>
                            <th>Custo (R$)</th>
                            <th style={{ width: '100px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td data-label="Código">{product.code}</td>
                                <td data-label="Descrição">{product.description}</td>
                                <td data-label="Unidade">{product.unit}</td>
                                <td data-label="Custo">R$ {parseFloat(product.cost).toFixed(2)}</td>
                                <td data-label="Ações">
                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => { setEditingProduct(product); setIsEditModalOpen(true); }}
                                            className="btn-primary" style={{ padding: '0.8rem', backgroundColor: 'var(--primary)' }}
                                        >
                                            <Edit2 size={24} />
                                        </button>
                                        <button
                                            onClick={() => { setTargetProduct(product); setIsDeleteModalOpen(true); }}
                                            className="btn-primary" style={{ padding: '0.8rem', backgroundColor: '#ef4444' }}
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL ADICIONAR */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Produto">
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Descrição</label>
                    <input className="input-field" placeholder="Descrição" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} required />
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código Único</label>
                    <input className="input-field" placeholder="Código Único" value={newProduct.code} onChange={e => setNewProduct({ ...newProduct, code: e.target.value })} required />
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unidade de Medida</label>
                    <select className="input-field" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}>
                        <option value="Unidade">Unidade</option>
                        <option value="Bombonas">Bombonas</option>
                        <option value="KG">KG</option>
                        <option value="PC">PC</option>
                    </select>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custo</label>
                    <input type="number" step="0.01" className="input-field" placeholder="Custo" value={newProduct.cost} onChange={e => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) })} required />
                    <button type="submit" className="btn-primary">Criar Produto</button>
                </form>
            </Modal>

            {/* MODAL EDITAR */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editando: ${editingProduct?.description}`}>
                {editingProduct && (
                    <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Descrição</label>
                        <input className="input-field" value={editingProduct.description} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} required />

                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código</label>
                        <input className="input-field" value={editingProduct.code} onChange={e => setEditingProduct({ ...editingProduct, code: e.target.value })} required />

                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unidade</label>
                        <select className="input-field" value={editingProduct.unit} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}>
                            <option value="Unidade">Unidade</option>
                            <option value="Bombonas">Bombonas</option>
                            <option value="KG">KG</option>
                            <option value="PC">PC</option>
                        </select>

                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custo</label>
                        <input type="number" step="0.01" className="input-field" value={editingProduct.cost} onChange={e => setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) })} required />

                        <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Salvar Alterações</button>
                    </form>
                )}
            </Modal>
            <ModalConfirm
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Produto"
                message={`Deseja excluir o produto ${targetProduct?.description}?`}
            />
        </div>
    );
};

export default ProductsPage;
