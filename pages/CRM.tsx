import React, { useState, useEffect, useRef } from 'react';
import { Plus, MapPin, Search, X, Clock, Send, Edit2, Trash2, Save, Sparkles, Copy, Check, Loader2, Pencil, DollarSign, GripVertical, List, LayoutGrid, AlertTriangle } from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { useApp } from '../contexts/AppContext';
import { ai } from '../lib/ai';
import { LeadDetailsPanel } from '../components/LeadDetailsPanel';

const COLUMN_CONFIG: { id: LeadStatus; defaultLabel: string; color: string }[] = [
  { id: 'Lead', defaultLabel: 'Novos Leads', color: 'border-blue-500' },
  { id: 'Qualificacao', defaultLabel: 'Em Qualificação', color: 'border-yellow-500' },
  { id: 'Proposta', defaultLabel: 'Proposta Enviada', color: 'border-purple-500' },
  { id: 'Fechado', defaultLabel: 'Fechado / Ganho', color: 'border-lime-500' },
];

const CRM: React.FC = () => {
  const { leads, updateLeadStatus, addLead, addLeadLog, updateLead, deleteLead } = useApp();

  // View State (Board vs List)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [touchDrag, setTouchDrag] = useState<{ id: string; x: number; y: number; width: number; height: number; lead: Lead } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [columnTitles, setColumnTitles] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('crm_column_titles');
    if (saved) return JSON.parse(saved);
    return COLUMN_CONFIG.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultLabel }), {});
  });

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProposal, setAiProposal] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});
  const [formData, setFormData] = useState({ name: '', phone: '', value: '', city: '', consumption: '' });

  useEffect(() => {
    setIsEditing(false);
    setAiProposal('');
    setIsCopied(false);
    if (selectedLead) {
      setEditFormData(selectedLead);
    }
  }, [selectedLead]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLead(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedLead) {
      updateLeadStatus(draggedLead, status);
      setDraggedLead(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleTouchStart = (e: React.TouchEvent, lead: Lead) => {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    setTouchDrag({
      id: lead.id,
      lead: lead,
      x: touch.clientX,
      y: touch.clientY,
      width: rect.width,
      height: rect.height
    });
    document.body.style.overflow = 'hidden';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDrag || !ghostRef.current) return;
    const touch = e.touches[0];
    ghostRef.current.style.transform = `translate(${touch.clientX - touchDrag.width / 2}px, ${touch.clientY - touchDrag.height / 2}px)`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDrag) return;
    const touch = e.changedTouches[0];

    // Hide ghost immediately to perform hit test
    if (ghostRef.current) ghostRef.current.style.display = 'none';

    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const columnEl = elements.find(el => el.getAttribute('data-column-id'));

    if (columnEl) {
      const status = columnEl.getAttribute('data-column-id') as LeadStatus;
      if (status !== touchDrag.lead.status) {
        updateLeadStatus(touchDrag.id, status);
      }
    }

    // Clean up
    setTouchDrag(null);
    document.body.style.overflow = '';
  };

  const startEditingColumn = (id: string, currentTitle: string) => {
    setEditingColumnId(id);
    setTempTitle(currentTitle);
  };

  const saveColumnTitle = (id: string) => {
    const newTitles = { ...columnTitles, [id]: tempTitle };
    setColumnTitles(newTitles);
    localStorage.setItem('crm_column_titles', JSON.stringify(newTitles));
    setEditingColumnId(null);
  };

  const getColumnTotal = (status: LeadStatus) => {
    return leads
      .filter(l => l.status === status)
      .reduce((acc, curr) => acc + curr.value, 0);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value}`;
  };

  const isStagnant = (dateStr: string) => {
    if (!dateStr) return false;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 7;
  };

  const handleBulkWhatsApp = (status: LeadStatus) => {
    const leadsInColumn = leads.filter(l => l.status === status);
    if (leadsInColumn.length === 0) {
      alert("Nenhum lead nesta fase para enviar mensagem.");
      return;
    }
    
    // Simulate bulk sending
    leadsInColumn.forEach(lead => {
      addLeadLog(lead.id, 'Contato em Massa', 'Mensagem de follow-up enviada via automação');
    });
    
    alert(`Mensagem em massa enviada para ${leadsInColumn.length} leads na fase ${columnTitles[status]} com sucesso!`);
  };

  const handleSmartWhatsApp = (lead: Lead) => {
    const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
    const message = aiProposal || `*${timeOfDay}, ${lead.name.split(' ')[0]}!*

Aqui é da *Quark Energia*. ⚡

Estive analisando o perfil energético da sua unidade em *${lead.city}* e preparei um estudo preliminar.

Para um consumo de ~${lead.monthlyConsumption} kWh, estimamos uma economia anual superior a *R$ ${(lead.monthlyConsumption * 0.9 * 12).toLocaleString('pt-BR')}*.

Podemos agendar uma breve apresentação da proposta?`;

    addLeadLog(lead.id, 'Contato', 'WhatsApp enviado (Smart Link)');
    window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const generateAIProposal = async () => {
    if (!selectedLead) return;
    setIsGeneratingAI(true);
    try {
      const prompt = `
        Aja como um consultor de vendas sênior da Quark Energia.
        Escreva uma mensagem curta e persuasiva para WhatsApp.
        Dados: ${selectedLead.name}, ${selectedLead.city}, ${selectedLead.monthlyConsumption} kWh, R$ ${selectedLead.value}.
        Foco em economia e agilidade. Use negrito em números.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      if (response.text) {
        setAiProposal(response.text.trim());
        addLeadLog(selectedLead.id, 'IA', 'Gerou proposta comercial');
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar IA.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiProposal);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const submitNewLead = () => {
    addLead({
      name: formData.name,
      phone: formData.phone,
      city: formData.city,
      value: Number(formData.value),
      monthlyConsumption: Number(formData.consumption)
    });
    setIsFormOpen(false);
    setFormData({ name: '', phone: '', value: '', city: '', consumption: '' });
  };

  const handleSaveEdit = async () => {
    if (!selectedLead) return;
    await updateLead(selectedLead.id, editFormData);
    setIsEditing(false);
    setSelectedLead({ ...selectedLead, ...editFormData } as Lead);
  };

  const handleDelete = async (e?: React.MouseEvent, idOverride?: string) => {
    if (e) e.stopPropagation();
    const idToDelete = idOverride || selectedLead?.id;
    if (!idToDelete) return;
    if (window.confirm("Deseja realmente excluir este Lead?")) {
      await deleteLead(idToDelete);
      setSelectedLead(null);
    }
  };

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col relative animate-enter pb-10">

      {touchDrag && (
        <div
          ref={ghostRef}
          className="fixed pointer-events-none z-[9999] opacity-90 glass-panel p-5 rounded-2xl border border-lime-500 shadow-2xl"
          style={{ width: touchDrag.width, height: touchDrag.height, top: 0, left: 0, transform: `translate(${touchDrag.x - touchDrag.width / 2}px, ${touchDrag.y - touchDrag.height / 2}px)` }}
        >
          <h4 className="font-bold text-white truncate text-base mb-1 tracking-tight">{touchDrag.lead.name}</h4>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar Lead por nome ou cidade..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/50 outline-none transition-all placeholder-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* View Toggle */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Visualização em Quadro"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Novo Lead</span>
        </button>
      </div>

      {/* CONTENT AREA */}
      {viewMode === 'board' ? (
        // --- BOARD VIEW (KANBAN) ---
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-4 md:mx-0 px-4 md:px-0 custom-scrollbar" onTouchMove={touchDrag ? handleTouchMove : undefined} onTouchEnd={touchDrag ? handleTouchEnd : undefined}>
          <div className="flex flex-row gap-6 min-w-max md:min-w-[1240px] h-full items-start px-4 md:px-0">
            {COLUMN_CONFIG.map(column => {
              const columnLeads = filteredLeads.filter(l => l.status === column.id);
              const columnTotalValue = getColumnTotal(column.id);

              return (
                <div
                  key={column.id}
                  data-column-id={column.id}
                  className={`flex flex-col w-[85vw] md:w-[320px] shrink-0 h-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden transition-all duration-300 shadow-2xl ${touchDrag && touchDrag.lead.status !== column.id ? 'bg-white/5 scale-[1.02] ring-2 ring-lime-500/50' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className={`p-4 border-b-2 ${column.color} bg-black/20 flex flex-col gap-3 group/header shrink-0 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center justify-between relative z-10 mb-2">
                      {editingColumnId === column.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            autoFocus
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={() => saveColumnTitle(column.id)}
                            className="bg-black/40 border border-lime-500/50 rounded px-2 py-1 text-sm font-bold text-white w-full outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/title cursor-pointer w-full" onClick={() => startEditingColumn(column.id, columnTitles[column.id])}>
                          <h3 className="font-bold text-zinc-200 tracking-wide font-display text-sm">{columnTitles[column.id]}</h3>
                          <Pencil size={12} className="text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                        </div>
                      )}
                      <span className="bg-zinc-800 border border-white/5 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-400">{columnLeads.length}</span>
                    </div>
                    <div className="flex items-center justify-between w-full relative z-10 mt-2">
                      <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5 relative z-10 self-start">
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={14} className="text-lime-500" />
                          <span className="text-xs font-bold text-lime-400 font-display tracking-wide">{formatCurrencyShort(columnTotalValue)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleBulkWhatsApp(column.id)}
                        className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-green-500/20 shadow-sm"
                        title="Enviar Mensagem em Massa"
                      >
                        <Send size={12} />
                        Massa
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {columnLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className="bg-[#0c121a] border border-white/5 hover:border-lime-500/30 p-5 rounded-2xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-[0_8px_30px_rgba(163,230,53,0.1)] group relative active:scale-95 touch-manipulation hover:-translate-y-1"
                      >
                        {isStagnant(lead.updatedAt) && (
                          <div className="absolute -top-3 -right-3 bg-red-600/90 text-white px-2.5 py-1 rounded-lg border border-red-400/50 z-10 shadow-lg shadow-red-500/20 flex items-center gap-1.5 animate-pulse" title="Lead estagnado (+7 dias)">
                            <AlertTriangle size={12} />
                            <span className="text-[10px] font-bold tracking-wide">+7 dias sem contato</span>
                          </div>
                        )}
                        <div
                          className="lg:hidden absolute top-0 left-0 bottom-0 w-12 flex items-center justify-center text-zinc-600 active:text-lime-400 z-20"
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, lead); }}
                        >
                          <GripVertical size={20} />
                        </div>

                        <div className="flex justify-between items-start mb-3 pl-6 lg:pl-0">
                          <div className="flex-1 min-w-0 pr-6">
                            <h4 className="font-bold text-zinc-100 truncate text-[15px] mb-1.5 tracking-tight group-hover:text-lime-400 transition-colors">{lead.name}</h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                              <MapPin size={12} /> {lead.city}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4 pl-6 lg:pl-0">
                          <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 transition-colors group-hover:bg-black/60">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Consumo</p>
                            <p className="text-xs font-display font-semibold text-zinc-300">{lead.monthlyConsumption} kWh</p>
                          </div>
                          <div className="bg-lime-500/5 rounded-xl p-2.5 border border-lime-500/10 transition-colors group-hover:bg-lime-500/10">
                            <p className="text-[9px] text-lime-600/80 uppercase font-bold tracking-wider mb-0.5">Valor Agregado</p>
                            <p className="text-xs font-display font-bold text-lime-400">R$ {(lead.value / 1000).toFixed(0)}k</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 pl-6 lg:pl-0">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 border border-white/10 shadow-sm">
                              {lead.assignee?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] text-zinc-600 font-medium bg-zinc-900/50 px-2 py-0.5 rounded-md">
                              Atualizado {new Date(lead.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSmartWhatsApp(lead); }}
                            className="text-green-500 hover:text-white bg-green-500/10 hover:bg-green-500 p-2 rounded-xl transition-all shadow-sm"
                            title="Chamar no WhatsApp"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // --- LIST VIEW (TABLE) ---
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden animate-enter">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Última Atualização</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-bold text-white">
                      {lead.name}
                      {isStagnant(lead.updatedAt) && <span className="ml-2 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Atenção</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${lead.status === 'Lead' ? 'bg-blue-500/10 text-blue-400' :
                        lead.status === 'Qualificacao' ? 'bg-yellow-500/10 text-yellow-400' :
                          lead.status === 'Proposta' ? 'bg-purple-500/10 text-purple-400' : 'bg-lime-500/10 text-lime-400'
                        }`}>
                        {columnTitles[lead.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{lead.city}</td>
                    <td className="px-6 py-4 text-lime-400 font-bold font-display">R$ {lead.value.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(lead.updatedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSmartWhatsApp(lead); }}
                          className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                        >
                          <Send size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, lead.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-Over Detail Panel */}
      {selectedLead && (
        <LeadDetailsPanel
          selectedLead={selectedLead}
          isEditing={isEditing}
          editingData={editFormData}
          columnTitles={columnTitles}
          aiProposal={aiProposal}
          isGeneratingAI={isGeneratingAI}
          isCopied={isCopied}
          onClose={() => setSelectedLead(null)}
          onEditToggle={() => setIsEditing(true)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
          onDataChange={(data) => setEditFormData({ ...editFormData, ...data })}
          onGenerateAI={generateAIProposal}
          onCopyAI={copyToClipboard}
          onClearAI={() => setAiProposal('')}
          onWhatsApp={handleSmartWhatsApp}
          columnsConfig={COLUMN_CONFIG}
        />
      )}

      {/* New Lead Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-8 border border-white/10 shadow-2xl animate-enter">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white font-display">Novo Lead</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Cliente</label>
                <input type="text" placeholder="Nome da Empresa / Cliente" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
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
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Energia</label>
                  <input type="number" placeholder="kWh/mês" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.consumption} onChange={e => setFormData({ ...formData, consumption: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Orçamento</label>
                  <input type="number" placeholder="R$ Estimado" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsFormOpen(false)} className="flex-1 py-4 text-zinc-400 hover:text-white font-medium transition-colors">Cancelar</button>
              <button onClick={submitNewLead} className="flex-1 btn-primary py-4 rounded-xl shadow-lg active:scale-95">Salvar Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;