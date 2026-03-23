import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Trash2, Zap, Search, Filter, Layers, Box, Cpu, Cable, CircuitBoard, Hammer, AlertCircle, X, ChevronDown, Check, DollarSign } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { storageService } from '../services/storageService';

const CATEGORIES: { id: ProductCategory; label: string; icon: any; color: string }[] = [
  { id: 'Módulo', label: 'Módulos', icon: Zap, color: 'text-yellow-400 bg-yellow-500/10' },
  { id: 'Inversor', label: 'Inversores', icon: Cpu, color: 'text-blue-400 bg-blue-500/10' },
  { id: 'Estrutura', label: 'Estruturas', icon: Hammer, color: 'text-slate-400 bg-slate-500/10' },
  { id: 'Cabo', label: 'Cabos', icon: Cable, color: 'text-red-400 bg-red-500/10' },
  { id: 'String Box', label: 'String Box', icon: Box, color: 'text-orange-400 bg-orange-500/10' },
  { id: 'Disjuntor', label: 'Disjuntores', icon: CircuitBoard, color: 'text-zinc-400 bg-zinc-500/10' },
  { id: 'Outros', label: 'Outros', icon: Layers, color: 'text-purple-400 bg-purple-500/10' },
];

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Todos'>('Todos');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    category: 'Módulo',
    price: 0,
    power: 0,
    powerUnit: 'W',
    stock: 0,
    description: ''
  });

  useEffect(() => {
    storageService.getProducts().then(setProducts);
  }, []);

  // --- Inventory Calculations ---
  const inventoryMetrics = useMemo(() => {
    const totalValue = products.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);
    const lowStockCount = products.filter(p => p.stock < 5).length;
    return { totalValue, lowStockCount };
  }, [products]);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.brand || !formData.price) return;

    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      brand: formData.brand,
      category: formData.category as ProductCategory,
      price: Number(formData.price),
      power: formData.power ? Number(formData.power) : undefined,
      powerUnit: formData.powerUnit,
      stock: Number(formData.stock) || 0,
      description: formData.description
    };

    setProducts(prev => [...prev, newProduct]);
    setIsFormOpen(false);
    resetForm();
    await storageService.syncProduct(newProduct);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      category: 'Módulo',
      price: 0,
      power: 0,
      powerUnit: 'W',
      stock: 0,
      description: ''
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja remover este produto do catálogo?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      await storageService.deleteProduct(id);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-enter pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">Catálogo de Materiais</h2>
          <p className="text-slate-400 text-sm mt-1">Gerencie seu inventário de equipamentos fotovoltaicos.</p>
        </div>
        
        <div className="flex gap-4">
             {/* Inventory Value KPI */}
             <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-zinc-900/50 rounded-xl border border-white/5">
                <div className="p-2 bg-lime-500/10 rounded-lg text-lime-400">
                   <DollarSign size={18} />
                </div>
                <div>
                   <p className="text-[10px] text-slate-500 uppercase font-bold">Valor em Estoque</p>
                   <p className="text-white font-bold">R$ {inventoryMetrics.totalValue.toLocaleString()}</p>
                </div>
             </div>

           <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar marca, modelo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-lime-500 outline-none placeholder-slate-600 transition-all"
                />
              </div>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-lime-500 hover:bg-lime-400 text-black px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-[0_0_15px_rgba(163,230,53,0.2)] transition-all hover:scale-105"
              >
                <Plus size={18} strokeWidth={3} /> <span className="hidden md:inline">Adicionar Item</span>
              </button>
           </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setSelectedCategory('Todos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
            selectedCategory === 'Todos' 
              ? 'bg-zinc-800 text-white border-white/10 shadow-lg' 
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-zinc-800 text-white border-white/10 shadow-lg'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 glass-panel rounded-2xl border-dashed border-white/10">
          <Package size={48} strokeWidth={1} className="mb-4 opacity-50" />
          <p>Nenhum produto encontrado.</p>
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-lime-400 text-sm mt-2 hover:underline">Limpar busca</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const categoryConfig = CATEGORIES.find(c => c.id === product.category) || CATEGORIES[6];
            const Icon = categoryConfig.icon;
            const isLowStock = product.stock < 5 && product.stock > 0;

            return (
              <div key={product.id} className="glass-panel p-0 rounded-2xl group hover:border-lime-500/30 transition-all flex flex-col h-full overflow-hidden relative">
                
                {/* Product Header */}
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${categoryConfig.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        product.stock === 0 ? 'bg-red-500/10 text-red-400 border-red-500/10' :
                        isLowStock ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' :
                        'bg-green-500/10 text-green-400 border-green-500/10'
                      }`}>
                        {product.stock === 0 ? 'Sem Estoque' : `${product.stock} un.`}
                      </span>
                      <button 
                        onClick={(e) => handleDelete(product.id, e)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{product.brand}</p>
                    <h3 className="text-lg font-bold text-white leading-tight">{product.name}</h3>
                  </div>
                </div>

                {/* Specs */}
                <div className="px-6 py-3 bg-white/5 border-y border-white/5 grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[10px] text-slate-500 uppercase">Categoria</p>
                      <p className="text-sm text-slate-300 font-medium">{product.category}</p>
                   </div>
                   {product.power && (
                     <div>
                        <p className="text-[10px] text-slate-500 uppercase">Potência</p>
                        <p className="text-sm text-lime-400 font-bold font-display">{product.power} <span className="text-xs text-lime-400/70">{product.powerUnit || 'W'}</span></p>
                     </div>
                   )}
                </div>

                {/* Footer Price */}
                <div className="p-6 mt-auto flex items-end justify-between">
                   <div>
                     <p className="text-[10px] text-slate-500 uppercase mb-0.5">Preço Unitário</p>
                     <p className="text-xl font-bold font-display text-white">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                   <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                     <Plus size={18} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced Add Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/20 shadow-2xl animate-enter flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white font-display">Adicionar Novo Item</h2>
                <p className="text-slate-400 text-sm mt-1">Preencha as especificações técnicas do material.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* Section 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 pl-4 text-white focus:border-lime-500 outline-none appearance-none"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value as ProductCategory})}
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Marca / Fabricante</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Canadian, Huawei, Siemens..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none placeholder-slate-600"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    />
                 </div>

                 <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Modelo / Nome do Produto</label>
                    <input 
                      type="text" 
                      placeholder="Ex: HiKu6 Mono PERC 550W"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none placeholder-slate-600 font-medium"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                 </div>
              </div>

              <div className="h-px bg-white/5 w-full"></div>

              {/* Section 2: Technical Specs */}
              <div>
                 <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Cpu size={16} className="text-lime-400" /> Especificações & Estoque
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Potência</label>
                       <div className="flex">
                         <input 
                           type="number" 
                           placeholder="0"
                           className="w-full bg-zinc-900 border border-white/10 rounded-l-xl p-3.5 text-white focus:border-lime-500 outline-none"
                           value={formData.power || ''}
                           onChange={(e) => setFormData({...formData, power: Number(e.target.value)})}
                         />
                         <select 
                            className="bg-zinc-800 border border-l-0 border-white/10 rounded-r-xl px-3 text-sm text-slate-300 outline-none focus:border-lime-500"
                            value={formData.powerUnit}
                            onChange={(e) => setFormData({...formData, powerUnit: e.target.value})}
                         >
                            <option value="W">W</option>
                            <option value="kW">kW</option>
                            <option value="A">A</option>
                            <option value="V">V</option>
                            <option value="m">m</option>
                         </select>
                       </div>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço de Custo (R$)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none"
                         value={formData.price || ''}
                         onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                       />
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estoque Atual</label>
                       <input 
                         type="number" 
                         className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none"
                         value={formData.stock || ''}
                         onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                       />
                    </div>
                 </div>
              </div>

              {/* Section 3: Description */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição / Notas (Opcional)</label>
                 <textarea 
                   rows={3}
                   className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none resize-none placeholder-slate-600 text-sm"
                   placeholder="Detalhes adicionais sobre compatibilidade, garantia, etc."
                   value={formData.description || ''}
                   onChange={(e) => setFormData({...formData, description: e.target.value})}
                 />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/10 flex gap-4 bg-zinc-900/50 rounded-b-3xl">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-4 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddProduct}
                className="flex-1 py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold shadow-lg shadow-lime-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={20} /> Salvar Produto
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Products;