import React, { useState, useEffect } from 'react';
import { ProposalEditor, ProposalData } from '../components/ProposalEditor';
import { FileText, Plus, ChevronRight, Calculator, CheckCircle, LayoutGrid, List, Search, Trash2, Copy, Edit3, TrendingUp, Calendar, Zap, Phone } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DISTRIBUTORS, DEFAULT_DISTRIBUTOR, getEffectiveFiob, Distributor } from '../components/proposal/distributors';
import { calcRecommendedPower, calcConsumptionFromBill } from '../components/proposal/solarCalc';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

const STATUS_CONFIG = {
  draft:    { label: 'Rascunho',  color: 'bg-zinc-700/60 text-zinc-300' },
  sent:     { label: 'Enviada',   color: 'bg-blue-500/20 text-blue-400' },
  approved: { label: 'Aprovada', color: 'bg-lime-500/20 text-lime-400' },
  rejected: { label: 'Recusada', color: 'bg-red-500/20 text-red-400'   },
} as const;

// Gera cor de avatar determinística a partir do nome
function hashColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}


const Proposals: React.FC = () => {
  const { addLead } = useApp();
  const [proposals, setProposals] = useState<ProposalData[]>(() => {
    const saved = localStorage.getItem('quark_proposals');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // Modo de entrada: 'kwh' ou 'bill' (valor em R$)
  const [inputMode, setInputMode] = useState<'kwh' | 'bill'>('kwh');
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor>(DEFAULT_DISTRIBUTOR);
  const [formData, setFormData] = useState<Partial<ProposalData>>({
    clientName: '',
    city: '',
    phone: '',
    consumption: 0,
    billValue: 0,
    moduleBrand: 'Jinko Solar',
    modulePower: 550,
    modulesCount: 0,
    inverterBrand: 'Growatt',
    inverterPower: 0,
    inverterCount: 1,
    pricePerModule: 0,
    priceKit: 0,
    priceCA: 0,
    taxPercentage: 15,
    profitPercentage: 20,
    additionalCosts: 0,
    finalPrice: 0,
    systemSizeKw: 0,
    // Campos solares
    tariffRate: DEFAULT_DISTRIBUTOR.tariffB1,
    fiobRate: getEffectiveFiob(DEFAULT_DISTRIBUTOR.fiobTotal),
    concessionaria: DEFAULT_DISTRIBUTOR.id,
    connectionType: 'mono',
    publicLighting: 30,
    generationFactor: 130,
  });


  useEffect(() => {
    localStorage.setItem('quark_proposals', JSON.stringify(proposals));
  }, [proposals]);

  const handleNextStep1 = () => {
    if (!formData.clientName || !formData.city) {
      alert('Preencha nome e cidade.');
      return;
    }
    // Calcular consumo a partir do valor da conta se necessário
    let consumoKwh = formData.consumption || 0;
    if (inputMode === 'bill' && formData.billValue && formData.tariffRate) {
      consumoKwh = calcConsumptionFromBill(
        formData.billValue,
        formData.tariffRate,
        formData.publicLighting || 0,
        formData.connectionType || 'mono'
      );
    }
    if (!consumoKwh) { alert('Informe o consumo ou valor da conta.'); return; }
    // kWp sugerido: consumo / fator de geração
    const kwpSugerido = calcRecommendedPower(consumoKwh, formData.generationFactor || 130, 1.0);
    setFormData(prev => ({ ...prev, consumption: consumoKwh, systemSizeKw: kwpSugerido }));
    setStep(2);
  };

  const handleNextStep2 = () => {
    // kWp real = (nº módulos × Wp do módulo) / 1000
    const kwpReal = ((formData.modulesCount || 0) * (formData.modulePower || 0)) / 1000;
    setFormData(prev => ({ ...prev, systemSizeKw: parseFloat(kwpReal.toFixed(2)) }));
    setStep(3);
  };

  const handleCalculatePrice = () => {
    const kwp = formData.systemSizeKw || 0;
    const modulesCount = formData.modulesCount || 0;

    // Custo módulos
    const custoModulos = modulesCount * (formData.pricePerModule || 0);
    // Custo kit (inversores + estrutura) — inserido diretamente
    const custoKit = formData.priceKit || 0;
    // Custo CA — inserido como R$/kWp
    const custoCA = kwp * (formData.priceCA || 0);

    const custoBruto = custoModulos + custoKit + custoCA + (formData.additionalCosts || 0);

    // Markup reverso: preço = custo / (1 - imposto% - lucro%)
    const taxFactor = (formData.taxPercentage || 0) / 100;
    const profitFactor = (formData.profitPercentage || 0) / 100;
    const discount = taxFactor + profitFactor;
    const safeFactor = Math.min(discount, 0.94); // máx 94% para evitar divisão por zero

    const finalCalculated = custoBruto / (1 - safeFactor);

    setFormData(prev => ({
      ...prev,
      finalPrice: parseFloat(finalCalculated.toFixed(2)),
    }));
    setStep(4);
  };

  const handleSavePreview = (payload: ProposalData) => {
    if (payload.id) {
      setProposals(prev => prev.map(p => p.id === payload.id ? { ...payload, updatedAt: new Date().toISOString() } : p));
    } else {
      const newProposal = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft' as const,
      };
      setProposals(prev => [...prev, newProposal]);
      
      // Atualiza o formData com a nova proposta para que o próximo salvamento atualize esta
      setFormData(newProposal);

      addLead({
        name: newProposal.clientName,
        city: newProposal.city,
        value: newProposal.finalPrice,
        monthlyConsumption: newProposal.consumption,
        phone: newProposal.phone || '',
        status: 'Proposta'
      });
    }
  };

  const handleEditProposal = (proposal: ProposalData) => {
    setFormData(proposal);
    setStep(4); // Abre direto no editor WYSIWYG
  };

  const handleDeleteProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
    setDeleteConfirmId(null);
  };

  const handleDuplicateProposal = (proposal: ProposalData) => {
    const copy: ProposalData = {
      ...proposal,
      id: crypto.randomUUID(),
      clientName: `${proposal.clientName} (cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };
    setProposals(prev => [copy, ...prev]);
  };

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const totalValue = proposals.reduce((s, p) => s + (p.finalPrice || 0), 0);
  const monthCount = proposals.filter(p => {
    if (!p.createdAt) return false;
    const d = new Date(p.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const filteredProposals = proposals.filter(p =>
    (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).reverse();

  return (
    <div className="space-y-8 h-full flex flex-col animate-enter p-2 md:p-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-display font-light text-white tracking-tight">Propostas <span className="font-bold text-amber-500">Comerciais</span></h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-md leading-relaxed">Gerencie suas propostas de alto valor agregado com design editorial.</p>
        </div>
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-all shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            Nova Proposta
          </button>
        )}
      </div>

      {step === 0 && (
        <div className="flex-1 min-h-0 flex flex-col gap-6">

          {/* ── Stats Bento Bar ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            {[
              { icon: <FileText size={18}/>, label: 'Total de Propostas', value: proposals.length, color: 'text-white' },
              { icon: <TrendingUp size={18}/>, label: 'Valor Total Fechado', value: formatCurrency(totalValue), color: 'text-amber-500' },
              { icon: <Calendar size={18}/>, label: 'Propostas este Mês', value: monthCount, color: 'text-white' },
            ].map((stat, i) => (
              <div key={i} className="relative overflow-hidden rounded-3xl p-6 border border-white/5 bg-zinc-900/40 backdrop-blur-2xl flex items-center gap-4 transition-all hover:bg-white/[0.03]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white/50 border border-white/10" style={{background:'rgba(255,255,255,0.03)'}}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">{stat.label}</p>
                  <p className={`text-2xl font-display font-light ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-4 shrink-0 bg-zinc-900/40 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar propostas por cliente ou cidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30 text-sm transition-all placeholder:text-zinc-600"
              />
            </div>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <div className="flex gap-1 pr-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                title="Visualização em grid"
              >
                <LayoutGrid size={18}/>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                title="Visualização em lista"
              >
                <List size={18}/>
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {filteredProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-amber-400 mb-6"
                  style={{background:'rgba(196,160,80,0.08)', border:'1px solid rgba(196,160,80,0.15)'}}>
                  <Zap size={32}/>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhuma proposta</h3>
                <p className="text-zinc-500 max-w-sm mb-6">Crie sua primeira proposta e comece a fechar negócios.</p>
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-all text-sm">
                  <Plus size={16}/> Criar Proposta
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid View ── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {filteredProposals.map((p, idx) => {
                  const avatarColor = hashColor(p.clientName || 'Q');
                  const st = STATUS_CONFIG[(p.status || 'draft') as keyof typeof STATUS_CONFIG];
                  return (
                    <div
                      key={p.id || idx}
                      className="group relative rounded-2xl border border-white/8 flex flex-col overflow-hidden transition-all duration-200 hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(196,160,80,0.08)] cursor-pointer active:scale-[0.99]"
                      style={{background:'linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(0,0,0,0.2) 100%)'}}
                      onClick={() => handleEditProposal(p)}
                    >
                      {/* Header colorido */}
                      <div className="h-1.5 w-full" style={{background:`linear-gradient(90deg,${avatarColor},transparent)`}}/>
                      <div className="p-5 flex flex-col gap-4">
                        {/* Top row */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                              style={{background:avatarColor}}>
                              {(p.clientName || 'Q').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm leading-tight group-hover:text-amber-300 transition-colors line-clamp-1">{p.clientName}</h4>
                              <p className="text-[11px] text-zinc-500 mt-0.5">{p.city}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'kWp', value: (p.systemSizeKw || 0).toFixed(1) },
                            { label: 'Módulos', value: p.modulesCount || 0 },
                            { label: 'Data', value: formatDate(p.createdAt) },
                          ].map((s, i) => (
                            <div key={i} className="rounded-lg p-2 text-center" style={{background:'rgba(255,255,255,0.03)'}}>
                              <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">{s.label}</p>
                              <p className="text-[12px] font-bold text-zinc-300 mt-0.5">{s.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Value */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <span className="text-[11px] text-zinc-600 font-semibold">Valor Final</span>
                          <span className="text-base font-display font-bold" style={{color:'#C4A050'}}>{formatCurrency(p.finalPrice)}</span>
                        </div>
                      </div>

                      {/* Ações hover */}
                      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        style={{background:'linear-gradient(0deg,rgba(9,9,11,0.95) 0%,transparent 100%)'}}>
                        <button
                          onClick={e => { e.stopPropagation(); handleEditProposal(p); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold text-white transition-all hover:bg-white/10"
                          title="Editar">
                          <Edit3 size={13}/> Editar
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDuplicateProposal(p); }}
                          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-all"
                          title="Duplicar">
                          <Copy size={13}/>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirmId(p.id || null); }}
                          className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Excluir">
                          <Trash2 size={13}/>
                        </button>
                      </div>

                      {/* Confirmação de exclusão */}
                      {deleteConfirmId === p.id && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl z-10 p-4"
                          style={{background:'rgba(9,9,11,0.95)', backdropFilter:'blur(8px)'}}
                          onClick={e => e.stopPropagation()}>
                          <Trash2 size={24} className="text-red-400"/>
                          <p className="text-sm font-bold text-white text-center">Excluir esta proposta?</p>
                          <p className="text-xs text-zinc-500 text-center">Esta ação não pode ser desfeita.</p>
                          <div className="flex gap-2 w-full">
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 py-2 rounded-lg border border-white/10 text-zinc-400 text-xs font-bold hover:text-white transition-all">
                              Cancelar
                            </button>
                            <button onClick={() => handleDeleteProposal(p.id!)}
                              className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all">
                              Excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── List View ── */
              <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Cliente','Cidade','Sistema','Valor','Status','Data',''].map((h,i) => (
                        <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((p, idx) => {
                      const avatarColor = hashColor(p.clientName || 'Q');
                      const st = STATUS_CONFIG[(p.status || 'draft') as keyof typeof STATUS_CONFIG];
                      return (
                        <tr key={p.id || idx}
                          onClick={() => handleEditProposal(p)}
                          className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{background:avatarColor}}>
                                {(p.clientName||'Q').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white group-hover:text-amber-300 transition-colors text-sm">{p.clientName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-400 text-sm">{p.city}</td>
                          <td className="px-4 py-3 text-zinc-300 font-bold text-sm">{(p.systemSizeKw||0).toFixed(2)} kWp</td>
                          <td className="px-4 py-3 font-display font-bold text-sm" style={{color:'#C4A050'}}>{formatCurrency(p.finalPrice)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 text-xs">{formatDate(p.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={e=>{e.stopPropagation();handleDuplicateProposal(p);}} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-all"><Copy size={13}/></button>
                              <button onClick={e=>{e.stopPropagation();setDeleteConfirmId(deleteConfirmId===p.id?null:p.id||null);}} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* WIZARD DA PROPOSTA */}
      {(step === 1 || step === 2 || step === 3) && (
          <div className="max-w-2xl mx-auto w-full mt-10">
              <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden animate-enter">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 blur-[80px] rounded-full"></div>
                  
                  {/* Etapas Visuais */}
                  <div className="flex justify-between items-center mb-10 relative z-10">
                      {[1, 2, 3].map(i => (
                          <div key={i} className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step === i ? 'bg-lime-500 text-black shadow-[0_0_15px_rgba(163,230,53,0.5)]' : step > i ? 'bg-zinc-800 text-lime-500 border border-lime-500/30' : 'bg-black text-zinc-600 border border-zinc-800'}`}>
                                  {step > i ? <CheckCircle size={14} /> : i}
                              </div>
                          </div>
                      ))}
                      <div className="absolute top-4 left-4 right-4 h-px bg-zinc-800 -z-10"></div>
                  </div>

                  {step === 1 && (
                      <div className="space-y-4 relative z-10 animate-enter">
                          <h3 className="text-2xl font-bold text-white mb-1">Dados do Cliente</h3>
                          <p className="text-zinc-500 text-sm mb-2">Preencha os dados e o consumo de energia.</p>

                          {/* Nome e Telefone */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 md:col-span-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Nome / Empresa</label>
                              <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" placeholder="Ex: Mercado CompreBem" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Telefone</label>
                              <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" placeholder="(82) 99999-0000" />
                            </div>
                          </div>

                          {/* Cidade e Concessionária */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Cidade - UF</label>
                              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" placeholder="Maceió - AL" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Concessionária</label>
                              <select value={selectedDistributor.id}
                                onChange={e => {
                                  const d = DISTRIBUTORS.find(d => d.id === e.target.value) || DEFAULT_DISTRIBUTOR;
                                  setSelectedDistributor(d);
                                  setFormData(prev => ({ ...prev, concessionaria: d.id, tariffRate: d.tariffB1, fiobRate: getEffectiveFiob(d.fiobTotal) }));
                                }}
                                className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none text-sm">
                                {DISTRIBUTORS.map(d => <option key={d.id} value={d.id}>{d.shortName} ({d.uf})</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Tipo de Ligação */}
                          <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Tipo de Ligação</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['mono','bi','tri'] as const).map((t, i) => {
                                const labels = ['Monofásico\n30 kWh', 'Bifásico\n50 kWh', 'Trifásico\n100 kWh'];
                                const isActive = formData.connectionType === t;
                                return (
                                  <button key={t} onClick={() => setFormData({...formData, connectionType: t})}
                                    className={`py-2.5 px-2 rounded-xl border text-center transition-all text-xs font-bold whitespace-pre-line leading-tight ${isActive ? 'border-lime-500 bg-lime-500/10 text-lime-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                                    {labels[i]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Toggle kWh / R$ */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-zinc-500 uppercase">Consumo</label>
                              <div className="flex rounded-lg border border-zinc-800 p-0.5 gap-0.5">
                                <button onClick={() => setInputMode('kwh')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${inputMode==='kwh' ? 'bg-lime-500 text-black' : 'text-zinc-500'}`}>kWh</button>
                                <button onClick={() => setInputMode('bill')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${inputMode==='bill' ? 'bg-lime-500 text-black' : 'text-zinc-500'}`}>R$ Conta</button>
                              </div>
                            </div>
                            {inputMode === 'kwh' ? (
                              <div className="relative">
                                <input type="number" value={formData.consumption || ''} onChange={e => setFormData({...formData, consumption: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 pl-12 text-white font-display focus:border-lime-500 outline-none text-xl" placeholder="0" />
                                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-lime-500/50" size={20} />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">kWh/mês</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <input type="number" value={formData.billValue || ''} onChange={e => setFormData({...formData, billValue: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 pl-12 text-white font-display focus:border-lime-500 outline-none text-xl" placeholder="0,00" />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lime-500/50 font-bold text-lg">R$</span>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">/mês</span>
                              </div>
                            )}
                          </div>

                          {/* CIP e Parâmetros */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">CIP/COSIP (R$)</label>
                              <input type="number" value={formData.publicLighting || ''} onChange={e => setFormData({...formData, publicLighting: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" placeholder="30" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Tarifa R$/kWh</label>
                              <input type="number" step="0.001" value={formData.tariffRate || ''} onChange={e => setFormData({...formData, tariffRate: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1.5">Fio B R$/kWh</label>
                              <input type="number" step="0.001" value={formData.fiobRate || ''} onChange={e => setFormData({...formData, fiobRate: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" />
                            </div>
                          </div>

                          {/* Info distribuidora */}
                          <div className="text-[11px] text-zinc-600 bg-zinc-900/50 rounded-lg px-3 py-2 flex justify-between">
                            <span>{selectedDistributor.name}</span>
                            <span>Fio B total: R$ {selectedDistributor.fiobTotal.toFixed(5)} · 45% em 2025</span>
                          </div>

                          <div className="flex gap-4 pt-2">
                              <button onClick={() => setStep(0)} className="flex-1 py-4 text-zinc-500 hover:text-white transition-colors font-bold">Cancelar</button>
                              <button onClick={handleNextStep1} className="flex-1 py-4 bg-lime-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)] hover:bg-lime-400 flex items-center justify-center gap-2 transition-all">
                                  Avançar <ChevronRight size={18} />
                              </button>
                          </div>
                      </div>
                  )}

                  {step === 2 && (
                      <div className="space-y-6 relative z-10 animate-enter">
                          <h3 className="text-2xl font-bold text-white mb-2">Dimensionamento</h3>
                          <div className="bg-lime-500/10 border border-lime-500/20 p-4 rounded-xl flex justify-between items-center">
                             <p className="text-sm font-bold text-lime-400">Potência Recomendada:</p>
                             <p className="text-lg font-display text-lime-400 font-bold">{formData.systemSizeKw?.toFixed(2)} kWp</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Marca do Módulo</label>
                                <input type="text" value={formData.moduleBrand} onChange={e => setFormData({...formData, moduleBrand: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" placeholder="Ex: Jinko Solar" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Potência (W)</label>
                                <input type="number" value={formData.modulePower} onChange={e => setFormData({...formData, modulePower: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Quantidade</label>
                                <input type="number" value={formData.modulesCount || ''} onChange={e => setFormData({...formData, modulesCount: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" />
                             </div>

                             <div className="col-span-2 mt-4">
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Marca Inversor</label>
                                <input type="text" value={formData.inverterBrand} onChange={e => setFormData({...formData, inverterBrand: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" placeholder="Ex: Growatt / Deye" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Inversor (kW)</label>
                                <input type="number" value={formData.inverterPower || ''} onChange={e => setFormData({...formData, inverterPower: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Qtd Inversores</label>
                                <input type="number" value={formData.inverterCount || 1} onChange={e => setFormData({...formData, inverterCount: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" />
                             </div>
                          </div>

                          <div className="flex gap-4 mt-8">
                              <button onClick={() => setStep(1)} className="flex-1 py-4 text-zinc-500 hover:text-white transition-colors font-bold">Voltar</button>
                              <button onClick={handleNextStep2} className="flex-1 py-4 bg-lime-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)] hover:bg-lime-400 flex items-center justify-center gap-2 transition-all">
                                  Validar Sistema <ChevronRight size={18} />
                              </button>
                          </div>
                      </div>
                  )}

                  {step === 3 && (
                      <div className="space-y-6 relative z-10 animate-enter">
                          <div className="text-center mb-6">
                              <Calculator size={48} className="mx-auto text-lime-500 mb-4 opacity-80" />
                              <h3 className="text-3xl font-display font-bold text-white mb-2">Composição de Custos</h3>
                              <p className="text-zinc-400">Usina calculada: <strong className="text-lime-400">{formData.systemSizeKw?.toFixed(2)} kWp</strong> ({formData.modulesCount} módulos).</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                              <div className="col-span-1 md:col-span-2">
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Faturamento de Kit - Distribuidor (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.priceKit || ''} 
                                    onChange={e => setFormData({...formData, priceKit: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" 
                                    placeholder="Ex: 15000"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Instalação por Módulo (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.pricePerModule || ''} 
                                    onChange={e => setFormData({...formData, pricePerModule: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" 
                                    placeholder="Ex: 200"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Material CA (R$ / kWp)</label>
                                  <input 
                                    type="number" 
                                    value={formData.priceCA || ''} 
                                    onChange={e => setFormData({...formData, priceCA: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" 
                                    placeholder="Ex: 400"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2 mt-4 text-blue-400">Custos Adicionais (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.additionalCosts || ''} 
                                    onChange={e => setFormData({...formData, additionalCosts: Number(e.target.value)})} 
                                    className="w-full bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-blue-400 focus:border-blue-500 outline-none placeholder:text-zinc-500 placeholder:text-opacity-70" 
                                  />
                              </div>
                              <div className="col-span-1 md:col-span-2 mt-4 border-t border-white/5 pt-6">
                                  <div className="flex justify-between items-center mb-2">
                                     <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        Margem de Lucro Projetada (%)
                                        <span className="text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded text-[10px]">{formData.profitPercentage || 0}%</span>
                                     </label>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0" max="100" step="0.5"
                                    value={formData.profitPercentage || 0} 
                                    onChange={e => setFormData({...formData, profitPercentage: Number(e.target.value)})} 
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-500" 
                                  />
                              </div>
                              <div className="col-span-1 md:col-span-2 pt-4">
                                  <div className="flex justify-between items-center mb-2">
                                     <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        Imposto sobre Venda Liquida / DAS (%)
                                        <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px]">{formData.taxPercentage || 0}%</span>
                                     </label>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0" max="40" step="0.5"
                                    value={formData.taxPercentage || 0} 
                                    onChange={e => setFormData({...formData, taxPercentage: Number(e.target.value)})} 
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500" 
                                  />
                              </div>
                          </div>

                          <div className="mt-6 bg-zinc-900 border border-white/10 rounded-xl p-6 text-sm text-zinc-400">
                             <strong className="text-white text-lg block mb-4">Extrato Transparente:</strong>
                             <div className="flex justify-between"><span>Custo de Equipamentos + CA + Serviços:</span> <span className="font-bold text-white">{formatCurrency(((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)))}</span></div>
                             <div className="flex justify-between text-yellow-500 mt-2"><span>Impostos ({formData.taxPercentage}%):</span> <span className="font-bold">{formatCurrency((((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)) / (1 - (((formData.taxPercentage || 0)/100) + ((formData.profitPercentage || 0)/100))) * ((formData.taxPercentage || 0)/100)))}</span></div>
                             <div className="flex justify-between text-lime-400"><span>Lucratividade ({formData.profitPercentage}%):</span> <span className="font-bold">{formatCurrency((((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)) / (1 - (((formData.taxPercentage || 0)/100) + ((formData.profitPercentage || 0)/100))) * ((formData.profitPercentage || 0)/100)))}</span></div>
                             <div className="mt-6 pt-4 border-t border-white/20 text-2xl font-display font-bold flex justify-between text-white">
                                <span>Preço de Venda Sugerido:</span>
                                <span className="text-lime-500">{formatCurrency((((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)) / (1 - (((formData.taxPercentage || 0)/100) + ((formData.profitPercentage || 0)/100)))))}</span>
                             </div>
                          </div>

                          <div className="flex gap-4 pt-4 border-t border-white/5 mt-6">
                              <button onClick={() => setStep(2)} className="w-1/3 py-4 text-zinc-500 hover:text-white transition-colors font-bold">Voltar</button>
                              <button onClick={handleCalculatePrice} className="w-2/3 py-4 bg-lime-500 text-black font-bold rounded-xl shadow-[0_0_25px_rgba(163,230,53,0.3)] hover:bg-lime-400 flex items-center justify-center gap-2 transition-all active:scale-95 text-lg">
                                  Gerar Documento (PDF)
                              </button>
                          </div>
                      </div>
                  )}

              </div>
          </div>
      )}

      {/* RENDERIZADOR PDF - Modal Over the top */}
      {step === 4 && (
        <ProposalEditor 
          data={formData as ProposalData} 
          onClose={() => { setStep(0); setFormData({}); }} 
          onSave={handleSavePreview}
          onDelete={(id) => { handleDeleteProposal(id); setStep(0); setFormData({}); }}
        />
      )}
    </div>
  );
};

export default Proposals;
