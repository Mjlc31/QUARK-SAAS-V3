import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, Sparkles, Copy, Check, Loader2, Clock, Send, Tag, Building2, User, ChevronDown, Activity, Bot, Flame, MessageCircle, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface Opportunity {
  id: string;
  account_id?: string;
  contact_id?: string;
  title: string;
  status: string;
  amount: number;
  city?: string;
  phone?: string;
  created_at?: string;
}

interface AgentNote {
  id: string;
  entity_type: string;
  entity_id: string;
  note: string;
  created_by_ai: boolean;
  created_at: string;
}

interface OpportunityTask {
  id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  created_at: string;
}

interface OpportunityDetailsPanelProps {
  opportunity: Opportunity;
  stages: any[];
  onClose: () => void;
  onSave: (opp: Partial<Opportunity>) => void;
  onDelete: (id: string) => void;
}

export const OpportunityDetailsPanel: React.FC<OpportunityDetailsPanelProps> = ({
  opportunity,
  stages,
  onClose,
  onSave,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'detalhes' | 'copilot' | 'whatsapp'>('detalhes');
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<Partial<Opportunity>>(opportunity);
  const [agentNotes, setAgentNotes] = useState<AgentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [tasks, setTasks] = useState<OpportunityTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);

  const leadScore = Math.min(100, Math.max(10, Math.floor((opportunity.amount || 0) / 1000) + 40));
  const isHotLead = leadScore >= 80;

  const mockWhatsAppMessages = [
    { id: 1, type: 'in', text: 'Olá, gostaria de saber mais sobre os serviços de vocês.', time: '10:30' },
    { id: 2, type: 'out', text: 'Olá! Claro, como podemos ajudar? O que você busca no momento?', time: '10:35' },
    { id: 3, type: 'in', text: 'Estou buscando uma solução para minha empresa.', time: '10:42' },
  ];

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchWhatsappMessages();
    }
  }, [activeTab, opportunity.phone]);

  const fetchWhatsappMessages = async () => {
    if (!opportunity.phone) return;
    const cleanPhone = opportunity.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .like('chat_id', `${cleanPhone}%`)
      .order('timestamp', { ascending: true });
    
    if (data && data.length > 0) {
      setWhatsappMessages(data.map(m => ({
        id: m.id,
        type: m.from_user === 'me' ? 'out' : 'in',
        text: m.body,
        time: new Date(m.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      })));
    } else {
      setWhatsappMessages([]);
    }
  };

  const handleSendWhatsapp = async () => {
    if (!whatsappInput.trim() || !opportunity.phone) return;
    setSendingMsg(true);
    try {
      const cleanPhone = opportunity.phone.replace(/\D/g, '');
      const response = await fetch('http://localhost:8082/message/sendText/quark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'quark_senha_secreta_123'
        },
        body: JSON.stringify({
          number: cleanPhone,
          textMessage: { text: whatsappInput }
        })
      });
      if (response.ok) {
        setWhatsappInput('');
        setTimeout(fetchWhatsappMessages, 1000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchTasks();
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

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('opportunity_tasks')
      .select('*')
      .eq('opportunity_id', opportunity.id)
      .order('due_date', { ascending: true });
    if (data) setTasks(data);
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskToInsert = {
      opportunity_id: opportunity.id,
      title: newTaskTitle,
      due_date: newTaskDate ? new Date(newTaskDate).toISOString() : null,
      is_completed: false
    };

    const { error } = await supabase.from('opportunity_tasks').insert([taskToInsert]);
    if (!error) {
      setNewTaskTitle('');
      setNewTaskDate('');
      fetchTasks();
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('opportunity_tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', taskId);
    
    if (!error) fetchTasks();
  };

  const generateAIInsight = async () => {
    setIsGeneratingAI(true);
    // Simulate AI generation or use real API
    setTimeout(async () => {
      const insight = `Baseado no perfil de ${opportunity.title}, a probabilidade de fechamento é alta. Sugiro enviar um case de sucesso focado em economia de energia na região.`;
      
      const noteToInsert = {
        entity_type: 'opportunity',
        entity_id: opportunity.id,
        note: insight,
        created_by_ai: true
      };
      
      const { data } = await supabase.from('agent_notes').insert([noteToInsert]).select();
      if (data) {
        setAgentNotes(prev => [data[0], ...prev]);
        setAiInsight(insight);
      }
      setIsGeneratingAI(false);
    }, 1500);
  };

  const handleSave = () => {
    onSave(editingData);
    setIsEditing(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full md:w-[700px] bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-[60] animate-enter flex flex-col">
        
        {/* Header - Agentic Style */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-lime-500/10 to-transparent flex justify-between items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          
          <div className="flex-1 pr-4 relative z-10">
            {isEditing ? (
              <input
                type="text"
                value={editingData.title || ''}
                onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                className="bg-zinc-900 border border-zinc-700 rounded p-2 text-2xl font-bold text-white w-full mb-2 outline-none focus:border-lime-500"
              />
            ) : (
              <h2 className="text-3xl font-bold text-white mb-2 font-display tracking-tight flex items-center gap-3">
                {opportunity.title}
              </h2>
            )}

            <div className="flex gap-2 flex-wrap items-center mt-3">
              {isEditing ? (
                <select
                  value={editingData.status || ''}
                  onChange={(e) => setEditingData({ ...editingData, status: e.target.value })}
                  className="bg-zinc-900 border border-zinc-700 rounded p-1 text-xs text-lime-400 font-bold uppercase outline-none"
                >
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs bg-lime-500/10 text-lime-400 border border-lime-500/20 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={12} /> {stages.find(s => s.id === opportunity.status)?.name || opportunity.status}
                </span>
              )}
              <span className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 font-bold font-mono">
                R$ {opportunity.amount?.toLocaleString('pt-BR') || 0}
              </span>

              {/* AI Lead Score */}
              <span className={`px-3 py-1.5 rounded-lg text-xs border font-bold flex items-center gap-1.5 ${isHotLead ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`} title="AI Lead Score">
                {isHotLead ? <Flame size={12} className="animate-pulse" /> : <Bot size={12} />}
                Score: {leadScore}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Edit2 size={18} /></button>
            ) : (
              <button onClick={handleSave} className="p-2.5 text-black bg-lime-500 hover:bg-lime-400 rounded-xl transition-all shadow-lg shadow-lime-500/20"><Save size={18} /></button>
            )}
            <button onClick={() => onDelete(opportunity.id)} className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
            <button onClick={onClose} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-2"><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 bg-black/20 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('detalhes')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide border-b-2 transition-all whitespace-nowrap ${activeTab === 'detalhes' ? 'border-lime-500 text-lime-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            <User size={16} /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('copilot')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide border-b-2 transition-all whitespace-nowrap ${activeTab === 'copilot' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            <Bot size={16} /> Agent Copilot
          </button>
          <button onClick={() => setActiveTab('whatsapp')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide border-b-2 transition-all whitespace-nowrap ${activeTab === 'whatsapp' ? 'border-green-500 text-green-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button onClick={() => setActiveTab('tarefas')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide border-b-2 transition-all whitespace-nowrap ${activeTab === 'tarefas' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            <CheckCircle size={16} /> Tarefas
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/40">
          {activeTab === 'detalhes' && (
            <div className="space-y-8 animate-enter">
              {/* KPIs / Edit Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">Valor da Oportunidade</label>
                  {isEditing ? (
                    <input type="number" value={editingData.amount || ''} onChange={(e) => setEditingData({ ...editingData, amount: Number(e.target.value) })} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white w-full outline-none" />
                  ) : (
                    <p className="text-xl font-display font-bold text-white">R$ {opportunity.amount?.toLocaleString('pt-BR') || 0}</p>
                  )}
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">Contato Primário</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input type="text" placeholder="Telefone" value={editingData.phone || ''} onChange={(e) => setEditingData({ ...editingData, phone: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white w-full outline-none text-sm" />
                      <input type="text" placeholder="Cidade" value={editingData.city || ''} onChange={(e) => setEditingData({ ...editingData, city: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white w-full outline-none text-sm" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-zinc-300">Telefone: {opportunity.phone || 'Não informado'}</p>
                      <p className="text-sm font-medium text-zinc-300 mt-1">Cidade: {opportunity.city || 'Não informada'}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline (Agent Notes) */}
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock size={16} className="text-lime-400" /> Histórico & Timeline</h3>
                
                <form onSubmit={handleAddNote} className="mb-6 flex gap-3">
                  <input type="text" placeholder="Registrar uma nota manual..." 
                    className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-lime-500 transition-all"
                    value={newNote} onChange={e => setNewNote(e.target.value)} />
                  <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-5 font-bold transition-all"><Send size={16}/></button>
                </form>
                
                <div className="relative border-l-2 border-white/10 ml-4 space-y-6 pb-4">
                  {agentNotes.map((note) => (
                    <div key={note.id} className="ml-8 relative group">
                      {note.created_by_ai ? (
                        <div className="absolute -left-[43px] top-0 w-7 h-7 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                          <Bot size={12} className="text-purple-400" />
                        </div>
                      ) : (
                        <div className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-lime-500 shadow-[0_0_10px_rgba(163,230,53,0.3)]"></div>
                      )}
                      
                      <div className={`p-4 rounded-2xl border ${note.created_by_ai ? 'bg-purple-500/5 border-purple-500/20' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${note.created_by_ai ? 'text-purple-400' : 'text-zinc-500'}`}>
                            {note.created_by_ai ? 'Agent Insight' : 'Nota'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className={`text-sm leading-relaxed ${note.created_by_ai ? 'text-purple-100 font-medium' : 'text-zinc-300'}`}>{note.note}</p>
                      </div>
                    </div>
                  ))}
                  {agentNotes.length === 0 && (
                    <p className="ml-8 text-sm text-zinc-500 italic">Nenhum registro ainda na timeline.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'copilot' && (
            <div className="space-y-6 animate-enter h-full flex flex-col">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30">
                    <Sparkles size={24} className="text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Quark Agent Copilot</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                    O Copilot analisa os dados da oportunidade e o histórico da timeline para gerar insights acionáveis, sugerir próximos passos e criar drafts de e-mails/mensagens persuasivas.
                  </p>
                  
                  <button 
                    onClick={generateAIInsight}
                    disabled={isGeneratingAI}
                    className="mt-8 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingAI ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                    {isGeneratingAI ? 'Analisando contexto...' : 'Gerar Insight Estratégico'}
                  </button>
                </div>
              </div>

              {aiInsight && (
                <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 relative">
                  <h4 className="text-sm font-bold text-purple-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} /> Último Insight Gerado
                  </h4>
                  <p className="text-zinc-200 text-sm leading-relaxed">{aiInsight}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6 animate-enter h-full flex flex-col">
              <div className="flex-1 overflow-y-auto bg-zinc-900/30 rounded-3xl border border-white/5 p-4 flex flex-col gap-4 custom-scrollbar">
                {(whatsappMessages.length > 0 ? whatsappMessages : mockWhatsAppMessages).map((msg: any) => (
                  <div key={msg.id} className={`flex w-full ${msg.type === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${msg.type === 'out' ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-[10px] text-white/50 block text-right mt-1 font-mono">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 relative mt-auto">
                <input 
                  type="text" 
                  placeholder="Digite uma mensagem..." 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-white focus:border-green-500 outline-none transition-all placeholder-zinc-600" 
                  value={whatsappInput}
                  onChange={e => setWhatsappInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendWhatsapp()}
                />
                <button 
                  onClick={handleSendWhatsapp}
                  disabled={sendingMsg}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                >
                  {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tarefas' && (
            <div className="space-y-6 animate-enter h-full flex flex-col">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-orange-400" /> Tarefas e Follow-ups
              </h3>
              
              <form onSubmit={handleAddTask} className="flex gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <input 
                  type="text" 
                  placeholder="Ex: Ligar para o cliente amanhã..." 
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-orange-500 transition-all"
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                />
                <input 
                  type="date" 
                  className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-400 outline-none focus:border-orange-500 transition-all"
                  value={newTaskDate} 
                  onChange={e => setNewTaskDate(e.target.value)} 
                />
                <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-5 font-bold transition-all flex items-center gap-2">
                  <Check size={16} /> Adicionar
                </button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 mt-4">
                {tasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${task.is_completed ? 'bg-zinc-900/50 border-white/5 opacity-50' : 'bg-white/5 border-white/10 hover:border-orange-500/30'}`}>
                    <button 
                      onClick={() => handleToggleTask(task.id, task.is_completed)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.is_completed ? 'bg-orange-500 border-orange-500' : 'border-zinc-500 hover:border-orange-500'}`}
                    >
                      {task.is_completed && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle size={32} className="mx-auto text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">Nenhuma tarefa agendada.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
