import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Search, X, Clock, Send, Edit2, Trash2, Save } from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { useApp } from '../contexts/AppContext';

const STATUS_COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'Lead', label: 'Novos Leads', color: 'border-blue-500' },
  { id: 'Qualificacao', label: 'Em Qualificação', color: 'border-yellow-500' },
  { id: 'Proposta', label: 'Proposta Enviada', color: 'border-purple-500' },
  { id: 'Fechado', label: 'Fechado / Ganho', color: 'border-lime-500' },
];

const CRM: React.FC = () => {
  const { leads, updateLeadStatus, addLead, addLeadLog, updateLead, deleteLead } = useApp();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // States for Editing
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});
  
  // New Lead Form State
  const [formData, setFormData] = useState({ name: '', phone: '', value: '', city: '', consumption: '' });

  // Reset edit mode when changing selected lead
  useEffect(() => {
    setIsEditing(false);
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

  const handleSmartWhatsApp = (lead: Lead) => {
    const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
    const message = `*${timeOfDay}, ${lead.name.split(' ')[0]}!*

Aqui é da *Quark Energia*. ⚡

Estive analisando o perfil energético da sua unidade em *${lead.city}* e preparei um estudo preliminar.

Para um consumo de ~${lead.monthlyConsumption} kWh, estimamos uma economia anual superior a *R$ ${(lead.monthlyConsumption * 0.9 * 12).toLocaleString('pt-BR')}*.

Podemos agendar uma breve apresentação da proposta?

Link da Proposta Digital: quark.energy/p/${lead.id}

Atenciosamente,
*Equipe Quark*`;

    addLeadLog(lead.id, 'Contato', 'WhatsApp enviado com script padrão');
    window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
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
    // Atualiza o objeto selecionado visualmente
    setSelectedLead({ ...selectedLead, ...editFormData } as Lead);
  };

  const handleDelete = async () => {
     if (!selectedLead) return;
     await deleteLead(selectedLead.id);
     setSelectedLead(null);
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col relative animate-enter pb-10">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl border border-white/5 w-full md:w-96">
           <div className="w-full px-4 py-2 bg-slate-800 rounded-lg text-sm font-medium text-white flex items-center gap-2">
             <Search size={16} className="text-slate-400" />
             <input 
               type="text" 
               placeholder="Buscar Lead..." 
               className="bg-transparent border-none outline-none text-white w-full placeholder-slate-500"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-lime-500 hover:bg-lime-400 text-black px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-lime-500/20 transition-all transform hover:scale-105 w-full md:w-auto justify-center"
        >
          <Plus size={20} /> Novo Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 -mx-4 md:mx-0 px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-6 md:min-w-[1200px] h-full">
          {STATUS_COLUMNS.map(column => (
            <div 
              key={column.id}
              className="flex-1 min-w-full md:min-w-[300px] flex flex-col group"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={`flex items-center justify-between p-4 rounded-t-2xl glass-panel border-t-4 ${column.color} mb-3`}>
                <h3 className="font-bold text-white tracking-wide">{column.label}</h3>
                <span className="bg-slate-800 border border-white/10 px-2.5 py-1 rounded-md text-xs font-bold text-slate-300">
                  {filteredLeads.filter(l => l.status === column.id).length}
                </span>
              </div>
              
              <div className="flex-1 rounded-b-2xl space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[500px] md:max-h-none">
                {filteredLeads.filter(l => l.status === column.id).map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className="glass-panel p-5 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-lime-500/50 transition-all group relative active:scale-95 duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-bold text-white truncate text-base mb-1">{lead.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin size={12} /> {lead.city}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/10">
                        {lead.assignee?.substring(0,2).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                       <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Consumo</p>
                         <p className="text-sm font-display font-semibold text-white">{lead.monthlyConsumption} kWh</p>
                       </div>
                       <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Valor</p>
                         <p className="text-sm font-display font-semibold text-lime-400">{(lead.value / 1000).toFixed(0)}k</p>
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {new Date(lead.updatedAt).toLocaleDateString()}
                      </span>
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
          ))}
        </div>
      </div>

      {/* Slide-Over Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[500px] glass-panel border-l border-white/10 shadow-2xl z-[60] animate-enter flex flex-col backdrop-blur-xl bg-slate-900/90">
          <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-900/50">
            <div className="flex-1">
              {isEditing ? (
                 <input 
                   type="text" 
                   value={editFormData.name} 
                   onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                   className="bg-black/40 border border-white/20 rounded p-2 text-xl font-bold text-white w-full mb-2"
                 />
              ) : (
                 <h2 className="text-2xl font-bold text-white mb-1 truncate pr-4">{selectedLead.name}</h2>
              )}
              
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded text-xs bg-lime-500/20 text-lime-400 border border-lime-500/20 font-medium">{selectedLead.status}</span>
                {isEditing ? (
                   <input 
                     type="text" 
                     value={editFormData.city} 
                     onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                     className="bg-black/40 border border-white/20 rounded p-1 text-xs text-white w-32"
                   />
                ) : (
                   <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-slate-300 border border-white/10">{selectedLead.city}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
               {!isEditing && (
                 <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={20} />
                 </button>
               )}
               {isEditing && (
                 <button onClick={handleSaveEdit} className="p-2 text-lime-400 hover:bg-lime-500/10 rounded-lg transition-colors" title="Salvar">
                    <Save size={20} />
                 </button>
               )}
               <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                  <Trash2 size={20} />
               </button>
               <button onClick={() => setSelectedLead(null)} className="p-2 text-slate-400 hover:text-white ml-2">
                 <X size={24} />
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Lead Info */}
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                 <label className="text-xs text-slate-500 uppercase font-bold">Telefone</label>
                 {isEditing ? (
                    <input 
                       type="text" 
                       value={editFormData.phone} 
                       onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                       className="bg-black/40 border border-white/20 rounded p-1 text-white w-full mt-1"
                    />
                 ) : (
                    <p className="text-white font-display text-lg">{selectedLead.phone}</p>
                 )}
               </div>
               <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                 <label className="text-xs text-slate-500 uppercase font-bold">Valor (R$)</label>
                 {isEditing ? (
                    <input 
                       type="number" 
                       value={editFormData.value} 
                       onChange={(e) => setEditFormData({...editFormData, value: Number(e.target.value)})}
                       className="bg-black/40 border border-white/20 rounded p-1 text-lime-400 w-full mt-1"
                    />
                 ) : (
                    <p className="text-lime-400 font-display text-lg">R$ {selectedLead.value.toLocaleString()}</p>
                 )}
               </div>
               <div className="p-4 rounded-xl bg-white/5 border border-white/5 col-span-2">
                 <label className="text-xs text-slate-500 uppercase font-bold">Consumo (kWh)</label>
                 {isEditing ? (
                    <input 
                       type="number" 
                       value={editFormData.monthlyConsumption} 
                       onChange={(e) => setEditFormData({...editFormData, monthlyConsumption: Number(e.target.value)})}
                       className="bg-black/40 border border-white/20 rounded p-1 text-white w-full mt-1"
                    />
                 ) : (
                    <p className="text-white font-display text-lg">{selectedLead.monthlyConsumption} kWh</p>
                 )}
               </div>
            </div>

            {/* Audit Log / Timeline */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                Histórico de Interações
              </h3>
              <div className="relative border-l border-white/10 ml-2 space-y-6">
                {selectedLead.history.map((log) => (
                  <div key={log.id} className="ml-6 relative">
                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-slate-800 border-2 border-lime-500"></div>
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-semibold text-white">{log.action}</p>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{log.details}</p>
                    <p className="text-[10px] text-slate-600 mt-1 font-medium uppercase">{log.author}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-white/10 bg-slate-900/50">
             <button 
                onClick={() => handleSmartWhatsApp(selectedLead)}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-lg flex justify-center gap-2"
             >
               <Send size={18} /> Iniciar Conversa WhatsApp
             </button>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-8 border border-white/20 shadow-2xl animate-enter">
            <h2 className="text-2xl font-bold text-white mb-6">Cadastrar Novo Lead</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nome da Empresa / Cliente" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-lime-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Telefone" className="bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-lime-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <input type="text" placeholder="Cidade" className="bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-lime-500 outline-none" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Consumo (kWh)" className="bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-lime-500 outline-none" value={formData.consumption} onChange={e => setFormData({...formData, consumption: e.target.value})} />
                <input type="number" placeholder="Valor Estimado (R$)" className="bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-lime-500 outline-none" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsFormOpen(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-medium">Cancelar</button>
              <button onClick={submitNewLead} className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-lg shadow-lime-500/20">Salvar Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;