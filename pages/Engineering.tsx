import React, { useState, useRef } from 'react';
import { HardHat, Link as WebhookIcon, Paperclip, Plus, Loader2, Calendar, FileText, CheckCircle2, X, Tag, Clock, CheckSquare, AlignLeft, User, MapPin, Map, Home, List, Image as ImageIcon, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectStatus } from '../types';
import { supabase } from '../lib/supabaseClient';

const isImageFile = (url: string) => url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i);


const COLUMNS: { id: ProjectStatus; title: string; color: string }[] = [
  { id: 'Vistoria', title: 'Vistoria Técnica', color: 'border-blue-500' },
  { id: 'Projeto', title: 'Projeto', color: 'border-yellow-500' },
  { id: 'Homologacao', title: 'Homologação', color: 'border-purple-500' },
  { id: 'Instalacao', title: 'Instalação Física', color: 'border-orange-500' },
  { id: 'Finalizado', title: 'Finalizado / Ligado', color: 'border-lime-500' },
];

const Engineering: React.FC = () => {
  const { projects, leads, addProject, updateProjectStatus, updateProject, deleteProject } = useApp();
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

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `obras/${selectedObra.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
        
        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);

        const fileDataArray = selectedObra.attachments ? [...selectedObra.attachments, publicUrl] : [publicUrl];
        
        // Update Local Edit State Immediately
        setSelectedObra({ ...selectedObra, attachments: fileDataArray });
        
        // Update Context and Backend
        await updateProject(selectedObra.id, { attachments: fileDataArray });
      } catch (err) {
        console.error("Erro no upload", err);
        alert("Falha no envio do anexo. Certifique-se de ter criado o bucket 'attachments' público no painel do Supabase.");
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

  const fullLead = selectedObra ? leads.find(l => l.id === selectedObra.clientId) : null;


  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] flex flex-col relative animate-enter">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Engenharia e Obras</h1>
          <p className="text-slate-400 mt-1">Gerencie projetos pós-vendas alimentados via CRM.</p>
        </div>
        <button onClick={handleAddObra} className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-colors shadow-[0_0_20px_rgba(163,230,53,0.2)] active:scale-95">
          <Plus size={20} /> Nova Obra Manual
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden custom-scrollbar snap-x-mandatory pb-4 -mx-4 md:mx-0 px-4 md:px-0 flex gap-4 md:gap-6">
        {COLUMNS.map(column => {
          const columnObras = projects.filter(o => o.status === column.id);

          return (
            <div
              key={column.id}
              className={`flex flex-col w-[88vw] sm:w-[320px] shrink-0 h-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative snap-start`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={`p-4 border-t-4 ${column.color} bg-black/40 flex items-center justify-between shrink-0`}>
                <h3 className="font-bold text-white font-display tracking-tight text-sm uppercase">{column.title}</h3>
                <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-bold">{columnObras.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {columnObras.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 gap-2">
                     <HardHat size={24} className="opacity-20" />
                     <p className="text-[11px] font-bold uppercase tracking-wider">Aguardando Obra</p>
                  </div>
                )}
                {columnObras.map(obra => (
                  <div
                    key={obra.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, obra.id)}
                    onClick={() => setSelectedObra(obra)}
                    className="bg-[#0c121a] border border-white/10 hover:border-lime-500/50 p-5 rounded-2xl cursor-pointer shadow-lg active:scale-[0.98] transition-all touch-manipulation relative group"
                  >
                    {obra.attachments && obra.attachments.length > 0 && isImageFile(obra.attachments[0]) && (
                       <div className="w-full h-24 mb-3 rounded-lg overflow-hidden bg-black/50 border border-white/5 relative">
                          <img src={obra.attachments[0]} className="w-full h-full object-cover opacity-80" />
                       </div>
                    )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#22272b] border border-[#a1bdd914] w-full max-w-5xl max-h-[90vh] md:max-h-[90vh] rounded-none md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-enter h-full md:h-auto">
            
            {/* Header/Cover Section */}
            {selectedObra.attachments && selectedObra.attachments.length > 0 && isImageFile(selectedObra.attachments[0]) && (
              <div className="h-48 w-full bg-black relative shrink-0 border-b border-[#a1bdd914]">
                  <img src={selectedObra.attachments[0]} className="w-full h-full object-cover opacity-90" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm font-semibold transition-colors backdrop-blur-md border border-white/10"><ImageIcon size={16}/> Capa</button>
                    <button onClick={() => setSelectedObra(null)} className="bg-black/50 hover:bg-black/80 text-white p-1.5 rounded transition-colors backdrop-blur-md border border-white/10"><X size={20}/></button>
                  </div>
              </div>
            )}

            {!(selectedObra.attachments && selectedObra.attachments.length > 0 && isImageFile(selectedObra.attachments[0])) && (
               <div className="flex justify-between items-center p-4 pb-0 shrink-0">
                  <div className={`h-2 w-full rounded-t-full ${COLUMNS.find(c => c.id === selectedObra.status)?.color.replace('border-', 'bg-')} mr-4`}></div>
                  <button onClick={() => setSelectedObra(null)} className="text-[#8c9bab] hover:text-[#c7d1db] bg-[#a1bdd914] p-1.5 rounded transition-colors"><X size={20}/></button>
               </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row p-6 md:p-8 pt-6 gap-8 text-[#b6c2cf]">
               {/* Left Column (Main Info) */}
               <div className="flex-1">
                  
                  {/* Title & Status */}
                  <div className="flex items-start gap-4 mb-6">
                     <HardHat size={24} className="mt-1 flex-shrink-0" />
                     <div className="flex-1">
                        <input 
                           value={selectedObra.clientName}
                           onChange={e => setSelectedObra({...selectedObra, clientName: e.target.value})}
                           onBlur={e => updateProject(selectedObra.id, { clientName: e.target.value })}
                           className="bg-transparent text-2xl font-bold text-[#c7d1db] outline-none w-full border-2 border-transparent focus:border-[#85b8ff] focus:bg-[#282e33] rounded px-2 py-1 -ml-2 transition-all block placeholder-zinc-600"
                           placeholder="Júlia Tatiana Riego Costa - 800kWh"
                        />
                        <p className="text-sm mt-1 ml-1 text-[#8c9bab]">
                          Na lista <span className="underline cursor-pointer hover:text-[#c7d1db] transition-colors">{COLUMNS.find(c => c.id === selectedObra.status)?.title.toUpperCase()}</span>
                        </p>
                     </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap gap-2 mb-8 ml-0 md:ml-10 mt-4 md:mt-0">
                     <button className="bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 text-[#c7d1db] transition-colors"><Plus size={14}/> Adicionar</button>
                     <button className="bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 text-[#c7d1db] transition-colors"><Tag size={14}/> Etiquetas</button>
                     <button className="bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 text-[#c7d1db] transition-colors"><Clock size={14}/> Datas</button>
                     <button className="bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 text-[#c7d1db] transition-colors"><CheckSquare size={14}/> Checklist</button>
                     <button onClick={toggleWebhook} className={`ml-auto px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors border ${selectedObra.hasWebhook ? 'bg-[#1f3622] text-[#7ee281] hover:bg-[#2f4f34] border-[#1f3622]' : 'bg-[#a1bdd914] hover:bg-[#a1bdd929] text-[#c7d1db] border-transparent'}`} title="Conectar com CRM Externa">
                        <WebhookIcon size={14}/> Evolution API
                     </button>
                  </div>

                  {/* Descrição / Ficha de Cliente */}
                  <div className="flex items-start gap-4 mb-8">
                     <AlignLeft size={24} className="flex-shrink-0" />
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-[16px] font-bold text-[#c7d1db]">Descrição</h3>
                           <button className="bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded text-sm font-bold text-[#c7d1db] transition-colors">Editar</button>
                        </div>
                        
                        <div className="mt-2 mb-6 text-[#c7d1db] space-y-4 text-[15px]">
                           <h4 className="font-bold flex items-center gap-2 text-[16px]"><FileText size={18} /> Ficha de Cliente</h4>
                           
                           <div className="space-y-2 mt-4">
                             <p className="font-bold flex items-center gap-2 text-[14px]"><User size={14} className="text-[#8c9bab]" /> Dados Pessoais</p>
                             <ul className="text-sm space-y-2 ml-6 text-[#8c9bab]">
                               <li className="flex items-center gap-2"><Tag size={12} className="shrink-0 text-yellow-500"/><span className="text-[#c7d1db] font-bold shrink-0">Nome:</span> {selectedObra.clientName.split(' - ')[0] || selectedObra.clientName}</li>
                               <li className="flex items-center gap-2"><FileText size={12} className="shrink-0 text-[#85b8ff]"/><span className="text-[#c7d1db] font-bold shrink-0">CPF/CNPJ:</span> {fullLead?.cpfCnpj || 'Não preenchido'}</li>
                               <li className="flex items-center gap-2"><AlignLeft size={12} className="shrink-0 text-zinc-400"/><span className="text-[#c7d1db] font-bold shrink-0">**RG:**</span> {fullLead?.rg || 'Não preenchido'}</li>
                               <li className="flex items-center gap-2"><Calendar size={12} className="shrink-0 text-red-400"/><span className="text-[#c7d1db] font-bold shrink-0">Data de Expedição:</span> {fullLead?.expeditionDate || 'Não preenchida'}</li>
                               <li className="flex items-center gap-2"><FileText size={12} className="shrink-0 text-orange-400"/><span className="text-[#c7d1db] font-bold shrink-0">Data de Nasc.:</span> {fullLead?.birthDate || 'Não preenchida'}</li>
                             </ul>
                           </div>

                           <div className="space-y-2 pt-4">
                             <p className="font-bold flex items-center gap-2 text-[14px]"><Home size={14} className="text-[#8c9bab]" /> Endereço</p>
                             <ul className="text-sm space-y-2 ml-6 text-[#8c9bab] mb-4">
                               <li className="flex items-center gap-2"><MapPin size={12} className="shrink-0 text-red-500"/><span className="text-[#c7d1db] font-bold shrink-0">Logradouro:</span> {fullLead?.street || 'Não preenchido'}</li>
                               <li className="flex items-center gap-2"><Home size={12} className="shrink-0 text-orange-300"/><span className="text-[#c7d1db] font-bold shrink-0">Bairro:</span> {fullLead?.neighborhood || 'Não preenchido'}</li>
                               <li className="flex items-center gap-2"><Map size={12} className="shrink-0 text-orange-400"/><span className="text-[#c7d1db] font-bold shrink-0">Cidade:</span> {fullLead?.city || selectedObra.city || 'Desconhecida'}</li>
                               <li className="flex items-center gap-2"><Map size={12} className="shrink-0 text-[#85b8ff]"/><span className="text-[#c7d1db] font-bold shrink-0">Estado:</span> {fullLead?.state || 'Não preenchido'}</li>
                               <li className="flex items-center gap-2"><Tag size={12} className="shrink-0 text-zinc-400"/><span className="text-[#c7d1db] font-bold shrink-0">CEP:</span> {fullLead?.zipCode || 'Não preenchido'}</li>
                             </ul>
                           </div>
                           
                           <button className="w-full py-2 bg-[#a1bdd914] hover:bg-[#a1bdd929] rounded text-sm text-[#8c9bab] font-semibold transition-colors flex justify-center items-center gap-2 mt-2"> Mostrar mais</button>
                        </div>
                     </div>
                  </div>

                  {/* Anexos */}
                  <div className="flex items-start gap-4 mb-4">
                     <Paperclip size={24} className="flex-shrink-0" />
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-[16px] font-bold text-[#c7d1db]">Anexos</h3>
                           <button onClick={() => fileInputRef.current?.click()} className="bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded text-sm font-bold text-[#c7d1db] transition-colors flex items-center gap-2 relative">
                              {isUploading ? <Loader2 size={14} className="animate-spin text-[#c7d1db]" /> : null} Adicionar
                              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                           </button>
                        </div>
                        
                        <div className="space-y-3">
                           {(!selectedObra.attachments || selectedObra.attachments.length === 0) && (
                              <p className="text-sm text-[#8c9bab] py-4 bg-[#a1bdd914] rounded px-4">Nenhum anexo ainda. Adicione fotos do local ou PDFs de projeto.</p>
                           )}
                           {selectedObra.attachments?.map((att, idx) => (
                             <div key={idx} className="flex gap-4 p-2 hover:bg-[#a1bdd914] rounded-lg transition-colors group relative cursor-pointer">
                                 <div className="w-32 h-20 bg-[#091e42] rounded-lg shrink-0 overflow-hidden border border-[#a1bdd914]">
                                    {isImageFile(att) ? (
                                      <a href={att} target="_blank" rel="noopener noreferrer"><img src={att} className="w-full h-full object-cover" /></a>
                                    ) : (
                                      <a href={att} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center bg-[#282e33] text-zinc-500 hover:text-lime-400 border border-white/5 transition-colors"><FileText size={20}/></a>
                                    )}
                                 </div>
                                 <div className="flex-1 py-1 flex flex-col justify-center">
                                    <p className="font-bold text-[15px] text-[#c7d1db] mb-1 leading-tight flex justify-between items-start">
                                       <span className="truncate pr-4 leading-relaxed hover:underline">
                                          {(idx === 0) ? 'Imagem do WhatsApp de 2025-11-26 à(s) 15.29.13_ae15b229.jpg' : `Anexo Adicional _ Quark_${idx+1}.jpg`}
                                       </span>
                                       <button className="text-[#8c9bab] hover:text-[#c7d1db] p-1 bg-[#a1bdd914] hover:bg-[#a1bdd929] rounded shrink-0 transition-colors hidden group-hover:block"><MoreHorizontal size={16}/></button>
                                    </p>
                                    <p className="text-[13px] text-[#8c9bab] mb-2 flex items-center gap-2">
                                       Adicionado há {new Date().toLocaleDateString()} 
                                       {idx === 0 && <span className="flex items-center gap-1 font-semibold text-[#c7d1db] ml-2"><ImageIcon size={12}/> Capa</span>}
                                    </p>
                                    <div className="flex gap-2 text-[13px] font-semibold text-[#8c9bab] underline">
                                       <button className="hover:text-[#c7d1db] transition-colors text-left flex items-center gap-1"><MessageSquare size={12} className="no-underline text-transparent"/>Comentar</button>
                                       <span>•</span>
                                       <button className="hover:text-[#c7d1db] transition-colors text-left" onClick={(e) => {
                                          e.stopPropagation();
                                          if(window.confirm("Remover este anexo?")) {
                                            const newAtt = selectedObra.attachments!.filter((_, i) => i !== idx);
                                            setSelectedObra({...selectedObra, attachments: newAtt});
                                            updateProject(selectedObra.id, { attachments: newAtt });
                                          }
                                       }}>Excluir</button>
                                       <span>•</span>
                                       <button className="hover:text-[#c7d1db] transition-colors text-left">Editar</button>
                                    </div>
                                 </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Column (Sidebar Activity / Comments) */}
               <div className="w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-[#a1bdd914] pt-6 md:pt-0 md:pl-8 flex flex-col">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#a1bdd914]">
                     <h3 className="text-[16px] font-bold text-[#c7d1db] flex items-center gap-2"><MessageSquare size={18}/> Comentários e atividade</h3>
                     <button className="text-[13px] font-semibold text-[#c7d1db] bg-[#a1bdd914] hover:bg-[#a1bdd929] px-3 py-1.5 rounded transition-colors">Mostrar Detalhes</button>
                  </div>

                  {/* Comment Input Box */}
                  <div className="flex gap-3 mb-8">
                     <div className="w-8 h-8 rounded-full bg-[#c9372c] flex items-center justify-center text-white font-bold text-xs shrink-0 ring-2 ring-[#22272b]">
                        AA
                     </div>
                     <div className="flex-1 bg-[#22272b] border border-[#a1bdd914] rounded-lg overflow-hidden focus-within:border-[#85b8ff] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.1)] hover:bg-[#282e33]">
                        <textarea placeholder="Escrever um comentário..." className="w-full bg-transparent text-[15px] p-3 outline-none resize-none h-11 min-h-[44px] focus:min-h-[90px] transition-all text-[#c7d1db] placeholder:text-[#8c9bab]"></textarea>
                     </div>
                  </div>

                  {/* Feed */}
                  <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
                     <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#c9372c] flex items-center justify-center text-white font-bold text-xs shrink-0 mt-1">
                            AA
                         </div>
                         <div className="flex-1">
                            <p className="text-[14px]">
                              <span className="font-bold text-[#c7d1db]">Anderson Alves</span> 
                              <span className="text-[#8c9bab] text-xs ml-2 hover:underline cursor-pointer">29 de nov. de 2025, 08:45</span>
                            </p>
                            <div className="bg-[#22272b] border border-[#a1bdd914] rounded-lg p-3 mt-1.5 text-[15px] text-[#c7d1db] shadow-sm font-medium">
                               SUBMETIDO: 20251129000139228
                            </div>
                            <div className="flex gap-2 text-[13px] font-semibold text-[#8c9bab] underline mt-1.5 ml-1">
                               <MapPin size={12} className="no-underline text-transparent shrink-0" /> {/* Spacer */}
                               <span className="no-underline text-[#8c9bab]/50 mr-1 text-[10px]">🙂</span>
                               <span className="no-underline text-[#8c9bab]/50 mr-1">•</span>
                               <button className="hover:text-[#c7d1db] transition-colors text-left mt-1">Responder</button>
                               <span className="no-underline text-[#8c9bab]/50 mx-1 mt-1">•</span>
                               <button className="hover:text-[#c7d1db] transition-colors text-left mt-1">Excluir</button>
                            </div>
                         </div>
                     </div>
                     
                     <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#c9372c] flex items-center justify-center text-white font-bold text-xs shrink-0 mt-1">
                            AA
                         </div>
                         <div className="text-[14px] text-[#8c9bab] leading-relaxed">
                            <p>
                               <span className="font-bold text-[#c7d1db]">Anderson Alves</span> adicionou este cartão a {COLUMNS.find(c => c.id === selectedObra.status)?.title.toUpperCase() || 'LEVANTAMENTO DE DADOS'}
                            </p>
                            <p className="text-[13px] mt-0.5 hover:underline cursor-pointer text-[#85b8ff]">27 de nov. de 2025, 08:58</p>
                         </div>
                     </div>

                     <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#1b5e20] flex items-center justify-center text-white font-bold text-xs shrink-0 mt-1">
                            QS
                         </div>
                         <div className="text-[14px] text-[#8c9bab] leading-relaxed">
                            <p>
                               <span className="font-bold text-[#c7d1db]">Quark System</span> gerou este projeto via gatilho do CRM Comercial.
                            </p>
                            <p className="text-[13px] mt-0.5 hover:underline cursor-pointer text-[#85b8ff]">Venda Efetuada</p>
                         </div>
                     </div>
                  </div>

               </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default Engineering;
