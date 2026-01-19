import React, { useState } from 'react';
import { CheckCircle, Clock, Plus, User, AlertCircle, Trash2, X, Calendar, Flag, MessageCircle, Mail } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const Tasks: React.FC = () => {
  const { tasks, toggleTask, addTask, deleteTask, users, isLoading } = useApp();
  const [filter, setFilter] = useState<'All' | string>('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    assignee: 'Arthur', // Default
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: ''
  });

  const handleAddTask = async () => {
    if (!newTaskData.title) return;

    await addTask({
      title: newTaskData.title,
      assignee: newTaskData.assignee,
      deadline: newTaskData.deadline || new Date().toISOString().split('T')[0],
      priority: newTaskData.priority
    });

    setIsModalOpen(false);
    setNewTaskData({ title: '', assignee: 'Arthur', priority: 'Medium', deadline: '' });
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(id);
    }
  };

  const handleNotify = (type: 'whatsapp' | 'email', task: any) => {
     const urgencyText = task.priority === 'High' ? 'ALTA' : task.priority === 'Medium' ? 'Média' : 'Baixa';
     const dateText = task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo';
     
     const message = `*Nova Atividade Atribuída*\n\nTarefa: *${task.title}*\nPrioridade: *${urgencyText}*\nPrazo Limite: *${dateText}*\n\nFavor confirmar recebimento.`;
     
     if (type === 'whatsapp') {
       window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
     } else {
       window.open(`mailto:?subject=Nova Tarefa: ${task.title}&body=${encodeURIComponent(message)}`, '_blank');
     }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.assignee.includes(filter));

  return (
    <div className="space-y-6 animate-enter pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Tarefas</h2>
          <p className="text-slate-400 text-sm">Controle de atividades de Arthur Duda e Anderson Alves</p>
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
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => setFilter(user.name.split(' ')[0])}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              filter === user.name.split(' ')[0] 
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
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><User size={12} /> {task.assignee}</span>
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Clock size={12} /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Sem prazo'}</span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                      task.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                      task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {task.priority === 'High' ? 'ALTA' : task.priority === 'Medium' ? 'MÉDIA' : 'BAIXA'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                 <div className="flex gap-2">
                    <button 
                       onClick={() => handleNotify('whatsapp', task)}
                       className="p-2 text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                       title="Notificar via WhatsApp"
                    >
                       <MessageCircle size={18} />
                    </button>
                    <button 
                       onClick={() => handleNotify('email', task)}
                       className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                       title="Notificar via E-mail"
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
                  placeholder="Ex: Ligar para cliente X"
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
                      {users.map(u => (
                        <option key={u.id} value={u.name.split(' ')[0]}>{u.name.split(' ')[0]}</option>
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
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-medium">Cancelar</button>
              <button onClick={handleAddTask} className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-lg shadow-lime-500/20">Criar Tarefa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;