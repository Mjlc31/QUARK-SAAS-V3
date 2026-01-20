import React, { useState } from 'react';
import { CheckCircle, Clock, Plus, User, AlertCircle, Trash2, X, Calendar, Flag, MessageCircle, Mail, Bell, BellOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

// 1. Estrutura de Dados (Team Mock)
const TEAM_MEMBERS = [
  { id: 'arthur', name: 'Arthur Duda', phone: '5582993236678', email: 'arthurmoraesp12@gmail.com' },
  { id: 'anderson', name: 'Anderson Alves', phone: '5582991831476', email: 'ctt.andersonalves@gmail.com' }
];

const Tasks: React.FC = () => {
  const { tasks, toggleTask, addTask, deleteTask, isLoading } = useApp();
  const [filter, setFilter] = useState<'All' | string>('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    assignee: TEAM_MEMBERS[0].name, // Default to first member
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: '',
    notifyWhatsapp: true,
    notifyEmail: false
  });

  // Helper para formatar a mensagem baseada na prioridade
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
     
     // Se não achar o membro (caso seja um nome antigo), não faz nada ou usa fallback genérico
     if (!member) {
       alert("Contato do responsável não encontrado na base de dados.");
       return;
     }

     const { body, subject } = getNotificationMessage(taskData.title, taskData.priority, taskData.deadline, taskData.assignee);
     
     if (type === 'whatsapp') {
       // Remove caracteres não numéricos do telefone
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

    // 3. Lógica de Envio (The Smart Part)
    if (newTaskData.notifyWhatsapp) {
      handleNotify('whatsapp', { 
        title: newTaskData.title, 
        priority: newTaskData.priority, 
        deadline: newTaskData.deadline, 
        assignee: newTaskData.assignee 
      });
    }

    // Pequeno delay para evitar bloqueio de popup se ambos estiverem marcados
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
    // Reset form but keep notifications preferences
    setNewTaskData(prev => ({ 
      ...prev, 
      title: '', 
      priority: 'Medium', 
      deadline: '' 
    }));
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(id);
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.assignee === filter);

  return (
    <div className="space-y-6 animate-enter pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Tarefas</h2>
          <p className="text-slate-400 text-sm">Controle de atividades da sociedade</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-lime-500 hover:bg-lime-400 text-black px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-lime-500/20 transition-all transform hover:scale-105 w-full md:w-auto justify-center"
        >
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

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
            Carregando tarefas...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 glass-panel rounded-xl border-dashed">
            <AlertCircle className="mx-auto mb-2 opacity-50" />
            Nenhuma tarefa encontrada para este filtro.
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
                 {/* 4. Cards de Tarefa Integrados */}
                 <div className="flex gap-2">
                    <button 
                       onClick={() => handleNotify('whatsapp', task)}
                       className="p-2 text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                       title="Cobrar via WhatsApp"
                    >
                       <MessageCircle size={18} />
                    </button>
                    <button 
                       onClick={() => handleNotify('email', task)}
                       className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                       title="Cobrar via E-mail"
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

      {/* 2. Funcionalidade: Modal de Nova Tarefa */}
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
                  placeholder="Ex: Validar contrato do cliente X"
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
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                </div>
              </div>

              {/* Ação de Notificação */}
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
              <button onClick={handleAddTask} className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-lg shadow-lime-500/20">
                {newTaskData.notifyWhatsapp || newTaskData.notifyEmail ? 'Salvar & Notificar' : 'Salvar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;