import React, { useState } from 'react';
import { 
  ShoppingBag, Zap, Truck, Shield, MessageCircle, X, LogOut, CheckCircle2, 
  Loader2, Gift, Users, Send, Copy, Check, Droplets, Tag, ShieldCheck, 
  Wrench, ArrowUpRight, ArrowDownLeft, Clock, AlertTriangle, Sparkles, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';
import { 
  useQuarkPoints, 
  useQuarkRewards, 
  useReferFriend, 
  useRedeemPoints, 
  QuarkReward, 
  ClientReferral 
} from '../../hooks/useQuarkPoints';

const mockProducts = [
  { id: '1', name: 'Kit Solar 5kWp Premium', category: 'Kits Completos', price: 18900, pointsPrice: 189000, oldPrice: 20500, overload: 15, includesInstall: true, delivery: '15 dias', image: 'bg-gradient-to-br from-blue-900 to-zinc-900', desc: 'Kit completo com 10 módulos 550W Canadian Solar, Inversor Growatt 5kW, estrutura de fixação em alumínio para telhado cerâmico, cabos e conectores. Inclui instalação padrão.' },
  { id: '2', name: 'Kit Solar 8kWp Advanced', category: 'Kits Completos', price: 27500, pointsPrice: 275000, overload: 20, includesInstall: true, delivery: '15 dias', image: 'bg-gradient-to-br from-emerald-900 to-zinc-900', desc: 'Ideal para comércios ou residências grandes. 15 módulos 550W, inversor 8kW.' },
  { id: '3', name: 'Kit Solar 12kWp Pro', category: 'Kits Completos', price: 38900, pointsPrice: 389000, oldPrice: 42000, overload: 25, includesInstall: true, delivery: '20 dias', image: 'bg-gradient-to-br from-purple-900 to-zinc-900', desc: 'Sistema trifásico para alta demanda. 22 módulos 550W, inversor 12kW trifásico.' },
  { id: '4', name: 'Módulo 550W Canadian Solar', category: 'Módulos', price: 890, pointsPrice: 8900, includesInstall: false, delivery: '7 dias', image: 'bg-gradient-to-br from-zinc-800 to-zinc-900', desc: 'Painel monocristalino de alta eficiência.' },
  { id: '5', name: 'Inversor Growatt 5kW', category: 'Inversores', price: 3200, pointsPrice: 32000, includesInstall: false, delivery: '7 dias', image: 'bg-gradient-to-br from-orange-900 to-zinc-900', desc: 'Inversor string de excelente custo-benefício, monitoramento via Wi-Fi.' },
  { id: '6', name: 'Estrutura Telhado Cerâmico (4 mód)', category: 'Estruturas', price: 350, pointsPrice: 3500, includesInstall: false, delivery: '5 dias', image: 'bg-gradient-to-br from-stone-800 to-zinc-900', desc: 'Trilhos em alumínio anodizado e ganchos de fixação em aço inox.' },
];

const rewardIconMap: Record<string, React.ElementType> = {
  Droplets,
  Tag,
  ShieldCheck,
  Wrench,
  Gift,
};

const PortalEcommerce: React.FC = () => {
  const navigate = useNavigate();
  const { client, logout } = usePortal();
  const clientId = client?.id;

  // React Query Hooks
  const { data: pointsData, isLoading: loadingPoints } = useQuarkPoints(clientId);
  const { data: rewards = [], isLoading: loadingRewards } = useQuarkRewards();
  const referMutation = useReferFriend(clientId);
  const redeemMutation = useRedeemPoints(clientId);

  const balance = pointsData?.balance ?? 0;
  const referralCode = pointsData?.referral_code || (clientId ? `QUARK-${String(clientId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}` : 'QUARK-SOLAR');
  const referrals = pointsData?.referrals ?? [];
  const transactions = pointsData?.transactions ?? [];

  // Tab State: 'rewards' | 'referrals' | 'products' | 'extract'
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'products' | 'extract'>('rewards');

  // Copy Referral Code Feedback
  const [copied, setCopied] = useState(false);

  // Referral Form State
  const [referName, setReferName] = useState('');
  const [referPhone, setReferPhone] = useState('');
  const [referCity, setReferCity] = useState('');
  const [referNotes, setReferNotes] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Redemption Modal State
  const [selectedReward, setSelectedReward] = useState<QuarkReward | null>(null);
  const [redemptionNotes, setRedemptionNotes] = useState('');

  // Product Selection Modal
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');

  const categories = ['Todos', 'Kits Completos', 'Módulos', 'Inversores', 'Estruturas'];
  const filteredProducts = mockProducts.filter(p => activeCategory === 'Todos' || p.category === activeCategory);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const handleSendReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referName.trim() || !referPhone.trim()) return;

    try {
      await referMutation.mutateAsync({
        referred_name: referName.trim(),
        referred_phone: referPhone.trim(),
        referred_city: referCity.trim() || undefined,
        notes: referNotes.trim() || undefined,
      });

      setReferName('');
      setReferPhone('');
      setReferCity('');
      setReferNotes('');
      setToastMessage('🎉 Indicação enviada com sucesso! Você ganhará 1.000 pontos assim que o contrato for assinado.');
      setTimeout(() => setToastMessage(null), 5000);
      setActiveTab('referrals');
    } catch (err: any) {
      setToastMessage(`❌ Erro ao enviar indicação: ${err.message || 'Tente novamente.'}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmRedemption = async () => {
    if (!selectedReward) return;

    if (balance < selectedReward.points) {
      setToastMessage(`❌ Saldo insuficiente! Você possui ${balance} pts e este benefício custa ${selectedReward.points} pts.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    try {
      await redeemMutation.mutateAsync({
        reward_id: selectedReward.id,
        reward_title: selectedReward.title,
        points_spent: selectedReward.points,
        notes: redemptionNotes.trim() || undefined,
      });

      const redeemedTitle = selectedReward.title;
      setSelectedReward(null);
      setRedemptionNotes('');
      setToastMessage(`✨ Benefício "${redeemedTitle}" resgatado com sucesso! Entraremos em contato para agendar o serviço.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setToastMessage(`❌ Erro no resgate: ${err.message || 'Verifique seu saldo e tente novamente.'}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const getReferralStatusBadge = (status: ClientReferral['status']) => {
    switch (status) {
      case 'instalado':
      case 'contrato_assinado':
        return {
          label: status === 'instalado' ? 'Instalado & Pontuado' : 'Contrato Assinado',
          className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        };
      case 'em_contato':
      case 'proposta_enviada':
        return {
          label: status === 'proposta_enviada' ? 'Proposta Enviada' : 'Em Negociação',
          className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        };
      case 'rejeitado':
        return {
          label: 'Não Concretizado',
          className: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
        };
      case 'indicado':
      case 'pendente':
      default:
        return {
          label: 'Pendente',
          className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        };
    }
  };

  const handleWhatsAppProduct = (productName: string) => {
    const text = encodeURIComponent(`Olá equipe Quark! Tenho interesse no item do catálogo: ${productName}. Poderiam me atender?`);
    window.open(`https://wa.me/5582999999999?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-zinc-200 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#0c1222]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => navigate('/portal/dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/40 text-lime-400 font-display font-bold group-hover:scale-105 transition-transform">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">
              Portal Quark Energia
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/portal/dashboard')}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Voltar ao Dashboard
            </button>
            <button 
              onClick={handleLogout} 
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Sair do Portal"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Title & Introduction */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-full text-xs font-semibold mb-3">
              <Sparkles size={14} /> Fidelidade Solar & Benefícios Exclusivos
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              Quark Points & Recompensas
            </h1>
            <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
              Indique novos clientes, acumule Quark Points e troque por serviços de manutenção gratuita, inspeções termográficas e brindes oficiais.
            </p>
          </div>
        </div>

        {/* Top Points & Referral Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Card 1: Saldo de Pontos */}
          <div className="lg:col-span-4 rounded-2xl border border-lime-500/30 bg-gradient-to-br from-zinc-950 via-[#0f172a] to-lime-950/20 p-6 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-lime-950/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Award size={140} className="text-lime-400" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-lime-400/90 flex items-center gap-1.5">
                  <Gift size={16} /> Saldo Disponível
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/20 font-medium">
                  Ativo
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
                  {loadingPoints ? (
                    <span className="animate-pulse text-zinc-600">---</span>
                  ) : (
                    balance.toLocaleString('pt-BR')
                  )}
                </span>
                <span className="text-lg font-bold text-lime-400">pts</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cada indicação convertida em usina gera <strong className="text-white">+1.000 pontos</strong> para sua conta.
              </p>
            </div>

            {/* Código de Indicação com Cópia Rápida */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <span className="text-[11px] text-zinc-400 font-medium block mb-2">
                Seu código de indicação pessoal:
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 font-mono text-sm text-lime-400 font-bold tracking-wider select-all truncate">
                  {referralCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-xl bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                  title="Copiar código"
                >
                  {copied ? <Check size={14} className="text-lime-400" /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Formulário Indique e Ganhe */}
          <div className="lg:col-span-8 bg-[#0c1222]/80 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-purple-950/20 flex flex-col justify-between">
            <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-bold mb-3 border border-purple-500/20">
                <Users size={14} /> Indique um Amigo
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
                Ganhe <span className="text-purple-400">1.000 Quark Points</span> por indicação
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                Indique amigos, parentes ou empresas para instalar energia solar. Nossa equipe entra em contato com consultoria personalizada e você pontua.
              </p>
            </div>

            <form onSubmit={handleSendReferral} className="relative z-10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Nome do indicado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={referName}
                    onChange={(e) => setReferName(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    WhatsApp do indicado *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(82) 99999-0000"
                    value={referPhone}
                    onChange={(e) => setReferPhone(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Cidade / Região (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maceió - AL"
                    value={referCity}
                    onChange={(e) => setReferCity(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Casa própria, conta de R$ 800"
                    value={referNotes}
                    onChange={(e) => setReferNotes(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={referMutation.isPending}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 active:scale-98"
              >
                {referMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Registrando Indicação...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Enviar Indicação e Garantir Pontos
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6 border-b border-white/5 pb-4 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'rewards'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gift size={16} /> Resgate de Benefícios
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'referrals'
                ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} />
            Minhas Indicações
            {referrals.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-500 text-black">
                {referrals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'products'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag size={16} /> Catálogo de Equipamentos
          </button>

          <button
            onClick={() => setActiveTab('extract')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'extract'
                ? 'bg-zinc-800 text-zinc-200 border border-white/10 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock size={16} /> Extrato de Pontos
          </button>
        </div>

        {/* TAB 1: CATÁLOGO DE BENEFÍCIOS / RECOMPENSAS */}
        {activeTab === 'rewards' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="text-purple-400" size={20} /> Recompensas Disponíveis
                </h2>
                <p className="text-xs text-zinc-400">
                  Troque seus Quark Points por serviços de valor real para sua usina fotovoltaica.
                </p>
              </div>

              <div className="text-xs text-zinc-400 bg-zinc-900 border border-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span>Saldo atual:</span>
                <strong className="text-lime-400 font-mono">{balance.toLocaleString('pt-BR')} pts</strong>
              </div>
            </div>

            {loadingRewards ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-60 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => {
                  const IconComponent = rewardIconMap[reward.icon] || Gift;
                  const canRedeem = balance >= reward.points;
                  const diff = reward.points - balance;

                  return (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <IconComponent size={24} />
                          </div>
                          {reward.value_brl && (
                            <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-white/5">
                              Valor aprox: R$ {reward.value_brl}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                          {reward.title}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                          {reward.desc}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Custo em pontos</span>
                          <span className="text-lg font-display font-extrabold text-purple-400">
                            {reward.points.toLocaleString('pt-BR')} <span className="text-xs font-normal">pts</span>
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedReward(reward)}
                          disabled={!canRedeem}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                            canRedeem
                              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 active:scale-95'
                              : 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-white/5'
                          }`}
                        >
                          {canRedeem ? (
                            <>
                              <Award size={15} /> Resgatar Benefício
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} /> Faltam {diff.toLocaleString('pt-BR')} pts
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: MINHAS INDICAÇÕES */}
        {activeTab === 'referrals' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="text-lime-400" size={20} /> Acompanhamento de Indicações
                </h2>
                <p className="text-xs text-zinc-400">
                  Veja o status em tempo real de cada amigo ou contato indicado.
                </p>
              </div>
            </div>

            {referrals.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center border border-dashed border-white/10">
                <div className="w-16 h-16 rounded-full bg-lime-500/10 text-lime-400 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Você ainda não indicou amigos</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
                  Preencha o formulário acima com o nome e WhatsApp de quem tem interesse em reduzir a conta de luz.
                </p>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="p-4">Amigo Indicado</th>
                        <th className="p-4">Telefone</th>
                        <th className="p-4">Cidade</th>
                        <th className="p-4">Status no CRM</th>
                        <th className="p-4">Recompensa</th>
                        <th className="p-4">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {referrals.map((ref) => {
                        const badge = getReferralStatusBadge(ref.status);
                        return (
                          <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-semibold text-white">
                              {ref.referred_name}
                            </td>
                            <td className="p-4 text-zinc-400 font-mono text-xs">
                              {ref.referred_phone}
                            </td>
                            <td className="p-4 text-zinc-400 text-xs">
                              {ref.referred_city || '—'}
                            </td>
                            <td className="p-4">
                              <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold inline-block ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-lime-400 font-mono text-xs">
                              +{ref.reward_points || 1000} pts
                            </td>
                            <td className="p-4 text-zinc-500 text-xs">
                              {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: CATÁLOGO DE PRODUTOS & EQUIPAMENTOS */}
        {activeTab === 'products' && (
          <section className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="glass-panel rounded-2xl overflow-hidden flex flex-col group hover:border-lime-500/40 transition-all duration-300"
                >
                  <div className={`h-44 w-full ${product.image} relative flex items-center justify-center p-4`}>
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {product.overload && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full uppercase flex items-center gap-1 shadow-md">
                          <Zap size={10} className="fill-white" /> Overload {product.overload}%
                        </span>
                      )}
                      {product.includesInstall && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full uppercase flex items-center gap-1 shadow-md">
                          <CheckCircle2 size={10} /> Instalação Inclusa
                        </span>
                      )}
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-black/30 flex items-center justify-center border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <ShoppingBag size={28} className="text-white/60" />
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-zinc-500 block mb-1">
                        {product.category}
                      </span>
                      <h3 className="font-bold text-white text-base mb-2 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                        {product.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-display font-bold text-lime-400">
                          R$ {product.price.toLocaleString('pt-BR')}
                        </span>
                        {product.oldPrice && (
                          <span className="text-xs text-zinc-500 line-through">
                            R$ {product.oldPrice.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all"
                        >
                          Ver Especificações
                        </button>
                        <button
                          onClick={() => handleWhatsAppProduct(product.name)}
                          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: EXTRATO DE PONTOS */}
        {activeTab === 'extract' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="text-zinc-400" size={20} /> Histórico de Movimentações
              </h2>
              <p className="text-xs text-zinc-400">
                Créditos obtidos por indicações e débitos de resgates efetuados.
              </p>
            </div>

            {transactions.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center border border-white/10">
                <p className="text-sm text-zinc-400">Nenhuma movimentação registrada até o momento.</p>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
                <div className="divide-y divide-white/5">
                  {transactions.map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          t.type === 'credito' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-purple-500/15 text-purple-400'
                        }`}>
                          {t.type === 'credito' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{t.description}</p>
                          <p className="text-[11px] text-zinc-500">
                            {new Date(t.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className={`font-mono font-bold text-sm ${
                        t.type === 'credito' ? 'text-emerald-400' : 'text-purple-400'
                      }`}>
                        {t.type === 'credito' ? `+${t.points}` : `-${t.points}`} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL DE RESGATE DE BENEFÍCIO */}
      <AnimatePresence>
        {selectedReward && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setSelectedReward(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-[#0c1222] border border-purple-500/30 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
                  <Gift size={24} />
                </div>
                <button
                  onClick={() => setSelectedReward(null)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                Resgatar Benefício
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Você está prestes a resgatar <strong className="text-white">{selectedReward.title}</strong> por{' '}
                <strong className="text-purple-400">{selectedReward.points} Quark Points</strong>.
              </p>

              <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3 mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Saldo atual:</span>
                  <span className="text-white font-mono font-bold">{balance} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Custo do benefício:</span>
                  <span className="text-purple-400 font-mono font-bold">-{selectedReward.points} pts</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5 font-semibold">
                  <span className="text-zinc-300">Saldo restante:</span>
                  <span className="text-lime-400 font-mono font-bold">{balance - selectedReward.points} pts</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Observações ou preferência de data (opcional)
                </label>
                <textarea
                  rows={2}
                  value={redemptionNotes}
                  onChange={(e) => setRedemptionNotes(e.target.value)}
                  placeholder="Ex: Preferência para atendimento pela manhã ou final de semana..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-purple-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedReward(null)}
                  disabled={redeemMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRedemption}
                  disabled={redeemMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50"
                >
                  {redeemMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Confirmar Resgate'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETALHES DO PRODUTO */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0c1222] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-lime-400 uppercase tracking-wider">
                  {selectedProduct.category}
                </span>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{selectedProduct.name}</h3>
              <p className="text-xs text-zinc-300 leading-relaxed mb-6">{selectedProduct.desc}</p>

              <div className="space-y-2.5 mb-6 text-xs text-zinc-300">
                <div className="flex items-center gap-2 p-2.5 bg-zinc-950/60 rounded-xl border border-white/5">
                  <Truck size={15} className="text-zinc-400" /> Entrega estimada em {selectedProduct.delivery}
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-zinc-950/60 rounded-xl border border-white/5">
                  <Shield size={15} className="text-lime-400" /> Garantia técnica direta de fábrica
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <span className="text-[11px] text-zinc-500 block">Preço</span>
                  <span className="text-xl font-display font-bold text-lime-400">
                    R$ {selectedProduct.price.toLocaleString('pt-BR')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleWhatsAppProduct(selectedProduct.name);
                    setSelectedProduct(null);
                  }}
                  className="btn-primary py-2.5 px-4 rounded-xl text-xs flex items-center gap-2"
                >
                  <MessageCircle size={15} /> Solicitar Proposta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICAÇÃO */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 right-6 max-w-md bg-zinc-900 border border-lime-500/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-3 z-[110]"
          >
            <Sparkles size={18} className="text-lime-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortalEcommerce;
