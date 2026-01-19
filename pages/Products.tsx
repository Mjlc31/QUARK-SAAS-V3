import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Tag, Zap } from 'lucide-react';
import { Product } from '../types';
import { storageService } from '../services/storageService';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'Painel', price: '', power: '' });

  useEffect(() => {
    setProducts(storageService.getProducts());
  }, []);

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      price: Number(formData.price),
      power: formData.power ? Number(formData.power) : undefined
    };
    const updated = [...products, newProduct];
    setProducts(updated);
    storageService.saveProducts(updated);
    setIsFormOpen(false);
    setFormData({ name: '', type: 'Painel', price: '', power: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      storageService.saveProducts(updated);
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Catálogo de Produtos</h2>
          <p className="text-slate-400 text-sm">Gerencie kits, painéis e inversores</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-lime-500 hover:bg-lime-400 text-black px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-lime-500/20 transition-all"
        >
          <Plus size={20} /> Novo Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="glass-panel p-6 rounded-2xl group hover:border-lime-500/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${product.type === 'Painel' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                {product.type === 'Painel' ? <Zap size={24} /> : <Package size={24} />}
              </div>
              <button 
                onClick={() => handleDelete(product.id)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded bg-white/5 text-slate-300 border border-white/5">{product.type}</span>
              {product.power && <span className="text-xs px-2 py-1 rounded bg-white/5 text-slate-300 border border-white/5">{product.power} W</span>}
            </div>
            
            <div className="flex items-end justify-between border-t border-white/5 pt-4">
              <div className="text-xs text-slate-500">Preço Unitário</div>
              <div className="text-xl font-display font-bold text-lime-400">R$ {product.price.toLocaleString('pt-BR')}</div>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 border border-white/20 shadow-2xl animate-enter">
            <h2 className="text-2xl font-bold text-white mb-6">Novo Produto</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Produto</label>
                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-lime-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo</label>
                   <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-lime-500 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                     <option value="Painel">Painel</option>
                     <option value="Inversor">Inversor</option>
                     <option value="Estrutura">Estrutura</option>
                     <option value="Kit">Kit Completo</option>
                   </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço (R$)</label>
                  <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-lime-500 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Potência (W) - Opcional</label>
                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-lime-500 outline-none" value={formData.power} onChange={e => setFormData({...formData, power: e.target.value})} />
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsFormOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-medium">Cancelar</button>
              <button onClick={handleAddProduct} className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-lg shadow-lime-500/20">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;