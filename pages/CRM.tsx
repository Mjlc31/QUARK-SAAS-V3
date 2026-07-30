import React, { useState, useEffect, useRef } from 'react';
import { Plus, MapPin, Search, X, Clock, Send, Edit2, Trash2, Save, Sparkles, Copy, Check, Loader2, Pencil, DollarSign, GripVertical, List, LayoutGrid, ChevronDown, Tag } from 'lucide-react';
import { Lead, LeadStatus, Pipeline } from '../types';
import { useApp } from '../contexts/AppContext';
import { ai } from '../lib/ai';
import { LeadDetailsPanel } from '../components/LeadDetailsPanel';
import { AIOCRInvoiceUploader } from '../components/AIOCRInvoiceUploader';
import { ExtractedInvoice } from '../services/aiOcrService';

const DEFAULT_STAGES = [
  { id: 'Lead', name: 'Novos Leads', color: 'border-blue-500', order: 0 },
  { id: 'Qualificacao', name: 'Em Qualificação', color: 'border-yellow-500', order: 1 },
  { id: 'Proposta', name: 'Proposta Enviada', color: 'border-purple-500', order: 2 },
  { id: 'Fechado', name: 'Fechado / Ganho', color: 'border-lime-500', order: 3 },
];

const CRM: React.FC = () => {
  const { leads, updateLeadStatus, addLead, addLeadLog, updateLead, deleteLead, pipelines, updateLeadPipelineStage, updatePipelineStages } = useApp();
  const [activePipelineId, setActivePipelineId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);
  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  // Default to list view on mobile
  const [viewMode, setViewMode] = useState<'board' | 'list'>(
    () => window.innerWidth < 768 ? 'list' : 'board'
  );

  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [touchDrag, setTouchDrag] = useState<{ id: string; x: number; y: number; width: number; height: number; lead: Lead } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentStages = activePipeline?.stages && activePipeline.stages.length > 0 
    ? [...activePipeline.stages].sort((a, b) => a.order - b.order) 
    : DEFAULT_STAGES;

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  const [isNewPipelineOpen, setIsNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProposal, setAiProposal] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});
  const [formData, setFormData] = useState({ name: '', phone: '', value: '', city: '', consumption: '' });
  const [rescueMode, setRescueMode] = useState(false);

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
    const updatedStages = currentStages.map(s => s.id === id ? { ...s, name: tempTitle } : s);
    if (activePipeline) {
      updatePipelineStages(activePipeline.id, updatedStages);
    }
    setEditingColumnId(null);
  };

  const deleteColumn = (id: string) => {
    const columnLeads = leads.filter(l => getLeadStageInPipeline(l) === id);
    if (columnLeads.length > 0) {
      alert("Você não pode excluir uma coluna que contém leads. Mova os leads primeiro.");
      return;
    }
    if (confirm("Tem certeza que deseja excluir esta coluna?")) {
      const updatedStages = currentStages.filter(s => s.id !== id);
      if (activePipeline) updatePipelineStages(activePipeline.id, updatedStages);
    }
  };

  const addColumn = () => {
    const newStage = {
      id: `stage-${Date.now()}`,
      name: 'Nova Coluna',
      color: 'border-zinc-500',
      order: currentStages.length
    };
    const updatedStages = [...currentStages, newStage];
    if (activePipeline) updatePipelineStages(activePipeline.id, updatedStages);
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
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const diff = new Date().getTime() - date.getTime();
    const days = diff / (1000 * 3600 * 24);
    return days >= 7;
  };

  const getNextActionStatus = (dateStr?: string) => {
    if (!dateStr) return 'missing';
    const actionDate = new Date(dateStr);
    actionDate.setHours(23, 59, 59, 999);
    const now = new Date();
    
    if (actionDate < now) return 'overdue';
    const diffDays = Math.ceil((actionDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 1) return 'today';
    return 'ok';
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
    
    const stageName = currentStages.find(s => s.id === status)?.name || status;
    alert(`Mensagem em massa enviada para ${leadsInColumn.length} leads na fase ${stageName} com sucesso!`);
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

  const handleOCRSuccess = (data: ExtractedInvoice) => {
    addLead({
      name: data.name,
      phone: '', // Necessário para completar depois
      city: '',
      value: 0,
      monthlyConsumption: data.monthlyConsumptionKwh
    });
    alert(`Lead de ${data.name} criado via IA com sucesso!`);
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
    await deleteLead(idToDelete);
    setSelectedLead(null);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    await useApp().addPipeline(newPipelineName, 'Geral', '#a3e635'); // defaulting to green for now
    setIsNewPipelineOpen(false);
    setNewPipelineName('');
  };

  // Determina o stage do lead no pipeline ativo
  const getLeadStageInPipeline = (lead: Lead): LeadStatus => {
    const entry = lead.pipelineEntries?.find(e => e.pipelineId === activePipelineId);
    return entry?.stage ?? lead.status;
  };

  const handlePipelineDrop = (e: React.DragEvent, stage: LeadStatus) => {
    e.preventDefault();
    if (draggedLead) {
      updateLeadPipelineStage(draggedLead, activePipelineId, stage);
      setDraggedLead(null);
    }
  };

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const finalLeads = (rescueMode ? filteredLeads.filter(l => isStagnant(l.updatedAt)) : filteredLeads)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

  return (
    <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] flex flex-col relative animate-enter">

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
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

          {/* Pipeline Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900/70 text-sm font-bold text-white hover:bg-zinc-800 transition-all"
              style={{ borderColor: activePipeline ? `${activePipeline.color}40` : undefined }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePipeline?.color ?? '#a3e635' }} />
              <span>Pipeline: {activePipeline?.name ?? 'Geral'}</span>
              <ChevronDown size={14} className="text-zinc-400" />
            </button>
            {showPipelineDropdown && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[200px] animate-enter">
                {pipelines.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setActivePipelineId(p.id); setShowPipelineDropdown(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors text-left ${
                      p.id === activePipelineId ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
                <div className="h-px bg-white/10 my-1 mx-2"></div>
                <button
                  onClick={() => { setShowPipelineDropdown(false); setIsNewPipelineOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-lime-400 hover:bg-lime-500/10 transition-colors text-left"
                >
                  <Plus size={14} className="shrink-0" />
                  Nova Pipeline
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] md:min-w-[280px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar lead..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Modo Resgate */}
          <button
            onClick={() => setRescueMode(!rescueMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${rescueMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800'}`}
            title="Leads parados há +7 dias"
          >
            <Clock size={16} />
            <span className="hidden md:inline">Modo Resgate</span>
          </button>

          {/* View Toggle */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex">
            <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Quadro"><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Lista"><List size={18} /></button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <AIOCRInvoiceUploader onSuccess={handleOCRSuccess} />
          
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95 w-full sm:w-auto justify-center"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      {viewMode === 'board' ? (
        // --- BOARD VIEW (KANBAN) ---
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-4 md:mx-0 px-4 md:px-0 custom-scrollbar snap-x-mandatory" onTouchMove={touchDrag ? handleTouchMove : undefined} onTouchEnd={touchDrag ? handleTouchEnd : undefined}>
          <div className="flex flex-row gap-4 md:gap-6 min-w-max md:min-w-[1240px] h-full items-start px-1 md:px-0">
            {currentStages.map(column => {
              const columnLeads = finalLeads.filter(l => getLeadStageInPipeline(l) === column.id);
              const columnTotalValue = columnLeads.reduce((acc, l) => acc + l.value, 0);

              return (
                <div
                  key={column.id}
                  data-column-id={column.id}
                  className={`flex flex-col w-[88vw] md:w-[320px] shrink-0 h-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden transition-all duration-300 shadow-2xl ${touchDrag && touchDrag.lead.status !== column.id ? 'bg-white/5 scale-[1.02] ring-2 ring-lime-500/50' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handlePipelineDrop(e, column.id)}
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
                            onKeyDown={(e) => e.key === 'Enter' && saveColumnTitle(column.id)}
                            className="bg-black/40 border border-lime-500/50 rounded px-2 py-1 text-sm font-bold text-white w-full outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/title cursor-pointer w-full" onClick={() => startEditingColumn(column.id, column.name)}>
                          <h3 className="font-bold text-zinc-200 tracking-wide font-display text-sm truncate max-w-[200px]">{column.name}</h3>
                          <Pencil size={12} className="text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                          <button onClick={(e) => { e.stopPropagation(); deleteColumn(column.id); }} className="text-rose-500/50 hover:text-rose-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 ml-auto" title="Excluir Coluna">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                      <span className="bg-zinc-800 border border-white/5 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-400 shrink-0 ml-2">{columnLeads.length}</span>
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
                    {columnLeads.length === 0 && (
                      <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 gap-2">
                        <div className="p-2 bg-white/5 rounded-full">
                          <LayoutGrid size={20} className="opacity-20" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider">Fase Vazia</p>
                      </div>
                    )}
                    {columnLeads.map(lead => {
                      const nextActionStatus = getNextActionStatus(lead.nextActionDate);
                      const isLost = lead.status === 'Perdido';
                      const cardBorder = 
                        isLost ? 'border-red-500/50 opacity-60' :
                        nextActionStatus === 'missing' || nextActionStatus === 'overdue' 
                        ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                        : 'border-white/5 hover:border-lime-500/30 hover:shadow-[0_8px_30px_rgba(163,230,53,0.1)]';

                      return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className={`bg-[#0c121a] border p-5 rounded-2xl cursor-pointer transition-all duration-200 shadow-lg group relative active:scale-95 touch-manipulation hover:-translate-y-1 ${cardBorder}`}
                      >
                        <div
                          className="lg:hidden absolute top-0 left-0 bottom-0 w-12 flex items-center justify-center text-zinc-600 active:text-lime-400 z-20"
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, lead); }}
                        >
                          <GripVertical size={20} />
                        </div>

                        <div className="flex justify-between items-start mb-3 pl-6 lg:pl-0">
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-1.5">
                               <h4 className="font-bold text-zinc-100 truncate text-[15px] tracking-tight group-hover:text-lime-400 transition-colors">{lead.name}</h4>
                               {isStagnant(lead.updatedAt) && (
                                 <div className="flex items-center gap-1 text-[9px] text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10 shrink-0" title="Lead frio (+7 dias)">
                                   <Clock size={10} />
                                   <span>7d inativo</span>
                                 </div>
                               )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                              <MapPin size={12} /> {lead.city}
                            </div>
                            {/* Tags badges */}
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {lead.tags.map(tag => (
                                  <span key={tag.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}30` }}>
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
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

                        {/* Next Action Indicator */}
                        <div className="pl-6 lg:pl-0 mb-3">
                          {nextActionStatus === 'missing' && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-1.5 rounded flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                              <b>Ação Pendente!</b> Agende o próximo passo.
                            </div>
                          )}
                          {nextActionStatus === 'overdue' && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-1.5 rounded flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                <b>Atrasado:</b> {lead.nextActionType || 'Ação'}
                              </div>
                              <span>{new Date(lead.nextActionDate!).toLocaleDateString()}</span>
                            </div>
                          )}
                          {nextActionStatus === 'today' && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2 py-1.5 rounded flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                <b>Hoje:</b> {lead.nextActionType || 'Ação'}
                              </div>
                            </div>
                          )}
                          {nextActionStatus === 'ok' && (
                            <div className="bg-zinc-800/50 border border-white/5 text-zinc-400 text-[10px] px-2 py-1.5 rounded flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-lime-500 rounded-full"></span>
                                {lead.nextActionType || 'Próximo passo'}
                              </div>
                              <span>{new Date(lead.nextActionDate!).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 pl-6 lg:pl-0 border-t border-white/5">
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Add Column Button */}
            <div className="flex flex-col w-[88vw] md:w-[320px] shrink-0 h-full justify-start mt-2 px-4 md:px-0">
              <button 
                onClick={addColumn}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/10 hover:border-lime-500/50 rounded-2xl text-zinc-500 hover:text-lime-400 font-bold transition-all bg-black/20 hover:bg-lime-500/5"
              >
                <Plus size={18} />
                Nova Fase
              </button>
            </div>
          </div>
        </div>
      ) : (
        // --- LIST VIEW - Mobile-first cards ---
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden animate-enter">
          <div className="divide-y divide-white/5">
            {finalLeads.length === 0 && (
              <div className="py-16 text-center text-zinc-600">
                <p className="text-sm">Nenhum lead encontrado.</p>
              </div>
            )}
            {finalLeads.map(lead => {
              const stage = lead.status;
              const stageData = currentStages.find(s => s.id === stage);
              const isLost = stage === 'Perdido';
              const stageColor = isLost ? 'bg-red-500/10 text-red-400 border-red-500/20' : `bg-white/5 text-zinc-300 border-white/10`; // fallback
              const stageLabel = stageData ? stageData.name : (isLost ? 'Perdido' : stage);
                
              const nextActionStatus = getNextActionStatus(lead.nextActionDate);
              const listBg = 
                isLost ? 'bg-red-500/5' :
                nextActionStatus === 'missing' || nextActionStatus === 'overdue' 
                ? 'bg-red-500/10 border-l-2 border-l-red-500' 
                : 'hover:bg-white/5 border-l-2 border-l-transparent';

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`flex items-center gap-3 px-4 py-3.5 active:bg-white/10 transition-colors cursor-pointer group ${listBg}`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[13px] font-bold text-zinc-300 border border-white/5 shrink-0">
                    {lead.name.substring(0, 2).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm text-white truncate">{lead.name}</span>
                      {isStagnant(lead.updatedAt) && (
                        <div className="flex items-center gap-0.5 text-[9px] text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10 shrink-0">
                          <Clock size={9} /><span>7d</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${stageColor}`}>
                        {stageLabel}
                      </span>
                      {lead.city && <span className="text-[11px] text-zinc-500 truncate">{lead.city}</span>}
                    </div>
                  </div>
                  {/* Value + WhatsApp */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold font-display text-lime-400 whitespace-nowrap">
                      R$ {(lead.value / 1000).toFixed(0)}k
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSmartWhatsApp(lead); }}
                      className="p-1.5 text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors active:scale-90"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-Over Detail Panel */}
      {selectedLead && (
        <LeadDetailsPanel
          selectedLead={selectedLead}
          isEditing={isEditing}
          editingData={editFormData}
          stages={currentStages}
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

      {/* New Pipeline Modal */}
      {isNewPipelineOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl animate-enter">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white font-display">Nova Pipeline</h2>
              <button onClick={() => setIsNewPipelineOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Nome da Pipeline</label>
                <input type="text" placeholder="Ex: Vendas B2B" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsNewPipelineOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white font-medium transition-colors">Cancelar</button>
              <button onClick={handleCreatePipeline} className="flex-1 btn-primary py-3 rounded-xl shadow-lg active:scale-95">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;