import React, { useState } from 'react';
import { Headphones, Plus, MessageSquare, X, Send, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const initialTickets = [
  { id: 'TKT-1234', subject: 'Dúvida sobre a fatura', category: 'Financeiro', priority: 'Normal', status: 'Resolvido', date: '12 Set, 2026', messages: [
    { sender: 'client', text: 'Olá, não entendi a cobrança na minha última fatura da concessionária.', time: '10:00' },
    { sender: 'operator', text: 'Bom dia, João! A fatura inclui a taxa mínima de disponibilidade. Vamos te enviar um material explicativo.', time: '10:15' },
    { sender: 'system', text: 'Ticket marcado como resolvido', time: '14:30' }
  ]},
  { id: 'TKT-1235', subject: 'Agendar limpeza dos painéis', category: 'Manutenção', priority: 'Normal', status: 'Aberto', date: '15 Set, 2026', messages: [
    { sender: 'client', text: 'Gostaria de agendar a limpeza anual dos meus painéis.', time: '09:00' },
    { sender: 'operator', text: 'Claro! Temos disponibilidade para a próxima terça-feira às 14h. Fica bom para você?', time: '09:30' }
  ]},
];

const PortalTickets: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Todos');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [tickets, setTickets] = useState(initialTickets);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Manutenção');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateTicket = () => {
    if (!newSubject.trim() || !newDescription.trim()) return;

    const newTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'Aberto',
      date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }),
      messages: [
        { sender: 'client', text: newDescription, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
      ]
    };

    setTickets([newTicket, ...tickets]);
    setIsModalOpen(false);
    setNewSubject('');
    setNewCategory('Manutenção');
    setNewPriority('Normal');
    setNewDescription('');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-10">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/portal/dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30 text-lime-400 font-display font-bold">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">Portal Quark Energia</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <Headphones size={24} />
              </div>
              Meus Chamados
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Acompanhe suas solicitações e tire dúvidas</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95"
          >
            <Plus size={18} />
            Novo Chamado
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['Todos', 'Aberto', 'Resolvido'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.map(ticket => (
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
                      {ticket.messages.map((msg, i) => (
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
                          placeholder="Digite sua mensagem..." 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-lime-500 outline-none transition-colors"
                        />
                        <button className="p-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 rounded-xl transition-colors active:scale-95">
                          <Send size={18} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
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
                      <option value="Manutenção">Manutenção</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Dúvida">Dúvida</option>
                      <option value="Outros">Outros</option>
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
