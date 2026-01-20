import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Search, X, Clock, Send, Edit2, Trash2, Save, Sparkles, Copy, Check, Loader2, Pencil, DollarSign } from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { useApp } from '../contexts/AppContext';
import { ai } from '../lib/ai';

// Configuração base das colunas (IDs e Cores fixos, Labels editáveis)
const COLUMN_CONFIG: { id: LeadStatus; defaultLabel: string; color: string }[] = [
  { id: 'Lead', defaultLabel: 'Novos Leads', color: 'border-blue-500' },
  { id: 'Qualificacao', defaultLabel: 'Em Qualificação', color: 'border-yellow-500' },
  { id: 'Proposta', defaultLabel: 'Proposta Enviada', color: 'border-purple-500' },
  { id: 'Fechado', defaultLabel: 'Fechado / Ganho', color: 'border-lime-500' },
];

const CRM: React.FC = () => {
  const { leads, updateLeadStatus, addLead, addLeadLog, updateLead, deleteLead } = useApp();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Custom Column Titles State (Persisted in LocalStorage)
  const [columnTitles, setColumnTitles] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('crm_column_titles');
    if (saved) return JSON.parse(saved);
    return COLUMN_CONFIG.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultLabel }), {});
  });
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  // AI States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProposal, setAiProposal] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // States for Editing Lead
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});
  
  // New Lead Form State
  const [formData, setFormData] = useState({ name: '', phone: '', value: '', city: '', consumption: '' });

  // Reset states when changing selected lead
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

  // --- Column Renaming Logic ---
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

  // --- Financial Calculation Logic ---
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

  const handleSmartWhatsApp = (lead: Lead) => {
    const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
    const message = aiProposal || `*${timeOfDay}, ${lead.name.split(' ')[0]}!*

Aqui é da *Quark Energia*. ⚡

Estive analisando o perfil energético da sua unidade em *${lead.city}* e preparei um estudo preliminar.

Para um consumo de ~${lead.monthlyConsumption} kWh, estimamos uma economia anual superior a *R$ ${(lead.monthlyConsumption * 0.9 * 12).toLocaleString('pt-BR')}*.

Podemos agendar uma breve apresentação da proposta?

Link da Proposta Digital: quark.energy/p/${lead.id}

Atenciosamente,
*Equipe Quark*`;

    addLeadLog(lead.id, 'Contato', 'WhatsApp enviado (Smart Link)');
    window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const generateAIProposal = async () => {
    if (!selectedLead) return;
    setIsGeneratingAI(true);
    try {
      const prompt = `
        Aja como um consultor de vendas sênior da Quark Energia (Especialista em Energia Solar Corporativa).
        Escreva uma mensagem curta, direta e altamente persuasiva para WhatsApp para o cliente abaixo.
        
        Dados do Cliente:
        - Nome: ${selectedLead.name}
        - Cidade: ${selectedLead.city}
        - Consumo Médio: ${selectedLead.monthlyConsumption} kWh
        - Valor Estimado do Projeto: R$ ${selectedLead.value}
        
        Estrutura da mensagem:
        1. Saudação cordial (sem ser robótica).
        2. "Gancho": Mencione que finalizou a análise de engenharia da unidade dele em ${selectedLead.city}.
        3. Benefício: Projeção de economia financeira direta (Use emojis de dinheiro/energia).
        4. Chamada para Ação (CTA): Perguntar o melhor horário para apresentar os números.
        
        Tom de voz: Profissional, confiante e parceiro.
        Formatação: Use negrito (*) para destacar números e pontos chave. Não use aspas na mensagem final.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      if (response.text) {
        setAiProposal(response.text.trim());
        addLeadLog(selectedLead.id, 'IA', 'Gerou proposta comercial personalizada');
      }
    } catch (error) {
      console.error("Erro ao gerar IA", error);
      alert("Não foi possível gerar a proposta. Verifique sua chave de API.");
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
     if (window.confirm("Atenção: A exclusão deste Lead é permanente. Deseja continuar?")) {
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
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
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
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20} strokeWidth={2.5} /> 
          <span>Novo Lead</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 -mx-4 md:mx-0 px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-6 md:min-w-[1200px] h-full">
          {COLUMN_CONFIG.map(column => {
            const columnLeads = filteredLeads.filter(l => l.status === column.id);
            const columnTotalValue = getColumnTotal(column.id);

            return (
              <div 
                key={column.id}
                className="flex-1 min-w-full md:min-w-[300px] flex flex-col group/col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`flex flex-col p-4 rounded-t-2xl glass-panel border-t-2 ${column.color} mb-3 bg-zinc-900/40 group/header`}>
                  <div className="flex items-center justify-between mb-2">
                    {editingColumnId === column.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input 
                          autoFocus
                          type="text" 
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveColumnTitle(column.id)}
                          onBlur={() => saveColumnTitle(column.id)}
                          className="bg-black/40 border border-lime-500/50 rounded px-2 py-1 text-sm font-bold text-white w-full outline-none"
                        />
                        <button onClick={() => saveColumnTitle(column.id)} className="text-lime-400 hover:text-lime-300">
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title cursor-pointer w-full" onClick={() => startEditingColumn(column.id, columnTitles[column.id])}>
                        <h3 className="font-bold text-zinc-200 tracking-wide font-display text-sm">{columnTitles[column.id]}</h3>
                        <Pencil size={12} className="text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                      </div>
                    )}
                    
                    <span className="bg-zinc-800 border border-white/5 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-400">
                      {columnLeads.length}
                    </span>
                  </div>

                  {/* Financial Summary Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-white/5 self-start">
                    <DollarSign size={12} className="text-lime-500" />
                    <span className="text-xs font-bold text-lime-400 font-display tracking-wide">
                      {formatCurrencyShort(columnTotalValue)}
                    </span>
                  </div>
                </div>
                
                {/* Leads List */}
                <div className="flex-1 rounded-b-2xl space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[500px] md:max-h-none">
                  {columnLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className="glass-panel p-5 rounded-2xl cursor-pointer glass-card-hover group relative active:scale-95"
                    >
                      <button 
                        onClick={(e) => handleDelete(e, lead.id)}
                        className="absolute top-3 right-3 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className="font-bold text-white truncate text-base mb-1 tracking-tight">{lead.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                            <MapPin size={12} /> {lead.city}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                         <div className="bg-zinc-900/50 rounded-lg p-2 border border-white/5">
                           <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Consumo</p>
                           <p className="text-sm font-display font-semibold text-zinc-200">{lead.monthlyConsumption} kWh</p>
                         </div>
                         <div className="bg-zinc-900/50 rounded-lg p-2 border border-white/5">
                           <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Valor</p>
                           <p className="text-sm font-display font-semibold text-lime-400">{(lead.value / 1000).toFixed(0)}k</p>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-white/5">
                            {lead.assignee?.substring(0,2).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-zinc-600 font-medium">
                             {new Date(lead.updatedAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSmartWhatsApp(lead); }}
                          className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 p-2 rounded-lg transition-colors"
                          title="Enviar WhatsApp"
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

      {/* Slide-Over Detail Panel */}
      {selectedLead && (
        <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setSelectedLead(null)}></div>
        <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-[#09090b] border-l border-white/10 shadow-2xl z-[60] animate-enter flex flex-col">
          <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-900/50 backdrop-blur-md">
            <div className="flex-1 pr-4">
              {isEditing ? (
                 <input 
                   type="text" 
                   value={editFormData.name} 
                   onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                   className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xl font-bold text-white w-full mb-2 outline-none focus:border-lime-500"
                 />
              ) : (
                 <h2 className="text-2xl font-bold text-white mb-2 font-display tracking-tight">{selectedLead.name}</h2>
              )}
              
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs bg-lime-500/10 text-lime-400 border border-lime-500/10 font-bold uppercase tracking-wide">{selectedLead.status}</span>
                {isEditing ? (
                   <input 
                     type="text" 
                     value={editFormData.city} 
                     onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                     className="bg-zinc-800 border border-zinc-700 rounded p-1 text-xs text-white w-32 outline-none"
                   />
                ) : (
                   <span className="px-2.5 py-1 rounded-md text-xs bg-zinc-800 text-zinc-400 border border-white/5 font-medium">{selectedLead.city}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
               {!isEditing && (
                 <button onClick={() => setIsEditing(true)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={20} />
                 </button>
               )}
               {isEditing && (
                 <button onClick={handleSaveEdit} className="p-2 text-lime-400 hover:bg-lime-500/10 rounded-lg transition-colors" title="Salvar">
                    <Save size={20} />
                 </button>
               )}
               <button onClick={(e) => handleDelete(e)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                  <Trash2 size={20} />
               </button>
               <button onClick={() => setSelectedLead(null)} className="p-2 text-zinc-400 hover:text-white ml-2">
                 <X size={24} />
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* AI Assistant Section - NEW */}
            <div className="glass-panel p-5 rounded-2xl border border-lime-500/20 bg-gradient-to-b from-lime-900/5 to-transparent">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-lime-400" />
                  Quark AI Assistant
                </h3>
                {aiProposal && (
                  <button onClick={copyToClipboard} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                    {isCopied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                    {isCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>
              
              {!aiProposal ? (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-500 mb-4">Gere uma mensagem comercial persuasiva baseada nos dados deste lead.</p>
                  <button 
                    onClick={generateAIProposal}
                    disabled={isGeneratingAI}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-sm text-lime-400 font-bold transition-all flex justify-center items-center gap-2"
                  >
                    {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGeneratingAI ? 'Analisando Lead...' : 'Gerar Proposta Persuasiva'}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <textarea 
                    value={aiProposal}
                    onChange={(e) => setAiProposal(e.target.value)}
                    className="w-full h-40 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-zinc-300 focus:border-lime-500 outline-none resize-none leading-relaxed"
                  />
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => setAiProposal('')} 
                      className="flex-1 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-lg"
                    >
                      Descartar
                    </button>
                    <button 
                      onClick={() => handleSmartWhatsApp(selectedLead)}
                      className="flex-1 py-1.5 text-xs bg-green-500/20 text-green-400 border border-green-500/20 hover:bg-green-500/30 rounded-lg font-bold"
                    >
                      Usar no WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lead Info */}
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                 <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Telefone</label>
                 {isEditing ? (
                    <input 
                       type="text" 
                       value={editFormData.phone} 
                       onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                       className="bg-zinc-800 border border-zinc-700 rounded p-1 text-white w-full mt-1 outline-none"
                    />
                 ) : (
                    <p className="text-zinc-200 font-display text-lg mt-1">{selectedLead.phone}</p>
                 )}
               </div>
               <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                 <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Valor (R$)</label>
                 {isEditing ? (
                    <input 
                       type="number" 
                       value={editFormData.value} 
                       onChange={(e) => setEditFormData({...editFormData, value: Number(e.target.value)})}
                       className="bg-zinc-800 border border-zinc-700 rounded p-1 text-lime-400 w-full mt-1 outline-none"
                    />
                 ) : (
                    <p className="text-lime-400 font-display text-lg mt-1 font-bold">R$ {selectedLead.value.toLocaleString()}</p>
                 )}
               </div>
               <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 col-span-2">
                 <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Consumo (kWh)</label>
                 {isEditing ? (
                    <input 
                       type="number" 
                       value={editFormData.monthlyConsumption} 
                       onChange={(e) => setEditFormData({...editFormData, monthlyConsumption: Number(e.target.value)})}
                       className="bg-zinc-800 border border-zinc-700 rounded p-1 text-white w-full mt-1 outline-none"
                    />
                 ) : (
                    <p className="text-zinc-200 font-display text-lg mt-1">{selectedLead.monthlyConsumption} kWh</p>
                 )}
               </div>
            </div>

            {/* Audit Log / Timeline */}
            <div>
              <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <Clock size={16} className="text-lime-400" />
                Linha do Tempo
              </h3>
              <div className="relative border-l border-zinc-800 ml-2 space-y-8">
                {selectedLead.history.map((log) => (
                  <div key={log.id} className="ml-8 relative">
                    <div className="absolute -left-[37px] top-1.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-lime-500/50 shadow-[0_0_10px_rgba(163,230,53,0.2)]"></div>
                    <div className="flex flex-col">
                      <div className="flex justify-between items-baseline">
                         <p className="text-sm font-bold text-zinc-200">{log.action}</p>
                         <span className="text-[10px] text-zinc-600 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{log.details}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-400">
                            {log.author.substring(0,1)}
                         </div>
                         <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide">{log.author}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-white/10 bg-zinc-900/80">
             <button 
                onClick={() => handleSmartWhatsApp(selectedLead)}
                className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold transition-all shadow-lg shadow-lime-500/20 active:scale-95 flex justify-center gap-2"
             >
               <Send size={18} /> Iniciar Conversa WhatsApp
             </button>
          </div>
        </div>
        </>
      )}

      {/* New Lead Modal - KEEP EXISTING CONTENT */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-8 border border-white/10 shadow-2xl animate-enter">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-bold text-white font-display">Novo Lead</h2>
               <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Cliente</label>
                <input type="text" placeholder="Nome da Empresa / Cliente" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Contato</label>
                   <input type="text" placeholder="Telefone" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Local</label>
                   <input type="text" placeholder="Cidade" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Energia</label>
                  <input type="number" placeholder="kWh/mês" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.consumption} onChange={e => setFormData({...formData, consumption: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Orçamento</label>
                  <input type="number" placeholder="R$ Estimado" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
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