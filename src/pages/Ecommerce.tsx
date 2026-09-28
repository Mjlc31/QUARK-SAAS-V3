import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  MessageCircle,
  X,
  Check,
  Zap
} from 'lucide-react';
import { useEcommerce, useCreateEcommerceProduct, useUpdateEcommerceProduct, useDeleteEcommerceProduct } from '../hooks/useEcommerce';
import { EcommerceProduct } from '../types';

const Ecommerce: React.FC = () => {
  const { data: products, isLoading } = useEcommerce();
  const createProduct = useCreateEcommerceProduct();
  const updateProduct = useUpdateEcommerceProduct();
  const deleteProduct = useDeleteEcommerceProduct();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    promo_price: 0,
    image_url: '',
    includes_installation: false,
    delivery_days: 0,
    overload_percentage: 0
  });

  const categories = Array.from(new Set(products?.map(p => p.category).filter(Boolean)));

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesActive = filterActive === 'all' || p.is_active === filterActive;
    return matchesSearch && matchesCategory && matchesActive;
  }) || [];

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct.mutateAsync({
      ...formData,
      is_active: true
    } as any);
    setIsModalOpen(false);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: 0,
      promo_price: 0,
      image_url: '',
      includes_installation: false,
      delivery_days: 0,
      overload_percentage: 0
    });
  };

  const toggleActive = async (product: EcommerceProduct) => {
    await updateProduct.mutateAsync({
      id: product.id,
      is_active: !product.is_active
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-8 animate-enter pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <ShoppingCart className="text-lime-400" size={32} />
            E-commerce
          </h2>
          <p className="text-slate-400 text-sm mt-1">Catálogo institucional de equipamentos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-lime-500/20 to-transparent border border-lime-500/20 rounded-2xl p-6 flex items-center gap-4">
        <div className="bg-lime-500/10 p-3 rounded-xl text-lime-400">
          <Zap size={24} />
        </div>
        <div>
          <h3 className="text-lime-400 font-bold text-lg">Overload + Instalação em 60 dias</h3>
          <p className="text-slate-400 text-sm">Destaque os benefícios de comprar diretamente com a Quark Energia.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-lime-500 outline-none"
            />
          </div>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-500 outline-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={filterActive as any}
            onChange={(e) => setFilterActive(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-500 outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
        
        <div className="flex gap-1 bg-zinc-900/50 p-1 border border-white/5 rounded-xl">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-lime-400' : 'text-slate-500 hover:text-white'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-slate-500 hover:text-white'}`}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className={`glass-panel p-0 rounded-2xl overflow-hidden flex flex-col transition-all ${!product.is_active ? 'opacity-60 grayscale' : 'hover:border-lime-500/30'}`}>
              <div className="h-48 bg-zinc-900 relative">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ShoppingCart size={48} className="opacity-20" />
                  </div>
                )}
                {!product.is_active && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase">Inativo</div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-bold text-lime-400 tracking-wider">{product.category}</span>
                  <div className="flex gap-2">
                    {product.includes_installation && <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1 rounded-md font-bold">C/ Instalação</span>}
                    {product.overload_percentage && product.overload_percentage > 0 ? (
                      <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-1 rounded-md font-bold">Overload {product.overload_percentage}%</span>
                    ) : null}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{product.description}</p>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    {product.promo_price && product.promo_price > 0 && (
                      <p className="text-xs text-slate-500 line-through mb-0.5">{fmt(product.price)}</p>
                    )}
                    <p className="text-2xl font-bold font-mono text-lime-400">
                      {fmt(product.promo_price && product.promo_price > 0 ? product.promo_price : product.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase">Prazo</p>
                    <p className="text-sm font-bold text-white">{product.delivery_days} dias</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                  <a href={`https://wa.me/55000000000?text=Olá, tenho interesse no produto ${product.name}`} target="_blank" rel="noreferrer" className="col-span-2 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                    <MessageCircle size={16} /> Tirar Dúvidas
                  </a>
                  <div className="col-span-2 flex justify-between gap-2 mt-2">
                    <button onClick={() => toggleActive(product)} className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:border-white/20 text-slate-400 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                      {product.is_active ? <ToggleRight size={16} className="text-lime-400"/> : <ToggleLeft size={16} />} 
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button className="p-2 bg-zinc-900 border border-white/10 hover:border-white/20 text-slate-400 rounded-xl transition-colors"><Edit size={16}/></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 bg-zinc-900 border border-white/10 hover:border-red-500/30 hover:text-red-400 text-slate-400 rounded-xl transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Produto</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Categoria</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Preço</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map(product => (
                  <tr key={product.id} className={`hover:bg-white/5 transition-colors group ${!product.is_active ? 'opacity-60' : ''}`}>
                    <td className="p-4 text-sm font-medium text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden">
                        {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
                      </div>
                      {product.name}
                    </td>
                    <td className="p-4 text-sm text-slate-300">{product.category}</td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-lime-400 font-mono">
                        {fmt(product.promo_price && product.promo_price > 0 ? product.promo_price : product.price)}
                      </p>
                      {product.promo_price && product.promo_price > 0 && <p className="text-[10px] text-slate-500 line-through">{fmt(product.price)}</p>}
                    </td>
                    <td className="p-4">
                      <button onClick={() => toggleActive(product)}>
                        {product.is_active ? <ToggleRight size={24} className="text-lime-400"/> : <ToggleLeft size={24} className="text-slate-500" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button className="p-1.5 text-slate-500 hover:text-white transition-colors"><Edit size={16}/></button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-white/10 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Novo Produto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Produto</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Imagem URL</label>
                  <input 
                    type="url" 
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço (R$)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço Promocional (Opcional)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.promo_price || ''}
                    onChange={e => setFormData({...formData, promo_price: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prazo de Entrega (Dias)</label>
                  <input 
                    type="number" 
                    value={formData.delivery_days || ''}
                    onChange={e => setFormData({...formData, delivery_days: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Overload (%)</label>
                  <input 
                    type="number" 
                    value={formData.overload_percentage || ''}
                    onChange={e => setFormData({...formData, overload_percentage: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox"
                  id="includes_installation"
                  checked={formData.includes_installation}
                  onChange={e => setFormData({...formData, includes_installation: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-zinc-900 text-lime-500 focus:ring-lime-500"
                />
                <label htmlFor="includes_installation" className="text-sm font-bold text-white cursor-pointer">Inclui Instalação</label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500 resize-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-white/5 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2" disabled={createProduct.isPending}>
                  {createProduct.isPending ? 'Salvando...' : <><Check size={18} /> Salvar Produto</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ecommerce;
