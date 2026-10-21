import React, { useState, useEffect } from 'react';
import { Headphones, Plus, MessageSquare, X, Send, LogOut, ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { usePortal } from '../../contexts/PortalContext';

const PortalTickets: React.FC = () => {
  const navigate = useNavigate();
  const { client, logout } = usePortal();
  const [filter, setFilter] = useState('Todos');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Inversor Parou / Falha de Geração');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newDescription, setNewDescription] = useState('');

  // Sincroniza chamados reais do cliente (sem tickets fictícios/dummy)
  useEffect(() => {
    async function loadTickets() {
      setIsLoading(true);
      const mergedTickets: any[] = [];
      const clientId = client?.id;
      const clientName = client?.name?.trim().toLowerCase();

      // 1. Carrega chamados salvos localmente vinculados a ESTE cliente
      try {
        const localTicketsRaw = localStorage.getItem('quark_support_tickets');
        const msgsRaw = localStorage.getItem('quark_ticket_messages');
        const msgsMap = msgsRaw ? JSON.parse(msgsRaw) : {};

        if (localTicketsRaw) {
          const localList = JSON.parse(localTicketsRaw);
          const clientLocalTickets = localList.filter((t: any) => {
            if (clientId && t.client_id === clientId) return true;
            if (clientName && t.client_name && t.client_name.trim().toLowerCase() === clientName) return true;
            return false;
          });

          clientLocalTickets.forEach((t: any) => {
            const ticketMsgs = msgsMap[t.id] || msgsMap[t.realId] || [];
            mergedTickets.push({
              id: t.id.length > 8 ? t.id.substring(0, 8).toUpperCase() : t.id,
              realId: t.id,
              subject: t.subject,
              category: t.category ? (t.category.charAt(0).toUpperCase() + t.category.slice(1)) : 'Suporte',
              priority: t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) : 'Normal',
              status: t.status === 'resolvido' || t.status === 'fechado' ? 'Resolvido' : 'Aberto',
              date: t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hoje',
              messages: ticketMsgs.length > 0 
                ? ticketMsgs.map((m: any) => ({
                    sender: m.sender_type || 'client',
                    text: m.message,
                    time: m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Agora'
                  }))
                : [
                    {
                      sender: 'client',
                      text: t.description || 'Chamado registrado pelo portal.',
                      time: 'Aberto'
                    }
                  ]
            });
          });
        }
      } catch (e) {}

      // 2. Busca do Supabase e da API filtrando exclusivamente por este cliente
      try {
        if (clientId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
          if (isUuid) {
            const { data: remoteTickets } = await supabase
              .from('support_tickets')
              .select('*')
              .eq('client_id', clientId)
              .order('created_at', { ascending: false });

            if (remoteTickets && remoteTickets.length > 0) {
              remoteTickets.forEach((t: any) => {
                if (!mergedTickets.some(m => m.realId === t.id)) {
                  mergedTickets.push({
                    id: t.id.substring(0, 8).toUpperCase(),
                    realId: t.id,
                    subject: t.subject,
                    category: t.category ? (t.category.charAt(0).toUpperCase() + t.category.slice(1)) : 'Suporte',
                    priority: t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) : 'Normal',
                    status: t.status === 'resolvido' ? 'Resolvido' : 'Aberto',
                    date: new Date(t.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }),
                    messages: [
                      {
                        sender: 'client',
                        text: t.description || 'Chamado registrado pelo portal.',
                        time: new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                      },
                    ],
                  });
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('[PortalTickets] Erro ao sincronizar tickets com Supabase:', err);
      }

      setTickets(mergedTickets);
      setIsLoading(false);
    }

    loadTickets();
  }, [client?.id, client?.name]);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newDescription.trim()) return;

    const shortId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const optimisticTicket = {
      id: shortId,
      realId: shortId,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'Aberto',
      date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }),
      messages: [
        { sender: 'client', text: newDescription, time: timeFormatted }
      ]
    };

    setTickets([optimisticTicket, ...tickets]);
    setIsModalOpen(false);

    // Salva no armazenamento compartilhado com o painel interno TicketAdmin.tsx
    try {
      const catMap: Record<string, string> = {
        'Inversor Parou / Falha de Geração': 'manutencao',
        'Manutenção Preventiva': 'manutencao',
        'Limpeza de Painéis': 'limpeza',
        'Dúvida sobre Fatura': 'financeiro',
        'Vistoria & Homologação': 'homologacao',
      };
      const resolvedCategory = catMap[newCategory] || 'outros';
      const resolvedPriority = newCategory.includes('Inversor') ? 'urgente' : newPriority.toLowerCase();

      const newTicketRecord = {
        id: shortId,
        client_id: client?.id || 'cli_portal',
        client_name: client?.name || 'Cliente Portal',
        subject: newSubject,
        description: newDescription,
        category: resolvedCategory,
        priority: resolvedPriority,
        status: 'aberto',
        created_at: nowIso,
        updated_at: nowIso
      };

      const existingRaw = localStorage.getItem('quark_support_tickets');
      const existingList = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem('quark_support_tickets', JSON.stringify([newTicketRecord, ...existingList]));

      const initialMsg = {
        id: `msg-${Date.now()}`,
        ticket_id: shortId,
        sender_type: 'client',
        message: newDescription,
        attachments: [],
        created_at: nowIso
      };
      const msgsRaw = localStorage.getItem('quark_ticket_messages');
      const msgsMap = msgsRaw ? JSON.parse(msgsRaw) : {};
      msgsMap[shortId] = [initialMsg];
      localStorage.setItem('quark_ticket_messages', JSON.stringify(msgsMap));
      localStorage.setItem(`quark_ticket_messages_${shortId}`, JSON.stringify([initialMsg]));
    } catch (storageErr) {}

    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newSubject,
          description: newDescription,
          category: newCategory.toLowerCase(),
          priority: newPriority.toLowerCase(),
          client_id: client?.id || null,
          client_name: client?.name || 'Cliente Portal',
          client_email: client?.email,
          client_phone: client?.phone,
        }),
      });
    } catch (err) {
      console.warn('[PortalTickets] Erro ao sincronizar ticket com backend:', err);
    }

    setNewSubject('');
    setNewCategory('Inversor Parou / Falha de Geração');
    setNewPriority('Normal');
    setNewDescription('');
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const targetTicket = tickets.find((t: any) => t.id === ticketId);
    const backendTicketId = (targetTicket as any)?.realId || ticketId;

    setTickets((prev: any) =>
      prev.map((t: any) => {
        if (t.id === ticketId) {
          return {
            ...t,
            messages: [...t.messages, { sender: 'client', text, time }],
          };
        }
        return t;
      })
    );
    setReplyText('');

    // Salva no armazenamento compartilhado com o painel interno
    try {
      const msgsRaw = localStorage.getItem('quark_ticket_messages');
      const msgsMap = msgsRaw ? JSON.parse(msgsRaw) : {};
      const currentList = msgsMap[backendTicketId] || msgsMap[ticketId] || [];
      const newMsg = {
        id: `msg-${Date.now()}`,
        ticket_id: backendTicketId,
        sender_type: 'client',
        message: text,
        attachments: [],
        created_at: nowIso
      };
      msgsMap[backendTicketId] = [...currentList, newMsg];
      msgsMap[ticketId] = msgsMap[backendTicketId];
      localStorage.setItem('quark_ticket_messages', JSON.stringify(msgsMap));
      localStorage.setItem(`quark_ticket_messages_${backendTicketId}`, JSON.stringify(msgsMap[backendTicketId]));
      localStorage.setItem(`quark_ticket_messages_${ticketId}`, JSON.stringify(msgsMap[backendTicketId]));
    } catch (e) {}

    try {
      await fetch(`/api/tickets/${backendTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sender_type: 'client',
          sender_id: client?.id || null,
        }),
      });
    } catch (err) {
      console.warn('[PortalTickets] Mensagem enviada em modo offline:', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'Todos') return true;
    return t.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Resolvido': return 'bg-lime-500/10 text-lime-400 border-lime-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const openWhatsAppSupport = () => {
    const text = encodeURIComponent(
      `Olá! Sou o cliente ${client?.name || ''} e gostaria de suporte com o meu sistema solar Quark.`
    );
    window.open(`https://wa.me/5582994241835?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-16">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Breadcrumb / Navegação Desktop */}
        <div className="flex items-center gap-2 mb-6 text-xs text-zinc-400">
          <button 
            onClick={() => navigate('/portal')}
            className="hover:text-lime-400 transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft size={14} /> Início
          </button>
          <span>/</span>
          <span className="text-zinc-200 font-semibold">Central de Chamados</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-2xl shadow-lg shadow-purple-500/10">
                <Headphones size={24} />
              </div>
              Meus Chamados & Suporte
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Acompanhe suas solicitações técnicas, dúvidas de faturas e garantias.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={openWhatsAppSupport}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition flex items-center gap-2 active:scale-95"
            >
              <MessageSquare size={16} className="text-emerald-400" />
              WhatsApp
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95 text-xs sm:text-sm flex-1 sm:flex-none justify-center"
            >
              <Plus size={18} />
              Novo Chamado
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['Todos', 'Aberto', 'Resolvido'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === f 
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm' 
                  : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-white/5'
              }`}
            >
              {f}
              {f === 'Todos' && tickets.length > 0 && ` (${tickets.length})`}
              {f === 'Aberto' && tickets.filter(t => t.status === 'Aberto').length > 0 && ` (${tickets.filter(t => t.status === 'Aberto').length})`}
              {f === 'Resolvido' && tickets.filter(t => t.status === 'Resolvido').length > 0 && ` (${tickets.filter(t => t.status === 'Resolvido').length})`}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass-panel p-12 rounded-2xl border border-white/5 text-center">
              <Clock size={28} className="text-zinc-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Carregando seus chamados...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            tickets.length === 0 ? (
              // Empty State - Nenhum chamado aberto
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 sm:p-12 rounded-2xl border border-white/5 text-center max-w-xl mx-auto"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-lime-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 text-purple-400 shadow-xl">
                  <Headphones size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Você ainda não possui chamados abertos
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
                  Precisa de assistência técnica para o inversor, tirar dúvidas sobre a compensação de energia ou solicitar uma revisão preventiva? Estamos à disposição.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-lime-500/10 w-full sm:w-auto justify-center"
                  >
                    <Plus size={16} /> Abrir Primeiro Chamado
                  </button>
                  <button
                    onClick={openWhatsAppSupport}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold transition flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <MessageSquare size={16} className="text-emerald-400" /> Falar via WhatsApp
                  </button>
                </div>
              </motion.div>
            ) : (
              // Empty State - Filtro vazio
              <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center">
                <AlertCircle size={28} className="text-zinc-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-300 font-medium">Nenhum chamado com status "{filter}".</p>
                <button
                  onClick={() => setFilter('Todos')}
                  className="mt-3 text-xs text-lime-400 hover:underline font-semibold"
                >
                  Ver todos os chamados
                </button>
              </div>
            )
          ) : (
            filteredTickets.map(ticket => (
              <motion.div 
                key={ticket.id}
                layout
                className="glass-panel rounded-2xl overflow-hidden border border-white/5"
              >
              <div 
                className="p-5 sm:p-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-mono text-zinc-500">{ticket.id}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {ticket.category}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{ticket.date}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{ticket.subject}</h3>
                <p className="text-sm text-zinc-400 mt-1 line-clamp-1 flex items-center gap-2">
                  <MessageSquare size={14} />
                  {ticket.messages[ticket.messages.length - 1].text}
                </p>
              </div>

              {/* Expanded Chat */}
              <AnimatePresence>
                {expandedTicket === ticket.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 bg-zinc-950/50"
                  >
                    <div className="p-5 sm:p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {ticket.messages?.map((msg: any, i: number) => (
                        <div key={i} className={`flex ${msg.sender === 'client' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                          {msg.sender === 'system' ? (
                            <span className="text-xs text-zinc-500 font-medium bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                              {msg.text} - {msg.time}
                            </span>
                          ) : (
                            <div className={`max-w-[85%] sm:max-w-[70%] p-3 sm:p-4 rounded-2xl ${
                              msg.sender === 'client' 
                                ? 'bg-lime-500/10 border border-lime-500/20 text-lime-50 rounded-tr-sm' 
                                : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-tl-sm'
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <span className="text-[10px] text-zinc-500 block mt-2 opacity-80">{msg.time}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {ticket.status !== 'Resolvido' && (
                      <div className="p-4 bg-zinc-900/80 border-t border-white/5 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Digite sua mensagem e pressione Enter..." 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendReply(ticket.id);
                            }
                          }}
                          className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-lime-500 outline-none transition-colors"
                        />
                        <button 
                          onClick={() => handleSendReply(ticket.id)}
                          className="p-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 rounded-xl transition-colors active:scale-95"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </main>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-950/50">
                <h3 className="text-lg font-bold text-white">Novo Chamado</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Assunto</label>
                  <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none transition-colors" 
                    placeholder="Ex: Problema com o inversor" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Categoria</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none transition-colors appearance-none"
                    >
                      <option value="Inversor Parou / Falha de Geração">⚡ Inversor Parou / Falha de Geração</option>
                      <option value="Manutenção Preventiva">🔧 Manutenção Preventiva</option>
                      <option value="Limpeza de Painéis">💧 Limpeza de Painéis</option>
                      <option value="Dúvida sobre Fatura">📄 Dúvida sobre Fatura</option>
                      <option value="Vistoria & Homologação">🛡️ Vistoria & Homologação</option>
                      <option value="Outros">💬 Outros Assuntos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Prioridade</label>
                    <select 
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none transition-colors appearance-none"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Descrição</label>
                  <textarea 
                    rows={4} 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none transition-colors resize-none custom-scrollbar" 
                    placeholder="Descreva sua solicitação com detalhes..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-white/5 bg-zinc-950/50 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreateTicket} className="btn-primary px-6 py-2 rounded-lg text-sm shadow-lg shadow-lime-500/10">
                  Abrir Chamado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortalTickets;
