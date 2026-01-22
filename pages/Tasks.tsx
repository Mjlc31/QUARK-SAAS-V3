import React, { useState } from 'react';
import { CheckCircle, Clock, Plus, User, AlertCircle, Trash2, X, Calendar as CalendarIcon, Flag, MessageCircle, Mail, Bell, BellOff, List as ListIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

// 1. Mock Data
const TEAM_MEMBERS = [
  { id: 'arthur', name: 'Arthur Duda', phone: '5582993236678', email: 'arthurmoraesp12@gmail.com' },
  { id: 'anderson', name: 'Anderson Alves', phone: '5582991831476', email: 'ctt.andersonalves@gmail.com' }
];

const Tasks: React.FC = () => {
  const { tasks, toggleTask, addTask, deleteTask, isLoading } = useApp();
  const [filter, setFilter] = useState<'All' | string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    assignee: TEAM_MEMBERS[0].name,
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: new Date().toISOString().split('T')[0],
    notifyWhatsapp: true,
    notifyEmail: false
  });

  const getNotificationMessage = (taskTitle: string, priority: string, deadline: string, assigneeName: string) => {
    const firstName = assigneeName.split(' ')[0];
    const dateText = deadline ? new Date(deadline).toLocaleDateString('pt-BR') : 'Sem data definida';
    
    let emoji = '🟢';
    let prefix = 'Informativo';
    
    if (priority === 'High') {
      emoji = '🔴';
      prefix = 'URGENTE';
    } else if (priority === 'Medium') {
      emoji = '🟡';
      prefix = 'Atenção';
    }

    return {
      subject: `Nova Tarefa: ${taskTitle}`,
      body: `Olá ${firstName}, nova tarefa atribuída no Quark OS:\n\n*${emoji} ${prefix}: ${taskTitle}*\nPrioridade: ${priority === 'High' ? 'Alta' : priority === 'Medium' ? 'Média' : 'Baixa'}\nPrazo: ${dateText}\n\nFavor confirmar recebimento.`
    };
  };

  const handleNotify = (type: 'whatsapp' | 'email', taskData: { title: string, priority: string, deadline: string, assignee: string }) => {
     const member = TEAM_MEMBERS.find(m => m.name === taskData.assignee);
     if (!member) {
       alert("Contato do responsável não encontrado na base de dados.");
       return;
     }

     const { body, subject } = getNotificationMessage(taskData.title, taskData.priority, taskData.deadline, taskData.assignee);
     
     if (type === 'whatsapp') {
       const phone = member.phone.replace(/\D/g, '');
       window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
     } else {
       window.open(`mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
     }
  };

  const handleAddTask = async () => {
    if (!newTaskData.title) return;

    await addTask({
      title: newTaskData.title,
      assignee: newTaskData.assignee,
      deadline: newTaskData.deadline || new Date().toISOString().split('T')[0],
      priority: newTaskData.priority
    });

    if (newTaskData.notifyWhatsapp) {
      handleNotify('whatsapp', { 
        title: newTaskData.title, 
        priority: newTaskData.priority, 
        deadline: newTaskData.deadline, 
        assignee: newTaskData.assignee 
      });
    }

    if (newTaskData.notifyEmail) {
      setTimeout(() => {
        handleNotify('email', { 
          title: newTaskData.title, 
          priority: newTaskData.priority, 
          deadline: newTaskData.deadline, 
          assignee: newTaskData.assignee 
        });
      }, 500);
    }

    setIsModalOpen(false);
    setNewTaskData(prev => ({ 
      ...prev, 
      title: '', 
      priority: 'Medium' 
    }));
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(id);
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.assignee === filter);

  // Calendar Logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const daysArray = [];
    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(new Date(year, month, i));
    }

    // Fill remaining cells to complete the grid (optional but looks better)
    const remainingCells = 42 - daysArray.length;
    for (let i = 0; i < remainingCells; i++) {
       daysArray.push(null);
    }

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
      <div className="glass-panel p-4 md:p-6 rounded-2xl animate-enter">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex gap-2 items-center">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><ChevronLeft size={20}/></button>
            <h3 className="text-lg font-bold text-white capitalize w-48 text-center">{monthName}</h3>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><ChevronRight size={20}/></button>
          </div>
          <div className="flex gap-3 text-xs flex-wrap justify-center">
             <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>Alta</span>
             <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50"></div>Média</span>
             <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>Baixa</span>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-800">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="bg-zinc-900 p-2 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase">
              {day}
            </div>
          ))}
          {daysArray.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-[#0c0c0e] min-h-[80px] md:h-32"></div>;
            
            const dateStr = date.toISOString().split('T')[0];
            const isToday = new Date().toDateString() === date.toDateString();
            const dayTasks = tasks.filter(t => t.deadline === dateStr);

            return (
              <div key={idx} className={`bg-[#0c0c0e] min-h-[80px] md:h-32 p-1 md:p-2 hover:bg-zinc-900/50 transition-colors border-t border-transparent relative group ${isToday ? 'bg-zinc-900/30' : ''}`}>
                 <span className={`text-[10px] md:text-xs font-bold block mb-1 ${isToday ? 'text-lime-400' : 'text-slate-500'}`}>{date.getDate()}</span>
                 <div className="space-y-1 overflow-y-auto max-h-[50px] md:max-h-[80px] custom-scrollbar">
                    {dayTasks.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => toggleTask(t.id)}
                        className={`text-[9px] md:text-[10px] p-1 rounded cursor-pointer border-l-2 truncate transition-all ${
                          t.completed ? 'opacity-40 line-through bg-white/5' : 'bg-white/5 hover:bg-white/10'
                        } ${t.priority === 'High' ? 'border-red-500' : t.priority === 'Medium' ? 'border-yellow-500' : 'border-blue-500'}`}
                        title={t.title}
                      >
                         {t.title}
                      </div>
                    ))}
                 </div>
                 <button 
                   onClick={() => {
                     setNewTaskData(prev => ({ ...prev, deadline: dateStr }));
                     setIsModalOpen(true);
                   }}
                   className="hidden md:block absolute bottom-2 right-2 p-1 text-slate-600 hover:text-lime-400 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <Plus size={14} />
                 </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-enter pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Tarefas</h2>
          <p className="text-slate-400 text-sm">Cronograma e atividades da equipe.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {/* View Toggle */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Lista"
              >
                <ListIcon size={18} />
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Calendário"
              >
                <CalendarIcon size={18} />
              </button>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none bg-lime-500 hover:bg-lime-400 text-black px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-lime-500/20 transition-all active:scale-95"
          >
            <Plus size={18} /> <span className="hidden md:inline">Nova Tarefa</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
            <button
                onClick={() => setFilter('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filter === 'All' 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Todos
            </button>
            {TEAM_MEMBERS.map((user) => (
              <button
                key={user.id}
                onClick={() => setFilter(user.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filter === user.name 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {user.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {isLoading && filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
                Carregando...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 glass-panel rounded-xl border-dashed">
                <AlertCircle className="mx-auto mb-2 opacity-50" />
                Nenhuma tarefa encontrada.
              </div>
            ) : (
              filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`glass-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between group transition-all border gap-4 ${task.completed ? 'border-green-500/30 bg-green-900/10' : 'border-white/10 hover:border-lime-500/30'}`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 mt-1 md:mt-0 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        task.completed ? 'border-green-500 bg-green-500 text-black' : 'border-slate-500 hover:border-lime-400'
                      }`}
                    >
                      {task.completed && <CheckCircle size={14} />}
                    </button>
                    <div className={`flex-1 ${task.completed ? 'opacity-50 line-through' : ''}`}>
                      <h4 className="text-white font-medium text-lg md:text-base">{task.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 md:mt-1 flex-wrap">
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><User size={12} /> {task.assignee.split(' ')[0]}</span>
                        <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Clock size={12} /> {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                          task.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {task.priority === 'High' ? '🔴 ALTA' : task.priority === 'Medium' ? '🟡 MÉDIA' : '🟢 BAIXA'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                     <div className="flex gap-2">
                        <button 
                           onClick={() => handleNotify('whatsapp', task)}
                           className="p-2 text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                           title="WhatsApp"
                        >
                           <MessageCircle size={18} />
                        </button>
                        <button 
                           onClick={() => handleNotify('email', task)}
                           className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                           title="E-mail"
                        >
                           <Mail size={18} />
                        </button>
                     </div>
                     <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>
                     <button 
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        renderCalendar()
      )}

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 border border-white/20 shadow-2xl animate-enter relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Nova Tarefa</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Título da Tarefa</label>
                <input 
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-lime-500 outline-none" 
                  value={newTaskData.title} 
                  onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} 
                  placeholder="Ex: Instalação Cliente X"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Responsável</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white focus:border-lime-500 outline-none appearance-none" 
                      value={newTaskData.assignee} 
                      onChange={e => setNewTaskData({...newTaskData, assignee: e.target.value})}
                    >
                      {TEAM_MEMBERS.map(u => (
                        <option key={u.id} value={u.name}>{u.name.split(' ')[0]}</option>
                      ))}
                    </select>
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioridade</label>
                   <div className="relative">
                     <select 
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white focus:border-lime-500 outline-none appearance-none" 
                       value={newTaskData.priority} 
                       onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as any})}
                     >
                       <option value="High">Alta</option>
                       <option value="Medium">Média</option>
                       <option value="Low">Baixa</option>
                     </select>
                     <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prazo Final</label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white focus:border-lime-500 outline-none [color-scheme:dark]" 
                    value={newTaskData.deadline} 
                    onChange={e => setNewTaskData({...newTaskData, deadline: e.target.value})} 
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                 <p className="text-xs font-bold text-slate-500 uppercase">Notificação Automática</p>
                 
                 <div 
                   onClick={() => setNewTaskData({...newTaskData, notifyWhatsapp: !newTaskData.notifyWhatsapp})}
                   className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${newTaskData.notifyWhatsapp ? 'bg-green-500/10 border-green-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                 >
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${newTaskData.notifyWhatsapp ? 'bg-green-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                          <MessageCircle size={18} />
                       </div>
                       <div>
                          <p className={`text-sm font-bold ${newTaskData.notifyWhatsapp ? 'text-white' : 'text-slate-400'}`}>WhatsApp</p>
                          <p className="text-[10px] text-slate-500">Enviar mensagem formatada</p>
                       </div>
                    </div>
                    {newTaskData.notifyWhatsapp ? <Bell size={18} className="text-green-500" /> : <BellOff size={18} className="text-slate-600" />}
                 </div>

                 <div 
                   onClick={() => setNewTaskData({...newTaskData, notifyEmail: !newTaskData.notifyEmail})}
                   className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${newTaskData.notifyEmail ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                 >
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${newTaskData.notifyEmail ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-500'}`}>
                          <Mail size={18} />
                       </div>
                       <div>
                          <p className={`text-sm font-bold ${newTaskData.notifyEmail ? 'text-white' : 'text-slate-400'}`}>E-mail</p>
                          <p className="text-[10px] text-slate-500">Enviar notificação oficial</p>
                       </div>
                    </div>
                    {newTaskData.notifyEmail ? <Bell size={18} className="text-blue-500" /> : <BellOff size={18} className="text-slate-600" />}
                 </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-medium">Cancelar</button>
              <button onClick={handleAddTask} className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-lg shadow-lime-500/20 active:scale-95">
                Salvar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;