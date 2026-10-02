import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, Sparkles, Copy, Check, Loader2, Clock, Send, Tag, Building2, User, ChevronDown, Activity, Bot, Flame, MessageCircle, Calendar, CheckCircle, Phone, MapPin, DollarSign, ExternalLink, Mail, CreditCard, Zap, Home } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';

export interface Opportunity {
  id: string;
  account_id?: string;
  contact_id?: string;
  title: string;
  status: string;
  amount: number;
  city?: string;
  phone?: string;
  email?: string;
  cpf_cnpj?: string;
  birth_date?: string;
  system_power?: number;
  installation_date?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  loss_reason?: string;
  next_action_date?: string;
  next_action_text?: string;
}

interface AgentNote {
  id: string;
  entity_type: string;
  entity_id: string;
  note: string;
  created_by_ai: boolean;
  created_at: string;
}

interface OpportunityDetailsPanelProps {
  opportunity: Opportunity;
  stages: any[];
  onClose: () => void;
  onSave: (opp: Partial<Opportunity>) => void;
  onDelete: (id: string) => void;
}

const InlineEdit = ({ value, onSave, type = "text", placeholder = "Vazio", prefix = "", suffix = "", className = "" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (val !== value) onSave(val);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setVal(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-black/60 border border-lime-500 rounded-lg p-1 text-white outline-none w-full ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-white/10 ${!value && 'text-zinc-500 italic'} ${className}`}
      title="Clique para editar"
    >
      {prefix}{value ? (type === 'number' && prefix === 'R$ ' ? Number(value).toLocaleString('pt-BR') : value) : placeholder}{suffix}
    </div>
  );
};

export const OpportunityDetailsPanel: React.FC<OpportunityDetailsPanelProps> = ({
  opportunity,
  stages,
  onClose,
  onSave,
  onDelete
}) => {
  const [agentNotes, setAgentNotes] = useState<AgentNote[]>([]);
  const [lastProposalId, setLastProposalId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProposal() {
      const { data } = await supabase.from('proposals').select('id').eq('lead_id', opportunity.id).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        setLastProposalId(data[0].id);
      }
    }
    fetchProposal();
  }, [opportunity.id]);
  const [newNote, setNewNote] = useState('');

  const leadScore = Math.min(100, Math.max(10, Math.floor((opportunity.amount || 0) / 1000) + 40));
  const isHotLead = leadScore >= 80;

  useEffect(() => {
    fetchNotes();
  }, [opportunity.id]);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('agent_notes')
      .select('*')
      .eq('entity_type', 'opportunity')
      .eq('entity_id', opportunity.id)
      .order('created_at', { ascending: false });
    if (data) setAgentNotes(data);
  };

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNote.trim()) return;

    const noteToInsert = {
      entity_type: 'opportunity',
      entity_id: opportunity.id,
      note: newNote,
      created_by_ai: false
    };

    const { data, error } = await supabase.from('agent_notes').insert([noteToInsert]).select();
    if (!error && data) {
      setAgentNotes(prev => [data[0], ...prev]);
      setNewNote('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] lg:hidden transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full md:w-[700px] xl:w-[850px] bg-zinc-950/90 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-[60] flex flex-col transform transition-transform duration-500 ease-out">
        
        {/* HERO HEADER */}
        <div className="relative p-8 border-b border-white/5 overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="absolute top-0 right-10 flex gap-2">
              <button 
                onClick={() => lastProposalId ? navigate(`/propostas/${lastProposalId}`) : navigate(`/propostas/nova`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors mr-6"
              >
                <FileText size={16} />
                {lastProposalId ? 'Ver Proposta' : 'Nova Proposta'}
              </button>
            </div>
            <div className="flex-1 pr-6">
              
              {/* Stepper Implementation */}
              <div className="flex items-center gap-3 mb-5 w-full">
                <div className="flex w-full overflow-hidden rounded-lg bg-zinc-900/50 border border-white/5 shadow-inner">
                  {stages.map((s, index) => {
                    const currentIndex = stages.findIndex(st => st.id === opportunity.status);
                    const thisIndex = index;
                    const isPassed = thisIndex < currentIndex;
                    const isCurrent = thisIndex === currentIndex;
                    
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSave({ status: s.id })}
                        className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all relative
                          ${isCurrent ? 'bg-lime-500 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)] z-10' : 
                            isPassed ? 'bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 border-r border-black/20' : 
                            'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border-l border-white/5'}`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex gap-3 mb-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${isHotLead ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                  {isHotLead ? <Flame size={14} className="animate-pulse" /> : <Bot size={14} />}
                  Score: {leadScore}
                </span>
              </div>

              <h2 className="text-4xl font-display font-bold text-white tracking-tight mb-4">
                <InlineEdit 
                  value={opportunity.title} 
                  onSave={(v: string) => onSave({ title: v })} 
                />
              </h2>
              
              {/* LOSS REASON BANNER */}
              {opportunity.status === 'Perdido' && opportunity.loss_reason && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 w-full backdrop-blur-sm mb-4">
                  <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                    <X size={18} />
                  </div>
                  <div className="flex-1 w-full">
                    <span className="text-[10px] text-red-400/70 font-bold uppercase tracking-wider">Motivo da Perda</span>
                    <div className="text-sm font-semibold text-red-100 mt-0.5">
                      {opportunity.loss_reason}
                    </div>
                  </div>
                </div>
              )}
              
              {/* NEXT ACTION BANNER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 w-full backdrop-blur-sm">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                  <Calendar size={18} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                  <div className="flex flex-col w-full sm:w-auto">
                    <span className="text-[10px] text-blue-400/70 font-bold uppercase tracking-wider">Data do Follow-up</span>
                    <div className="text-sm font-semibold text-blue-100">
                      <InlineEdit 
                        type="date"
                        value={opportunity.next_action_date} 
                        placeholder="Definir Data" 
                        onSave={(v: string) => onSave({ next_action_date: v })} 
                      />
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-blue-500/20"></div>
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] text-blue-400/70 font-bold uppercase tracking-wider">Próximo Passo</span>
                    <div className="text-sm font-semibold text-blue-100 w-full">
                      <InlineEdit 
                        value={opportunity.next_action_text} 
                        placeholder="Ex: Ligar para apresentar proposta..." 
                        onSave={(v: string) => onSave({ next_action_text: v })} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
              <button onClick={() => onDelete(opportunity.id)} className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Excluir"><Trash2 size={18} /></button>
              <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
              <button onClick={onClose} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Fechar"><X size={20} /></button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/10">
          
          <div className="space-y-10 w-full animate-enter">
            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-lime-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign size={48} className="text-lime-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><DollarSign size={14} className="text-lime-500" /> Valor Estimado</label>
                <div className="text-3xl font-display font-bold text-white relative z-10">
                  <InlineEdit 
                    type="number" 
                    prefix="R$ " 
                    value={opportunity.amount} 
                    onSave={(v: string) => onSave({ amount: Number(v) })} 
                  />
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Phone size={48} className="text-blue-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><Phone size={14} className="text-blue-500" /> Telefone/WhatsApp</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    value={opportunity.phone} 
                    placeholder="Não informado" 
                    onSave={(v: string) => onSave({ phone: v })} 
                  />
                </div>
              </div>
              
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-amber-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Mail size={48} className="text-amber-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><Mail size={14} className="text-amber-500" /> Email</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    value={opportunity.email} 
                    placeholder="Não informado" 
                    onSave={(v: string) => onSave({ email: v })} 
                  />
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CreditCard size={48} className="text-indigo-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><CreditCard size={14} className="text-indigo-500" /> CPF / CNPJ</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    value={opportunity.cpf_cnpj} 
                    placeholder="Não informado" 
                    onSave={(v: string) => onSave({ cpf_cnpj: v })} 
                  />
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-cyan-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar size={48} className="text-cyan-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><Calendar size={14} className="text-cyan-500" /> Nascimento / Fundação</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    type="date"
                    value={opportunity.birth_date} 
                    placeholder="Não informada" 
                    onSave={(v: string) => onSave({ birth_date: v })} 
                  />
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-yellow-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap size={48} className="text-yellow-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><Zap size={14} className="text-yellow-500" /> Potência do Sistema (kWp)</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    type="number"
                    value={opportunity.system_power} 
                    placeholder="0.0" 
                    suffix=" kWp"
                    onSave={(v: string) => onSave({ system_power: Number(v) })} 
                  />
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-pink-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar size={48} className="text-pink-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><Calendar size={14} className="text-pink-500" /> Data de Instalação</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    type="date"
                    value={opportunity.installation_date} 
                    placeholder="Não informada" 
                    onSave={(v: string) => onSave({ installation_date: v })} 
                  />
                </div>
              </div>
              
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-orange-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <MapPin size={48} className="text-orange-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><MapPin size={14} className="text-orange-500" /> Cidade</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    value={opportunity.city} 
                    placeholder="Não informada" 
                    onSave={(v: string) => onSave({ city: v })} 
                  />
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-red-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-4">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Home size={48} className="text-red-500" />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10"><Home size={14} className="text-red-500" /> Logradouro</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    value={opportunity.address} 
                    placeholder="Rua, número, bairro..." 
                    onSave={(v: string) => onSave({ address: v })} 
                  />
                </div>
              </div>
              
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-lime-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10">Latitude</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    type="number"
                    value={opportunity.latitude} 
                    placeholder="-0.0000" 
                    onSave={(v: string) => onSave({ latitude: Number(v) })} 
                  />
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-lime-500/30 hover:bg-zinc-900/80 transition-all group relative overflow-hidden col-span-2 md:col-span-2">
                <label className="flex items-center gap-2 text-xs text-zinc-500 uppercase font-bold tracking-widest mb-3 relative z-10">Longitude</label>
                <div className="text-lg font-medium text-white relative z-10">
                  <InlineEdit 
                    type="number"
                    value={opportunity.longitude} 
                    placeholder="-0.0000" 
                    onSave={(v: string) => onSave({ longitude: Number(v) })} 
                  />
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="bg-zinc-900/30 p-8 rounded-3xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-display"><Clock size={20} className="text-lime-400" /> Histórico & Timeline</h3>
              
              <form onSubmit={handleAddNote} className="mb-10 flex gap-3">
                <div className="flex-1 relative">
                  <input type="text" placeholder="Registrar uma nota ou ocorrência..." 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all shadow-inner"
                    value={newNote} onChange={e => setNewNote(e.target.value)} />
                </div>
                <button type="submit" className="bg-lime-500 hover:bg-lime-400 text-black rounded-2xl px-6 font-bold transition-all shadow-[0_0_15px_rgba(163,230,53,0.2)] hover:shadow-[0_0_20px_rgba(163,230,53,0.4)] flex items-center justify-center">
                  <Send size={18}/>
                </button>
              </form>
              
              <div className="relative border-l border-zinc-800 ml-6 space-y-8 pb-4">
                {agentNotes.map((note) => (
                  <div key={note.id} className="ml-10 relative group">
                    {note.created_by_ai ? (
                      <div className="absolute -left-[54px] top-0 w-8 h-8 rounded-full bg-purple-900 border-2 border-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)] z-10">
                        <Bot size={14} className="text-purple-300" />
                      </div>
                    ) : (
                      <div className="absolute -left-[45px] top-2 w-3 h-3 rounded-full bg-lime-500 shadow-[0_0_10px_rgba(163,230,53,0.5)] z-10"></div>
                    )}
                    
                    <div className={`p-5 rounded-2xl border transition-all ${note.created_by_ai ? 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40' : 'bg-zinc-900/80 border-white/5 hover:border-white/10'}`}>
                      <div className="flex justify-between items-baseline mb-3">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${note.created_by_ai ? 'text-purple-400' : 'text-zinc-500'}`}>
                          {note.created_by_ai ? <Sparkles size={12} /> : null}
                          {note.created_by_ai ? 'Agent Insight' : 'Nota'}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono bg-black/30 px-2 py-1 rounded-md">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${note.created_by_ai ? 'text-purple-100 font-medium' : 'text-zinc-300'}`}>{note.note}</p>
                    </div>
                  </div>
                ))}
                {agentNotes.length === 0 && (
                  <div className="ml-10 p-6 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                    <Clock size={24} className="text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-500 font-medium">Nenhum registro na timeline ainda.</p>
                    <p className="text-xs text-zinc-600 mt-1">Adicione uma nota acima.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
