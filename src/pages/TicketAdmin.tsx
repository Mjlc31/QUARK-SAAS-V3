import React, { useState, useMemo } from 'react';
import { 
  Headphones, Clock, CheckCircle, Search, Filter, 
  X, Send, User, ChevronRight, AlertCircle
} from 'lucide-react';
import { useTickets, useTicketMessages, useUpdateTicketStatus, useAddTicketMessage } from '../hooks/useTickets';
import { SupportTicket, TicketMessage, TicketStatus, TicketPriority, TicketCategory } from '../types';
import { SkeletonPage } from '../components/SkeletonLoader';

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  urgente: 'bg-red-500/10 text-red-400 border border-red-500/20',
  alta: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  normal: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  baixa: 'bg-zinc-700/50 text-zinc-400 border border-zinc-500/20'
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  aberto: 'bg-lime-500/10 text-lime-400 border border-lime-500/20',
  em_andamento: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  resolvido: 'bg-green-500/10 text-green-400 border border-green-500/20',
  fechado: 'bg-zinc-700/50 text-zinc-500 border border-zinc-500/20',
  aguardando_cliente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
};

const TicketAdmin: React.FC = () => {
  const { data: tickets = [], isLoading = false } = useTickets() || {};
  const updateStatus = useUpdateTicketStatus();
  const addMessage = useAddTicketMessage();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  // Messages for the selected ticket
  const { data: messages = [], isLoading: loadingMessages } = useTicketMessages(selectedTicket?.id || '') || {};

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      abertos: tickets.filter((t: SupportTicket) => t.status === 'aberto').length,
      emAndamento: tickets.filter((t: SupportTicket) => t.status === 'em_andamento').length,
      resolvidosHoje: tickets.filter((t: SupportTicket) => t.status === 'resolvido' && t.resolved_at?.startsWith(today)).length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t: SupportTicket) => {
      const matchSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !addMessage) return;
    await addMessage.mutateAsync({
      ticket_id: selectedTicket.id,
      message: replyText,
      sender_type: 'operator'
    });
    setReplyText('');
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket || !updateStatus) return;
    await updateStatus.mutateAsync({ id: selectedTicket.id, status: newStatus });
    setSelectedTicket({ ...selectedTicket, status: newStatus });
  };
  if (isLoading) return <div className="p-8"><SkeletonPage /></div>;

  return (
    <div className="space-y-6 pb-20 animate-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Headphones className="text-lime-400" /> Central de Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie os chamados de suporte técnico e atendimento aos clientes.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center">
            <AlertCircle className="text-lime-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Abertos</p>
            <p className="text-2xl font-bold font-mono text-white">{stats.abertos}</p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Clock className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Em Andamento</p>
            <p className="text-2xl font-bold font-mono text-white">{stats.emAndamento}</p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="text-green-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Resolvidos Hoje</p>
            <p className="text-2xl font-bold font-mono text-white">{stats.resolvidosHoje}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por assunto ou cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-lime-500 outline-none placeholder-slate-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 min-w-max">
            <Filter size={14} className="text-slate-500" />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Todos os Status</option>
              <option value="aberto" className="bg-zinc-900">Aberto</option>
              <option value="em_andamento" className="bg-zinc-900">Em Andamento</option>
              <option value="resolvido" className="bg-zinc-900">Resolvido</option>
              <option value="fechado" className="bg-zinc-900">Fechado</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 min-w-max">
            <select 
              value={priorityFilter} 
              onChange={e => setPriorityFilter(e.target.value as any)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Prioridade</option>
              <option value="urgente" className="bg-zinc-900">Urgente</option>
              <option value="alta" className="bg-zinc-900">Alta</option>
              <option value="normal" className="bg-zinc-900">Normal</option>
              <option value="baixa" className="bg-zinc-900">Baixa</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 min-w-max">
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value as any)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Categoria</option>
              <option value="manutencao" className="bg-zinc-900">Manutenção</option>
              <option value="financeiro" className="bg-zinc-900">Financeiro</option>
              <option value="projeto" className="bg-zinc-900">Projeto</option>
              <option value="outros" className="bg-zinc-900">Outros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-white/5 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Assunto</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                       <span className="w-5 h-5 rounded-full border-2 border-lime-500 border-t-transparent animate-spin"></span>
                       Carregando tickets...
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Nenhum ticket encontrado.</td>
                </tr>
              ) : (
                filteredTickets.map((ticket: SupportTicket) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => setSelectedTicket(ticket)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">#{ticket.id.slice(0,6)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white group-hover:text-lime-400 transition-colors">{ticket.subject}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{ticket.client_name || 'Desconhecido'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] rounded uppercase font-bold tracking-wider">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${PRIORITY_STYLES[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${STATUS_STYLES[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fade-scale">
          <div className="bg-[#09090b] w-full md:w-[600px] h-full md:h-[95vh] md:rounded-3xl border-l md:border border-white/10 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/10 bg-zinc-900/50 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${STATUS_STYLES[selectedTicket.status]}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${PRIORITY_STYLES[selectedTicket.priority]}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)} 
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-white leading-tight">{selectedTicket.subject}</h2>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><User size={14} /> {selectedTicket.client_name}</span>
                <span className="flex items-center gap-1.5 font-mono text-xs text-slate-500">#{selectedTicket.id.slice(0,8)}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-3 border-b border-white/10 bg-zinc-900 flex items-center gap-3">
               <span className="text-xs text-slate-500 font-bold uppercase mr-2">Mudar Status:</span>
               {(['aberto', 'em_andamento', 'resolvido', 'fechado'] as TicketStatus[]).map(status => (
                 <button 
                   key={status}
                   onClick={() => handleStatusChange(status)}
                   className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${
                     selectedTicket.status === status 
                       ? STATUS_STYLES[status] 
                       : 'bg-white/5 text-slate-400 hover:bg-white/10'
                   }`}
                 >
                   {status.replace('_', ' ')}
                 </button>
               ))}
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/20">
              
              {/* Original Description as first message */}
              {selectedTicket.description && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <User size={14} />
                  </div>
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl rounded-tl-none p-4 text-sm text-slate-300">
                    <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                    <p className="text-[10px] text-slate-500 mt-2 text-right">
                      {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}

              {loadingMessages ? (
                 <div className="flex justify-center p-4"><span className="w-5 h-5 rounded-full border-2 border-lime-500 border-t-transparent animate-spin"></span></div>
              ) : (
                messages.map((msg: TicketMessage) => {
                  const isOperator = msg.sender_type === 'operator';
                  return (
                    <div key={msg.id} className={`flex gap-4 ${isOperator ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isOperator ? 'bg-lime-500/20 text-lime-400' : 'bg-zinc-800 text-slate-400'
                      }`}>
                        {isOperator ? <Headphones size={14} /> : <User size={14} />}
                      </div>
                      <div className={`max-w-[85%] border rounded-2xl p-4 text-sm ${
                        isOperator 
                          ? 'bg-lime-500/10 border-lime-500/20 text-lime-100 rounded-tr-none' 
                          : 'bg-zinc-900 border-white/10 text-slate-300 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[10px] mt-2 ${isOperator ? 'text-lime-500/60' : 'text-slate-500'} ${isOperator ? 'text-left' : 'text-right'}`}>
                          {new Date(msg.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-900 border-t border-white/10 flex gap-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Escreva sua resposta..."
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-lime-500 outline-none resize-none custom-scrollbar min-h-[50px] max-h-[120px]"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <button 
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="bg-lime-500 hover:bg-lime-400 text-black p-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketAdmin;
