import React, { useState, useRef } from 'react';
import { HardHat, Link as WebhookIcon, Paperclip, Plus, Loader2, Calendar, FileText, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectStatus } from '../types';

const COLUMNS: { id: ProjectStatus; title: string; color: string }[] = [
  { id: 'Vistoria', title: 'Vistoria Técnica', color: 'border-blue-500' },
  { id: 'Projeto', title: 'Projeto', color: 'border-yellow-500' },
  { id: 'Homologacao', title: 'Homologação', color: 'border-purple-500' },
  { id: 'Instalacao', title: 'Instalação Física', color: 'border-orange-500' },
  { id: 'Finalizado', title: 'Finalizado / Ligado', color: 'border-lime-500' },
];

const Engineering: React.FC = () => {
  const { projects, addProject, updateProjectStatus, updateProject, deleteProject } = useApp();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Modal de Detalhes da Obra
  const [selectedObra, setSelectedObra] = useState<Project | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    if (draggedId) {
      updateProjectStatus(draggedId, status);
      setDraggedId(null);
    }
  };

  const handleAddObra = async () => {
    await addProject({
      clientName: 'Nova Obra Manual (Editar)',
      city: 'A Definir',
      systemSizeKw: 0,
      status: 'Vistoria',
      attachments: [],
      hasWebhook: false
    });
  };

  // Convert File to Base64 String format
  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedObra) {
      setIsUploading(true);
      try {
        const file = e.target.files[0];
        // Only allow small files if Base64, but since it's an MVP let's allow images
        if (file.size > 2 * 1024 * 1024) {
             alert("Aviso: Limite seguro do modo demo é 2MB por arquivo.");
             setIsUploading(false);
             return;
        }

        const base64Str = await getBase64(file);
        const fileDataArray = selectedObra.attachments ? [...selectedObra.attachments, base64Str] : [base64Str];
        
        // Update Local Edit State Immediately
        setSelectedObra({ ...selectedObra, attachments: fileDataArray });
        
        // Update Context and Backend
        await updateProject(selectedObra.id, { attachments: fileDataArray });
      } catch (err) {
        console.error("Erro no upload", err);
        alert("Falha no envio do anexo. Caso o arquivo seja PDF gigante, prefira compactar.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const toggleWebhook = async () => {
    if (!selectedObra) return;
    const newStatus = !selectedObra.hasWebhook;
    setSelectedObra({ ...selectedObra, hasWebhook: newStatus });
    await updateProject(selectedObra.id, { hasWebhook: newStatus });
    if(newStatus) alert('Webhook vinculado! Integrado a Evolution API. (Fake)');
  };

  const renderThumb = (base64str: string) => {
      if(base64str.startsWith('data:image')) {
          return <img src={base64str} className="w-full h-24 object-cover rounded-xl border border-white/10" alt="Anexo" />;
      }
      return <div className="w-full h-24 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 border border-white/10 flex-col gap-2"><FileText size={24} /> <span className="text-[10px] font-bold">Documento</span></div>;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col relative animate-enter pb-10">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Engenharia e Obras</h1>
          <p className="text-slate-400 mt-1">Gerencie projetos pós-vendas alimentados via CRM.</p>
        </div>
        <button onClick={handleAddObra} className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-colors shadow-[0_0_20px_rgba(163,230,53,0.2)] active:scale-95">
          <Plus size={20} /> Nova Obra Manual
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 -mx-4 md:mx-0 px-4 md:px-0 flex gap-6">
        {COLUMNS.map(column => {
          const columnObras = projects.filter(o => o.status === column.id);

          return (
            <div
              key={column.id}
              className={`flex flex-col w-[320px] shrink-0 h-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={`p-4 border-t-4 ${column.color} bg-black/40 flex items-center justify-between shrink-0`}>
                <h3 className="font-bold text-white font-display tracking-tight text-sm uppercase">{column.title}</h3>
                <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-bold">{columnObras.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {columnObras.map(obra => (
                  <div
                    key={obra.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, obra.id)}
                    onClick={() => setSelectedObra(obra)}
                    className="bg-[#0c121a] border border-white/10 hover:border-lime-500/50 p-5 rounded-2xl cursor-pointer shadow-lg active:scale-[0.98] transition-all touch-manipulation relative group"
                  >
                    <h4 className="font-bold text-white mb-2 leading-tight group-hover:text-lime-400 transition-colors">{obra.clientName}</h4>
                    <p className="text-xs text-zinc-500 mb-4">{obra.city} • <span className="font-bold text-zinc-400">{obra.systemSizeKw.toFixed(2)} kWp</span></p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                       <div className="flex gap-3 text-xs text-zinc-500 font-medium">
                          <span className={`flex items-center gap-1 hover:text-white transition-colors ${(obra.attachments?.length || 0) > 0 ? 'text-blue-400' : ''}`}>
                            <Paperclip size={14} /> {obra.attachments?.length || 0}
                          </span>
                          <span className={`flex items-center gap-1 hover:text-white transition-colors ${obra.hasWebhook ? 'text-lime-400' : ''}`} title="Webhook de Notificação ativado">
                            <WebhookIcon size={14} />
                          </span>
                       </div>
                       <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase shadow-sm">
                         {obra.clientName.substring(0, 1)}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Card Panel da Obra */}
      {selectedObra && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0a0f16] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-enter">
             <div className={`h-2 w-full ${COLUMNS.find(c => c.id === selectedObra.status)?.color.replace('border-', 'bg-')}`}></div>
             <div className="p-8 pb-4 shrink-0 flex justify-between items-start">
                  <div className="w-full">
                     <input 
                       value={selectedObra.clientName}
                       onChange={e => setSelectedObra({...selectedObra, clientName: e.target.value})}
                       onBlur={e => updateProject(selectedObra.id, { clientName: e.target.value })}
                       className="bg-transparent text-2xl font-bold font-display text-white outline-none w-full border-b border-transparent focus:border-lime-500/50 hover:border-white/10 transition-colors placeholder-zinc-700"
                       placeholder="Nome da Obra / ID"
                     />
                     <div className="flex gap-4 mt-3 text-sm font-medium text-zinc-500">
                        <span className="flex items-center gap-1"><HardHat size={16}/> {selectedObra.systemSizeKw.toFixed(2)} kWp</span>
                        <span className="flex items-center gap-1"><Calendar size={16}/> Modificado: {new Date(selectedObra.updatedAt).toLocaleDateString()}</span>
                     </div>
                  </div>
                  <button onClick={() => setSelectedObra(null)} className="p-2 ml-4 bg-white/5 text-zinc-400 hover:text-white rounded-lg"><X size={20}/></button>
             </div>

             <div className="p-8 py-2 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-6 mb-8">
                   <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Fase Atual</p>
                      <select 
                         value={selectedObra.status}
                         onChange={async e => {
                           const s = e.target.value as ProjectStatus;
                           setSelectedObra({...selectedObra, status: s});
                           await updateProjectStatus(selectedObra.id, s);
                         }}
                         className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white outline-none hover:border-zinc-700 transition-colors focus:border-lime-500"
                      >
                        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                   </div>
                   <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Engenharia Autônoma</p>
                      <button 
                        onClick={toggleWebhook}
                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-all border ${selectedObra.hasWebhook ? 'bg-lime-500/10 border-lime-500/30 text-lime-400' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'}`}
                      >
                        <WebhookIcon size={18} /> {selectedObra.hasWebhook ? 'Webhook Ativo' : 'Vincular Webhook'}
                      </button>
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-4">
                     <p className="text-sm font-bold text-white flex items-center gap-2">
                       <FileText size={18} className="text-lime-400" />
                       Projetos, ARTs e Plantas
                     </p>
                     <p className="text-xs font-bold bg-zinc-800 px-2 py-1 flex items-center gap-1 text-zinc-400 rounded-lg">
                       <Paperclip size={12} /> {selectedObra.attachments?.length || 0} Arquivos
                     </p>
                   </div>
                   
                   <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-lime-500/30 transition-all cursor-pointer group" onClick={() => !isUploading && fileInputRef.current?.click()}>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                      {isUploading ? (
                         <Loader2 size={32} className="text-lime-500 animate-spin mb-4" />
                      ) : (
                         <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 group-hover:bg-lime-500/20 group-hover:text-lime-400 transition-all">
                           <Plus size={32} />
                         </div>
                      )}
                      <p className="font-bold text-white text-sm mb-1">{isUploading ? 'Codificando em Base64...' : 'Clique para subir uma foto ou PDF'}</p>
                      <p className="text-xs text-zinc-500">Máx 2MB neste ambiente Beta. PNG, JPG ou PDF.</p>
                   </div>

                   {/* Attachment Preview Grid */}
                   {selectedObra.attachments && selectedObra.attachments.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mt-6">
                         {selectedObra.attachments.map((base64str, idx) => (
                             <div key={idx} className="relative group">
                                {renderThumb(base64str)}
                                <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const newAtt = selectedObra.attachments!.filter((_, i) => i !== idx);
                                      setSelectedObra({...selectedObra, attachments: newAtt});
                                      updateProject(selectedObra.id, { attachments: newAtt });
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                ><X size={14}/></button>
                             </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
             
             <div className="p-6 bg-black/40 border-t border-white/5 flex gap-4 shrink-0 mt-4 rounded-b-3xl">
                <button 
                  onClick={async () => {
                     if(window.confirm("Deseja deletar permanentemente esta obra?")) {
                       await deleteProject(selectedObra.id);
                       setSelectedObra(null);
                     }
                  }}
                  className="px-6 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-colors"
                >
                   Excluir Obra
                </button>
                <div className="flex-1"></div>
                <button onClick={() => setSelectedObra(null)} className="px-8 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)] active:scale-95 transition-all">
                   Pronto
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Engineering;
