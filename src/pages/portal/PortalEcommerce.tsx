import React, { useState } from 'react';
import { ShoppingBag, Star, Zap, Truck, Shield, MessageCircle, X, LogOut, CheckCircle2, Loader2, Gift, Users, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const mockProducts = [
  { id: '1', name: 'Kit Solar 5kWp Premium', category: 'Kits Completos', price: 18900, pointsPrice: 189000, oldPrice: 20500, overload: 15, includesInstall: true, delivery: '15 dias', image: 'bg-gradient-to-br from-blue-900 to-zinc-900', desc: 'Kit completo com 10 módulos 550W Canadian Solar, Inversor Growatt 5kW, estrutura de fixação em alumínio para telhado cerâmico, cabos e conectores. Inclui instalação padrão.' },
  { id: '2', name: 'Kit Solar 8kWp Advanced', category: 'Kits Completos', price: 27500, pointsPrice: 275000, overload: 20, includesInstall: true, delivery: '15 dias', image: 'bg-gradient-to-br from-emerald-900 to-zinc-900', desc: 'Ideal para comércios ou residências grandes. 15 módulos 550W, inversor 8kW.' },
  { id: '3', name: 'Kit Solar 12kWp Pro', category: 'Kits Completos', price: 38900, pointsPrice: 389000, oldPrice: 42000, overload: 25, includesInstall: true, delivery: '20 dias', image: 'bg-gradient-to-br from-purple-900 to-zinc-900', desc: 'Sistema trifásico para alta demanda. 22 módulos 550W, inversor 12kW trifásico.' },
  { id: '4', name: 'Módulo 550W Canadian Solar', category: 'Módulos', price: 890, pointsPrice: 8900, includesInstall: false, delivery: '7 dias', image: 'bg-gradient-to-br from-zinc-800 to-zinc-900', desc: 'Painel monocristalino de alta eficiência.' },
  { id: '5', name: 'Inversor Growatt 5kW', category: 'Inversores', price: 3200, pointsPrice: 32000, includesInstall: false, delivery: '7 dias', image: 'bg-gradient-to-br from-orange-900 to-zinc-900', desc: 'Inversor string de excelente custo-benefício, monitoramento via Wi-Fi.' },
  { id: '6', name: 'Estrutura Telhado Cerâmico (4 mód)', category: 'Estruturas', price: 350, pointsPrice: 3500, includesInstall: false, delivery: '5 dias', image: 'bg-gradient-to-br from-stone-800 to-zinc-900', desc: 'Trilhos em alumínio anodizado e ganchos de fixação em aço inox.' },
];

const PortalEcommerce: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Indicações State
  const [indicateName, setIndicateName] = useState('');
  const [indicatePhone, setIndicatePhone] = useState('');
  const [isIndicating, setIsIndicating] = useState(false);
  const [showIndicateToast, setShowIndicateToast] = useState(false);

  const categories = ['Todos', 'Kits Completos', 'Módulos', 'Inversores', 'Estruturas'];

  const filteredProducts = mockProducts.filter(p => activeCategory === 'Todos' || p.category === activeCategory);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleWhatsApp = (productName: string) => {
    const text = encodeURIComponent(`Olá! Tenho interesse no produto: ${productName}. Poderia me dar mais informações?`);
    window.open(`https://wa.me/5511999999999?text=${text}`, '_blank');
  };

  const handleBuy = () => {
    setIsBuying(true);
    setTimeout(() => {
      setIsBuying(false);
      setSelectedProduct(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1500);
  };

  const handleIndicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicateName || !indicatePhone) return;
    
    setIsIndicating(true);
    setTimeout(() => {
      setIsIndicating(false);
      setIndicateName('');
      setIndicatePhone('');
      setShowIndicateToast(true);
      setTimeout(() => setShowIndicateToast(false), 4000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-10">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/portal/dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30 text-lime-400 font-display font-bold">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">Portal Quark Energia</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <ShoppingBag size={24} />
              </div>
              Loja e Benefícios Quark
            </h1>
            <p className="text-zinc-500 text-sm">Aproveite seus pontos, indique amigos e garanta os melhores equipamentos.</p>
          </div>
        </div>

        {/* Top Banner for Points */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Points Banner */}
          <div className="lg:w-1/3 rounded-2xl border border-lime-500/20 bg-gradient-to-br from-zinc-900 to-lime-900/10 p-6 sm:p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Gift size={100} />
             </div>
             <div className="relative z-10 flex flex-col items-center">
               <div className="w-14 h-14 rounded-full bg-lime-500/20 flex items-center justify-center mb-4 border border-lime-500/30">
                 <Gift className="text-lime-400" size={28} />
               </div>
               <h3 className="text-zinc-400 text-sm font-medium mb-1">Seus Quark Points</h3>
               <div className="text-4xl font-display font-bold text-lime-400 tracking-tight">1.500 <span className="text-lg font-medium text-zinc-500">pts</span></div>
               <p className="text-sm text-zinc-400 mt-3">Troque por descontos ou produtos!</p>
             </div>
          </div>

          {/* Indique um Amigo Section */}
          <div className="lg:w-2/3 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
              <div className="md:w-1/2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-bold mb-4 border border-purple-500/20">
                  <Users size={14} /> Indique e Ganhe
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-3">Traga um amigo e ganhe <span className="text-purple-400">1.000 pontos!</span></h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Conhece alguém interessado em energia solar? Indique para a Quark e, se ele fechar negócio, você ganha 1.000 Quark Points automaticamente para usar na loja!
                </p>
              </div>
              <div className="md:w-1/2 w-full">
                <form onSubmit={handleIndicate} className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder="Nome do amigo" 
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-600" 
                    value={indicateName} 
                    onChange={e => setIndicateName(e.target.value)} 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="WhatsApp do amigo" 
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-600" 
                    value={indicatePhone} 
                    onChange={e => setIndicatePhone(e.target.value)} 
                    required 
                  />
                  <button 
                    type="submit" 
                    disabled={isIndicating} 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
                  >
                    {isIndicating ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Enviar Indicação</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Value Prop Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-8 border border-white/10 p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900 to-lime-900/40 z-0"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime-500/20 text-lime-400 border border-lime-500/30 rounded-full text-xs font-bold mb-4 uppercase tracking-wider">
              <Star size={12} className="fill-lime-400" /> Ofertas Exclusivas
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              Overload + Instalação em até <span className="text-lime-400">60 dias</span>
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mb-6">
              Garanta seu kit solar com instalação completa pela nossa equipe especializada. Qualidade e eficiência para sua economia.
            </p>
            <div className="flex gap-4 text-sm font-medium text-zinc-300">
              <span className="flex items-center gap-2"><Shield size={16} className="text-lime-400"/> Garantia Extendida</span>
              <span className="flex items-center gap-2"><Truck size={16} className="text-lime-400"/> Frete Grátis*</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, idx) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel rounded-2xl overflow-hidden flex flex-col group hover:border-lime-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`h-48 w-full ${product.image} relative flex items-center justify-center p-4`}>
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {product.overload && (
                    <span className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-full uppercase flex items-center gap-1 shadow-lg">
                      <Zap size={10} className="fill-white" /> Overload {product.overload}%
                    </span>
                  )}
                  {product.includesInstall && (
                    <span className="px-2.5 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full uppercase flex items-center gap-1 shadow-lg">
                      <CheckCircle2 size={10} /> Instalação Inclusa
                    </span>
                  )}
                </div>
                {/* Placeholder Image Icon */}
                <div className="w-20 h-20 rounded-2xl bg-black/20 flex items-center justify-center border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                  <ShoppingBag size={32} className="text-white/50" />
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-xs font-medium text-zinc-500 mb-1">{product.category}</span>
                <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{product.name}</h3>
                
                <div className="mt-auto pt-4">
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-2xl font-display font-bold text-lime-400">R$ {product.price.toLocaleString('pt-BR')}</span>
                    {product.oldPrice && (
                      <span className="text-sm text-zinc-500 line-through mb-1">R$ {product.oldPrice.toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm font-bold text-purple-400 mb-4 bg-purple-500/10 border border-purple-500/20 w-fit px-2.5 py-1 rounded-lg">
                    <Gift size={14} /> {product.pointsPrice.toLocaleString('pt-BR')} pts
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="flex-1 btn-primary py-2.5 rounded-xl text-sm shadow-lg shadow-lime-500/10 active:scale-95 text-center"
                    >
                      Detalhes
                    </button>
                    <button 
                      onClick={() => handleWhatsApp(product.name)}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5 rounded-xl transition-colors active:scale-95"
                      title="Tirar Dúvidas"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
              
              <div className={`md:w-2/5 h-48 md:h-auto ${selectedProduct.image} p-6 flex flex-col items-center justify-center relative`}>
                 <div className="w-24 h-24 rounded-2xl bg-black/20 flex items-center justify-center border border-white/10 backdrop-blur-sm mb-4">
                   <ShoppingBag size={40} className="text-white/50" />
                 </div>
                 {selectedProduct.includesInstall && (
                    <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 mt-4 text-center">
                      <CheckCircle2 size={14} /> Inclui Instalação Completa
                    </div>
                 )}
              </div>

              <div className="p-6 md:w-3/5 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{selectedProduct.category}</span>
                  <button onClick={() => setSelectedProduct(null)} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4 pr-6">{selectedProduct.name}</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{selectedProduct.desc}</p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                    <Truck size={16} className="text-zinc-500" /> Tempo estimado de entrega: <strong className="text-white">{selectedProduct.delivery}</strong>
                  </div>
                  {selectedProduct.overload && (
                    <div className="flex items-center gap-3 text-sm text-zinc-300 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                      <Zap size={16} className="text-orange-400" /> Permite Overload de até <strong className="text-orange-400">{selectedProduct.overload}%</strong>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                    <Shield size={16} className="text-zinc-500" /> Garantia de fábrica nos equipamentos
                  </div>
                </div>

                <div className="mt-auto border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="block text-xs font-medium text-zinc-500 mb-1">Valor ou Pontos</span>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-display font-bold text-lime-400">R$ {selectedProduct.price.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-purple-400 mt-1">
                      <Gift size={12} /> ou {selectedProduct.pointsPrice.toLocaleString('pt-BR')} pts
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                      onClick={() => handleWhatsApp(selectedProduct.name)}
                      className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5 rounded-xl transition-colors active:scale-95"
                      title="Tirar Dúvidas"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button 
                      onClick={handleBuy}
                      disabled={isBuying}
                      className="flex-1 sm:flex-none btn-primary px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20 disabled:opacity-50"
                    >
                      {isBuying ? <Loader2 className="animate-spin" size={18} /> : 'Comprar Agora'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Buy Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-lime-500 text-black px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 z-[110]"
          >
            <CheckCircle2 size={20} />
            Pedido Confirmado!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indication Toast */}
      <AnimatePresence>
        {showIndicateToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-purple-600 text-white px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 z-[110]"
          >
            <CheckCircle2 size={20} />
            Indicação enviada! Se ele fechar, você ganha 1000 pontos!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortalEcommerce;
