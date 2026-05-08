import React, { useState, useEffect } from 'react';
import { ProposalEditor, ProposalData } from '../components/ProposalEditor';
import { FileText, Plus, ChevronRight, Calculator, CheckCircle, LayoutGrid, List, Search, Trash2, Copy, Edit3, TrendingUp, Calendar, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

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
  const [formData, setFormData] = useState<Partial<ProposalData>>({
    clientName: '',
    city: '',
    consumption: 0,
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
    systemSizeKw: 0
  });


  useEffect(() => {
    localStorage.setItem('quark_proposals', JSON.stringify(proposals));
  }, [proposals]);

  const handleNextStep1 = () => {
    if (!formData.clientName || !formData.city || formData.consumption === 0) {
      alert("Preencha todos os dados básicos.");
      return;
    }
    // Calcular Potência Esperada ~= Consumo / 123 (Rendimento Base)
    const expectedPower = (formData.consumption as number) / 123;
    setFormData(prev => ({ ...prev, systemSizeKw: expectedPower }));
    setStep(2);
  };

  const handleNextStep2 = () => {
    // Calculando novo kWp baseado na placa preenchida (Placas x Potência Placa W) / 1000
    const kwpReal = ((formData.modulesCount || 0) * (formData.modulePower || 0)) / 1000;
    
    setFormData(prev => ({ ...prev, systemSizeKw: kwpReal }));
    setStep(3); // Vamos para as perguntas de preço personalizadas
  };

  const handleCalculatePrice = () => {
    const totalModules = (formData.modulesCount || 0) * (formData.pricePerModule || 0);
    const totalKit = (formData.priceKit || 0);
    const totalCA = (formData.systemSizeKw || 0) * (formData.priceCA || 0);
    
    const custoEquipamentos = totalModules + totalKit + totalCA;
    const custoTotalBase = custoEquipamentos + (formData.additionalCosts || 0);
    
    const taxFactor = (formData.taxPercentage || 0) / 100;
    const profitFactor = (formData.profitPercentage || 0) / 100;
    const totalFactor = taxFactor + profitFactor;
    
    // Formula de Markup reverso
    const safeFactor = totalFactor >= 0.95 ? 0.95 : totalFactor;
    
    const finalCalculated = custoTotalBase / (1 - safeFactor);
    
    setFormData(prev => ({ ...prev, finalPrice: finalCalculated }));
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
      addLead({
        name: newProposal.clientName,
        city: newProposal.city,
        value: newProposal.finalPrice,
        monthlyConsumption: newProposal.consumption,
        phone: '',
        status: 'Proposta'
      });
    }
    setStep(0);
    setFormData({});
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
    <div className="space-y-6 h-full flex flex-col animate-enter">
      {/* ── Header ── */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Propostas Comerciais</h1>
          <p className="text-slate-400 mt-1">Crie, edite e envie propostas profissionais.</p>
        </div>
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 px-6 py-3 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-all shadow-lg shadow-lime-500/20 active:scale-95"
          >
            <Plus size={20} />
            Nova Proposta
          </button>
        )}
      </div>

      {step === 0 && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">

          {/* ── Stats Bar ── */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {[
              { icon: <FileText size={16}/>, label: 'Total de Propostas', value: proposals.length, color: 'text-white' },
              { icon: <TrendingUp size={16}/>, label: 'Valor Total', value: formatCurrency(totalValue), color: 'text-amber-400' },
              { icon: <Calendar size={16}/>, label: 'Este Mês', value: monthCount, color: 'text-lime-400' },
            ].map((stat, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 border border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30" style={{background:'rgba(255,255,255,0.04)'}}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{stat.label}</p>
                  <p className={`text-lg font-display font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nome ou cidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-white focus:border-amber-500/50 outline-none text-sm transition-all"
              />
            </div>
            <div className="flex rounded-xl border border-white/8 p-1 gap-1" style={{background:'rgba(255,255,255,0.03)'}}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                title="Visualização em grid"
              >
                <LayoutGrid size={16}/>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                title="Visualização em lista"
              >
                <List size={16}/>
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
                      <div className="space-y-6 relative z-10 animate-enter">
                          <h3 className="text-2xl font-bold text-white mb-2">Dados do Cliente</h3>
                          <p className="text-zinc-500 text-sm mb-6">Insira os dados básicos e o consumo para iniciarmos os cálculos.</p>
                          
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Nome / Empresa</label>
                              <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: Mercado CompreBem" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Cidade - UF</label>
                              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: São Paulo - SP" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2 flex justify-between">
                                 <span>Consumo Mensal (kWh)</span>
                                 <span className="text-lime-500/50 hidden md:inline">Potência Baseada em Hsp=123</span>
                              </label>
                              <div className="relative">
                                  <input type="number" value={formData.consumption || ''} onChange={e => setFormData({...formData, consumption: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 pl-12 text-white font-display focus:border-lime-500 outline-none text-xl" placeholder="0" />
                                  <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-lime-500/50" size={20} />
                              </div>
                          </div>
                          <div className="flex gap-4 mt-8">
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
                                <input type="text" value={formData.moduleBrand} onChange={e => setFormData({...formData, moduleBrand: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: Jinko Solar" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Potência (W)</label>
                                <input type="number" value={formData.modulePower} onChange={e => setFormData({...formData, modulePower: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Quantidade</label>
                                <input type="number" value={formData.modulesCount || ''} onChange={e => setFormData({...formData, modulesCount: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>

                             <div className="col-span-2 mt-4">
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Marca Inversor</label>
                                <input type="text" value={formData.inverterBrand} onChange={e => setFormData({...formData, inverterBrand: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: Growatt / Deye" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Inversor (kW)</label>
                                <input type="number" value={formData.inverterPower || ''} onChange={e => setFormData({...formData, inverterPower: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Qtd Inversores</label>
                                <input type="number" value={formData.inverterCount || 1} onChange={e => setFormData({...formData, inverterCount: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
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
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" 
                                    placeholder="Ex: 15000"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Instalação por Módulo (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.pricePerModule || ''} 
                                    onChange={e => setFormData({...formData, pricePerModule: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" 
                                    placeholder="Ex: 200"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Material CA (R$ / kWp)</label>
                                  <input 
                                    type="number" 
                                    value={formData.priceCA || ''} 
                                    onChange={e => setFormData({...formData, priceCA: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" 
                                    placeholder="Ex: 400"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2 mt-4 text-blue-400">Custos Adicionais (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.additionalCosts || ''} 
                                    onChange={e => setFormData({...formData, additionalCosts: Number(e.target.value)})} 
                                    className="w-full bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-blue-400 focus:border-blue-500 outline-none" 
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
          onClose={() => setStep(0)} 
          onSave={handleSavePreview} 
        />
      )}
    </div>
  );
};

export default Proposals;
