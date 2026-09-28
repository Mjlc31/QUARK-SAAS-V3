import React, { useState, useEffect, useRef } from 'react';
import { Plus, MapPin, Search, X, Clock, Send, Trash2, Pencil, DollarSign, GripVertical, List, LayoutGrid, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { OpportunityDetailsPanel, Opportunity } from '../components/OpportunityDetailsPanel';

const OPPORTUNITY_STAGES = [
  { id: 'Lead', name: 'Lead', color: 'border-blue-500', order: 0 },
  { id: 'Qualificado', name: 'Qualificado', color: 'border-yellow-500', order: 1 },
  { id: 'Proposta', name: 'Proposta', color: 'border-purple-500', order: 2 },
  { id: 'Ganho', name: 'Ganho', color: 'border-lime-500', order: 3 },
  { id: 'Perdido', name: 'Perdido', color: 'border-red-500', order: 4 },
];

const CRM: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to list view on mobile
  const [viewMode, setViewMode] = useState<'board' | 'list'>(
    () => window.innerWidth < 768 ? 'list' : 'board'
  );

  const [draggedOpp, setDraggedOpp] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({ title: '', phone: '', amount: '', city: '' });

  useEffect(() => {
    fetchOpportunities();
    
    // Subscribe to realtime changes
    const channel = supabase.channel('opportunities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, payload => {
        fetchOpportunities(); // Re-fetch on any change for simplicity
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setOpportunities(data);
    }
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedOpp(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedOpp) {
      const oppToMove = opportunities.find(o => o.id === draggedOpp);
      if (!oppToMove || oppToMove.status === status) {
        setDraggedOpp(null);
        return;
      }

      // Optimistic update
      setOpportunities(prev => prev.map(o => o.id === draggedOpp ? { ...o, status } : o));
      
      const { error } = await supabase
        .from('opportunities')
        .update({ status })
        .eq('id', draggedOpp);
        
      if (error) {
        console.error('Error updating status', error);
        fetchOpportunities(); // Revert on error
      } else {
        // --- AUTOMAÇÃO DE WHATSAPP VIA EVOLUTION API (Simulado/Preparado) ---
        let text = '';
        if (status === 'Qualificado') text = `Olá ${oppToMove.title}! Um dos nossos engenheiros da Quark Energia vai analisar o seu perfil de consumo.`;
        if (status === 'Proposta') text = `Olá ${oppToMove.title}, sua proposta solar da Quark Energia está pronta! Já vamos te enviar os detalhes.`;
        if (status === 'Ganho') text = `Parabéns ${oppToMove.title}! Bem-vindo(a) à família Quark Energia. Estamos felizes em ter você conosco!`;

        if (text && oppToMove.phone) {
          console.log(`[Automação WhatsApp] Enviando para ${oppToMove.phone}: ${text}`);
          // Aqui faríamos o POST real para a Evolution API:
          // await fetch('http://localhost:8080/message/sendText/Quark', { method: 'POST', body: JSON.stringify({ number: oppToMove.phone, textMessage: { text } }) })
          
          // Registrar na timeline do CRM que a automação disparou!
          await supabase.from('agent_notes').insert([{
            entity_type: 'opportunity',
            entity_id: oppToMove.id,
            note: `Automação disparada (WhatsApp): "${text}"`,
            created_by_ai: true
          }]);
        }
      }
      setDraggedOpp(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const getColumnTotal = (status: string) => {
    return opportunities
      .filter(o => o.status === status)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value}`;
  };

  const submitNewOpp = async () => {
    const newOpp = {
      title: formData.title || 'Nova Oportunidade',
      phone: formData.phone,
      city: formData.city,
      amount: Number(formData.amount) || 0,
      status: 'Lead',
    };
    
    const { data, error } = await supabase.from('opportunities').insert([newOpp]).select();
    if (data && !error) {
      setOpportunities(prev => [data[0], ...prev]);
    }
    
    setIsFormOpen(false);
    setFormData({ title: '', phone: '', amount: '', city: '' });
  };

  const handleSaveEdit = async (updates: Partial<Opportunity>) => {
    if (!selectedOpp) return;
    
    // Optimistic update
    setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, ...updates } : o));
    
    const { error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', selectedOpp.id);
      
    if (error) {
      fetchOpportunities(); // Revert
    } else {
      setSelectedOpp({ ...selectedOpp, ...updates } as Opportunity);
    }
  };

  const handleDelete = async (id: string) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
    await supabase.from('opportunities').delete().eq('id', id);
    setSelectedOpp(null);
  };

  const filteredOpps = opportunities.filter(o =>
    o.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] flex flex-col relative animate-enter">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] md:min-w-[280px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar oportunidade..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* View Toggle */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex">
            <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Quadro"><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Lista"><List size={18} /></button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95 w-full sm:w-auto justify-center"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Nova Oportunidade</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Pipeline (Qualificado + Proposta)</p>
          <p className="text-2xl font-display font-bold text-white">
            R$ {opportunities.filter(o => o.status === 'Qualificado' || o.status === 'Proposta').reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Taxa de Conversão (Win Rate)</p>
          <p className="text-2xl font-display font-bold text-lime-400">
            {opportunities.length > 0 
              ? Math.round((opportunities.filter(o => o.status === 'Ganho').length / opportunities.length) * 100)
              : 0}%
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total de Oportunidades</p>
          <p className="text-2xl font-display font-bold text-white">
            {opportunities.length}
          </p>
        </div>
      </div>

      {/* CONTENT AREA */}
      {viewMode === 'board' ? (
        // --- BOARD VIEW (KANBAN) ---
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-4 md:mx-0 px-4 md:px-0 custom-scrollbar snap-x-mandatory">
          <div className="flex flex-row gap-4 md:gap-6 min-w-max md:min-w-[1240px] h-full items-start px-1 md:px-0">
            {OPPORTUNITY_STAGES.map(column => {
              const columnOpps = filteredOpps.filter(o => (o.status || 'Lead') === column.id);
              const columnTotalValue = columnOpps.reduce((acc, o) => acc + (o.amount || 0), 0);

              return (
                <div
                  key={column.id}
                  className={`flex flex-col w-[88vw] md:w-[320px] shrink-0 h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden transition-all duration-300`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className={`p-3 border-b-2 ${column.color} bg-zinc-900/50 flex flex-col gap-2 group/header shrink-0 relative overflow-hidden`}>
                    <div className="flex items-center justify-between relative z-10 mb-1">
                      <div className="flex items-center gap-2 group/title w-full">
                        <h3 className="font-bold text-zinc-200 tracking-wide font-display text-sm truncate max-w-[200px]">{column.name}</h3>
                      </div>
                      <span className="bg-zinc-800 border border-white/5 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-400 shrink-0 ml-2">{columnOpps.length}</span>
                    </div>
                    <div className="flex items-center justify-between w-full relative z-10 mt-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded border border-zinc-700/50 relative z-10 self-start">
                        <span className="text-[11px] font-semibold text-zinc-300 font-mono">{formatCurrencyShort(columnTotalValue)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {columnOpps.length === 0 && (
                      <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 gap-2">
                        <div className="p-2 bg-white/5 rounded-full">
                          <LayoutGrid size={20} className="opacity-20" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider">Fase Vazia</p>
                      </div>
                    )}
                    {columnOpps.map(opp => {
                      const isLost = opp.status === 'Perdido';
                      const cardBorder = isLost ? 'border-red-900/50 opacity-50' : 'border-zinc-800 hover:border-zinc-700';

                      return (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onClick={() => setSelectedOpp(opp)}
                        className={`bg-zinc-900 border p-4 rounded-lg cursor-pointer transition-all shadow-sm group relative touch-manipulation hover:-translate-y-0.5 ${cardBorder}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                             <h4 className="font-semibold text-zinc-100 truncate text-sm tracking-tight group-hover:text-white transition-colors mb-1">{opp.title}</h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium mb-1">
                              <MapPin size={12} /> {opp.city || 'Não informada'}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 mb-3">
                          <div className="bg-zinc-950/50 rounded-lg p-2 border border-zinc-800 flex justify-between items-center">
                            <p className="text-[9px] text-zinc-500 font-semibold">VALOR</p>
                            <p className="text-xs font-medium text-lime-400">R$ {(opp.amount || 0).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-medium text-zinc-300 border border-zinc-700">
                              {opp.title?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              Atualizado
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); /* handle whatsapp */ }}
                            className="text-green-500 hover:text-white bg-green-500/10 hover:bg-green-500 p-1.5 rounded transition-all"
                            title="Chamar no WhatsApp"
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // --- LIST VIEW ---
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden animate-enter">
          <div className="divide-y divide-white/5">
            {filteredOpps.length === 0 && (
              <div className="py-16 text-center text-zinc-600">
                <p className="text-sm">Nenhuma oportunidade encontrada.</p>
              </div>
            )}
            {filteredOpps.map(opp => {
              const stage = opp.status || 'Lead';
              const stageData = OPPORTUNITY_STAGES.find(s => s.id === stage);
              const isLost = stage === 'Perdido';
              const stageColor = isLost ? 'bg-red-500/10 text-red-400 border-red-500/20' : `bg-white/5 text-zinc-300 border-white/10`; // fallback
                
              return (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className={`flex items-center gap-3 px-4 py-3.5 active:bg-white/10 transition-colors cursor-pointer group hover:bg-white/5 border-l-2 border-l-transparent`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[13px] font-bold text-zinc-300 border border-white/5 shrink-0">
                    {opp.title.substring(0, 2).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm text-white truncate">{opp.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${stageColor}`}>
                        {stageData?.name || stage}
                      </span>
                      {opp.city && <span className="text-[11px] text-zinc-500 truncate">{opp.city}</span>}
                    </div>
                  </div>
                  {/* Value */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold font-display text-lime-400 whitespace-nowrap">
                      R$ {(opp.amount || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-Over Detail Panel */}
      {selectedOpp && (
        <OpportunityDetailsPanel
          opportunity={selectedOpp}
          stages={OPPORTUNITY_STAGES}
          onClose={() => setSelectedOpp(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
        />
      )}

      {/* New Opportunity Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-8 border border-white/10 shadow-2xl animate-enter">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white font-display">Nova Oportunidade</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Título / Cliente</label>
                <input type="text" placeholder="Nome da Oportunidade" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Contato</label>
                  <input type="text" placeholder="Telefone" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Local</label>
                  <input type="text" placeholder="Cidade" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Valor Estimado</label>
                <input type="number" placeholder="R$" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsFormOpen(false)} className="flex-1 py-4 text-zinc-400 hover:text-white font-medium transition-colors">Cancelar</button>
              <button onClick={submitNewOpp} className="flex-1 btn-primary py-4 rounded-xl shadow-lg active:scale-95 min-w-[44px] min-h-[44px]">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
