import React, { useState } from 'react';
import { X, Edit2, Save, Trash2, Sparkles, Copy, Check, Loader2, Clock, Send, Tag, Building2, User, ChevronDown } from 'lucide-react';
import { Lead, LeadStatus, Tag as TagType, PipelineStage } from '../types';
import { useApp } from '../contexts/AppContext';
import { LeadCPQPanel } from './LeadCPQPanel';

type TabType = 'detalhes' | 'empresa' | 'proposta';

interface LeadDetailsPanelProps {
    selectedLead: Lead;
    isEditing: boolean;
    editingData: Partial<Lead>;
    stages: PipelineStage[];
    aiProposal: string;
    isGeneratingAI: boolean;
    isCopied: boolean;
    onClose: () => void;
    onEditToggle: () => void;
    onSave: () => void;
    onDelete: (e: React.MouseEvent) => void;
    onDataChange: (data: Partial<Lead>) => void;
    onGenerateAI: () => void;
    onCopyAI: () => void;
    onClearAI: () => void;
    onWhatsApp: (lead: Lead) => void;
}

export const LeadDetailsPanel: React.FC<LeadDetailsPanelProps> = ({
    selectedLead,
    isEditing,
    editingData,
    stages,
    aiProposal,
    isGeneratingAI,
    isCopied,
    onClose,
    onEditToggle,
    onSave,
    onDelete,
    onDataChange,
    onGenerateAI,
    onCopyAI,
    onClearAI,
    onWhatsApp,
}) => {
    const { tags: allTags, updateLeadTags } = useApp();
    const [activeTab, setActiveTab] = useState<TabType>('detalhes');
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [quickStatus, setQuickStatus] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const leadTags: TagType[] = selectedLead.tags || [];

    const toggleTag = async (tag: TagType) => {
        const exists = leadTags.some(t => t.id === tag.id);
        const newTags = exists ? leadTags.filter(t => t.id !== tag.id) : [...leadTags, tag];
        await updateLeadTags(selectedLead.id, newTags);
    };

    const formatCnpj = (v: string) => {
        const d = v.replace(/\D/g, '').substring(0, 14);
        return d
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity" onClick={onClose}></div>
            <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#0c121a]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-[60] animate-enter flex flex-col">

                {/* Header */}
                <div className="p-4 sm:p-6 md:p-8 border-b border-white/5 flex justify-between items-start bg-black/20">
                    <div className="flex-1 pr-4">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editingData.name}
                                onChange={(e) => onDataChange({ ...editingData, name: e.target.value })}
                                className="bg-zinc-800 border border-zinc-700 rounded p-2 text-xl font-bold text-white w-full mb-2 outline-none focus:border-lime-500"
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-white mb-2 font-display tracking-tight">{selectedLead.name}</h2>
                        )}

                        <div className="flex gap-2 flex-wrap">
                            {isEditing ? (
                                <select
                                    value={editingData.status}
                                    onChange={(e) => onDataChange({ ...editingData, status: e.target.value as LeadStatus })}
                                    className="bg-zinc-800 border border-zinc-700 rounded p-1 text-xs text-lime-400 font-bold uppercase tracking-wide outline-none"
                                >
                                    {stages.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                            ) : (
                                <span className="px-3 py-1 rounded-lg text-[11px] bg-lime-500/10 text-lime-400 border border-lime-500/20 font-bold uppercase tracking-wider">{stages.find(s => s.id === selectedLead.status)?.name || selectedLead.status}</span>
                            )}
                            {!isEditing && (
                                <span className="px-3 py-1 rounded-lg text-[11px] bg-white/5 text-zinc-300 border border-white/10 font-medium">{selectedLead.city}</span>
                            )}
                            {isEditing && (
                                <input type="text" value={editingData.city} onChange={(e) => onDataChange({ ...editingData, city: e.target.value })}
                                    className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-xs text-white w-32 outline-none" />
                            )}
                        </div>

                        {/* Tags inline */}
                        <div className="flex flex-wrap gap-1.5 mt-3 items-center">
                            {leadTags.map(tag => (
                                <span key={tag.id} onClick={() => toggleTag(tag)}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-70"
                                    style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}>
                                    {tag.name} ×
                                </span>
                            ))}
                            <div className="relative">
                                <button onClick={() => setShowTagDropdown(!showTagDropdown)}
                                    className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/10 transition-all">
                                    <Tag size={10} /> Adicionar tag <ChevronDown size={10} />
                                </button>
                                {showTagDropdown && (
                                    <div className="absolute top-full mt-1.5 left-0 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px] animate-enter">
                                        {allTags.map(tag => {
                                            const active = leadTags.some(t => t.id === tag.id);
                                            return (
                                                <button key={tag.id} onClick={() => toggleTag(tag)}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 transition-colors text-left">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                                    <span className={active ? 'text-white font-bold' : 'text-zinc-400'}>{tag.name}</span>
                                                    {active && <Check size={10} className="ml-auto text-lime-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {!isEditing && <button onClick={onEditToggle} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><Edit2 size={20} /></button>}
                        {isEditing && <button onClick={onSave} className="p-2 text-lime-400 hover:bg-lime-500/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><Save size={20} /></button>}
                        {!deleteConfirm ? (
                          <button onClick={() => setDeleteConfirm(true)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir lead"><Trash2 size={20} /></button>
                        ) : (
                          <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
                            <span className="text-xs text-red-400 font-bold">Excluir?</span>
                            <button onClick={(e) => { onDelete(e); }} className="text-xs font-bold text-white bg-red-500 hover:bg-red-400 px-2 py-0.5 rounded transition-colors">Sim</button>
                            <button onClick={() => setDeleteConfirm(false)} className="text-xs text-zinc-400 hover:text-white px-1 py-0.5 rounded transition-colors">Não</button>
                          </div>
                        )}
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={24} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-6 bg-black/10">
                    {(['detalhes', 'empresa', 'proposta'] as TabType[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                                activeTab === tab ? 'border-lime-500 text-lime-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}>
                            {tab === 'detalhes' ? <><User size={12} /> Detalhes</> : tab === 'empresa' ? <><Building2 size={12} /> Empresa</> : <><Sparkles size={12} /> Proposta CPQ</>}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">

                    {/* ABA DETALHES */}
                    {activeTab === 'detalhes' && (
                        <div className="space-y-8">
                            {/* AI Assistant */}
                            <div className="relative group/ai">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-3xl blur opacity-30 group-hover/ai:opacity-60 transition duration-500"></div>
                                <div className="relative p-6 rounded-3xl bg-black/40 border border-white/10 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                                    <div className="flex justify-between items-center mb-5 relative z-10">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <div className="p-1.5 bg-lime-500/20 rounded-lg"><Sparkles size={16} className="text-lime-400" /></div>
                                            Quark AI Assistant
                                        </h3>
                                        {aiProposal && (
                                            <button onClick={onCopyAI} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 min-w-[44px] min-h-[44px]">
                                                {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                {isCopied ? 'Copiado!' : 'Copiar'}
                                            </button>
                                        )}
                                    </div>
                                    {!aiProposal ? (
                                        <div className="text-center py-6 relative z-10">
                                            <p className="text-[13px] text-zinc-400 mb-6 leading-relaxed max-w-sm mx-auto">Analise o histórico deste lead e gere uma mensagem comercial altamente persuasiva.</p>
                                            <button onClick={onGenerateAI} disabled={isGeneratingAI}
                                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-lime-400 font-bold transition-all flex justify-center items-center gap-2 min-w-[44px] min-h-[44px]">
                                                {isGeneratingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                                {isGeneratingAI ? 'Analisando...' : 'Gerar Proposta Persuasiva'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative z-10 animate-enter">
                                            <textarea value={aiProposal} readOnly
                                                className="w-full h-48 bg-black/60 border border-lime-500/20 rounded-xl p-4 text-[13px] text-zinc-300 outline-none resize-none leading-relaxed custom-scrollbar" />
                                            <div className="flex gap-3 mt-4">
                                                <button onClick={onClearAI} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">Descartar</button>
                                                <button onClick={() => onWhatsApp(selectedLead)}
                                                    className="flex-1 py-2 text-xs bg-lime-500 hover:bg-lime-400 text-black rounded-xl font-bold transition-all flex justify-center items-center gap-2">
                                                    <Send size={14} /> Enviar no WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Campos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Telefone</label>
                                    {isEditing ? (
                                        <input type="text" value={editingData.phone || ''} onChange={(e) => onDataChange({ ...editingData, phone: e.target.value })}
                                            className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none" />
                                    ) : (
                                        <p className="text-zinc-200 font-display text-[15px] font-medium">{selectedLead.phone}</p>
                                    )}
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">E-mail</label>
                                    {isEditing ? (
                                        <input type="email" value={editingData.email || ''} onChange={(e) => onDataChange({ ...editingData, email: e.target.value })}
                                            className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none" placeholder="email@exemplo.com" />
                                    ) : (
                                        <p className="text-zinc-200 text-[13px] font-medium break-all">{selectedLead.email || <span className="text-zinc-600 italic">Não informado</span>}</p>
                                    )}
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Origem do Lead</label>
                                    {isEditing ? (
                                        <select value={editingData.source || ''} onChange={(e) => onDataChange({ ...editingData, source: e.target.value })}
                                            className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none text-xs">
                                            <option value="">Desconhecido</option>
                                            <option value="Google Ads">Google Ads</option>
                                            <option value="Instagram">Instagram</option>
                                            <option value="Indicação">Indicação</option>
                                            <option value="Porta a Porta">Porta a Porta</option>
                                            <option value="Outro">Outro</option>
                                        </select>
                                    ) : (
                                        <p className="text-zinc-200 text-[13px] font-medium break-all">{selectedLead.source || <span className="text-zinc-600 italic">Desconhecida</span>}</p>
                                    )}
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Endereço Completo</label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <input type="text" value={editingData.zipCode || ''} onChange={(e) => onDataChange({ ...editingData, zipCode: e.target.value })}
                                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none text-xs" placeholder="CEP" />
                                            <input type="text" value={editingData.street || ''} onChange={(e) => onDataChange({ ...editingData, street: e.target.value })}
                                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none text-xs col-span-2 md:col-span-3" placeholder="Rua / Logradouro, Número" />
                                            <input type="text" value={editingData.neighborhood || ''} onChange={(e) => onDataChange({ ...editingData, neighborhood: e.target.value })}
                                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none text-xs col-span-2 md:col-span-3" placeholder="Bairro" />
                                            <input type="text" value={editingData.state || ''} onChange={(e) => onDataChange({ ...editingData, state: e.target.value })}
                                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none text-xs" placeholder="UF" />
                                        </div>
                                    ) : (
                                        <p className="text-zinc-300 text-[13px]">{[selectedLead.street, selectedLead.neighborhood, selectedLead.city, selectedLead.state, selectedLead.zipCode].filter(Boolean).join(', ') || <span className="text-zinc-600 italic">Apenas cidade informada ({selectedLead.city})</span>}</p>
                                    )}
                                </div>
                                <div className="p-5 rounded-2xl bg-lime-500/5 border border-lime-500/10 hover:bg-lime-500/10 transition-colors sm:col-span-2">
                                    <label className="text-[10px] text-lime-600/80 uppercase font-bold tracking-wider mb-1 block">Valor Agregado (R$)</label>
                                    {isEditing ? (
                                        <input type="text" value={editingData.value ? editingData.value.toString() : ''}
                                            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); onDataChange({ ...editingData, value: v ? Number(v) : 0 }); }}
                                            className="bg-black/50 border border-lime-500/30 rounded-lg p-1.5 text-lime-400 w-full outline-none font-bold" placeholder="Ex: 45000" />
                                    ) : (
                                        <p className="text-lime-400 font-display text-lg font-bold">R$ {selectedLead.value.toLocaleString()}</p>
                                    )}
                                </div>
                                {/* Próximo Passo */}
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                                    <label className="text-[10px] text-amber-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                                      <Clock size={12} /> Próximo Passo
                                    </label>
                                    {isEditing ? (
                                      <div className="flex gap-2">
                                        <input type="date" value={editingData.nextActionDate || ''} onChange={(e) => onDataChange({ ...editingData, nextActionDate: e.target.value })}
                                          className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white outline-none text-xs flex-1" />
                                        <select value={editingData.nextActionType || ''} onChange={(e) => onDataChange({ ...editingData, nextActionType: e.target.value as any })}
                                          className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white outline-none text-xs flex-1">
                                          <option value="">Selecione Ação</option>
                                          <option value="Ligar">Ligar</option>
                                          <option value="Reunião">Reunião</option>
                                          <option value="WhatsApp">WhatsApp</option>
                                          <option value="Visita">Visita</option>
                                          <option value="Outro">Outro</option>
                                        </select>
                                      </div>
                                    ) : (
                                      <p className="text-zinc-300 text-[13px]">
                                        {selectedLead.nextActionDate 
                                          ? `${selectedLead.nextActionType || 'Ação'} em ${new Date(selectedLead.nextActionDate).toLocaleDateString()}` 
                                          : <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded">Nenhuma ação pendente! Lead pode esfriar.</span>
                                        }
                                      </p>
                                    )}
                                </div>
                                {/* Motivo de Perda */}
                                {((isEditing && editingData.status === 'Perdido') || (!isEditing && selectedLead.status === 'Perdido')) && (
                                  <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors sm:col-span-2">
                                      <label className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                                        Motivo da Perda
                                      </label>
                                      {isEditing ? (
                                        <select value={editingData.lossReason || ''} onChange={(e) => onDataChange({ ...editingData, lossReason: e.target.value })}
                                          className="bg-black/50 border border-red-500/30 rounded-lg p-1.5 text-white outline-none text-xs w-full">
                                          <option value="">Selecione o Motivo</option>
                                          <option value="Preço Alto">Preço Alto</option>
                                          <option value="Concorrente">Concorrente</option>
                                          <option value="Sem Aprovação de Crédito">Sem Aprovação de Crédito</option>
                                          <option value="Desistiu">Desistiu</option>
                                          <option value="Outro">Outro</option>
                                        </select>
                                      ) : (
                                        <p className="text-red-400 text-[13px] font-bold">
                                          {selectedLead.lossReason || <span className="text-red-400/50 italic">Não informado</span>}
                                        </p>
                                      )}
                                  </div>
                                )}
                            </div>

                            {/* Notas */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Edit2 size={16} className="text-lime-400" />Anotações</h3>
                                {isEditing ? (
                                    <textarea value={editingData.notes || ''} onChange={(e) => onDataChange({ ...editingData, notes: e.target.value })}
                                        className="w-full bg-black/50 border border-zinc-700/50 rounded-xl p-3 text-[13px] text-zinc-300 outline-none min-h-[100px] focus:border-lime-500 transition-colors custom-scrollbar"
                                        placeholder="Adicione notas, preferências ou o que foi conversado..." />
                                ) : (
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 min-h-[80px]">
                                        {selectedLead.notes
                                            ? <p className="text-[13px] text-zinc-400 whitespace-pre-wrap">{selectedLead.notes}</p>
                                            : <p className="text-[12px] text-zinc-600 italic">Nenhuma anotação registrada ainda.</p>}
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock size={16} className="text-lime-400" />Linha do Tempo</h3>
                                <div className="mb-6 flex gap-2">
                                    <input type="text" placeholder="Registrar novo status ou interação..." 
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-lime-500"
                                        value={quickStatus} onChange={e => setQuickStatus(e.target.value)} 
                                        onKeyDown={(e) => { if (e.key === 'Enter' && quickStatus.trim()) { useApp().addLeadLog(selectedLead.id, 'Atualização', quickStatus.trim()); setQuickStatus(''); } }} />
                                    <button onClick={() => { if (quickStatus.trim()) { useApp().addLeadLog(selectedLead.id, 'Atualização', quickStatus.trim()); setQuickStatus(''); } }} 
                                        className="bg-lime-500 hover:bg-lime-400 text-black rounded-xl px-4 font-bold transition-all"><Send size={16}/></button>
                                </div>
                                <div className="relative border-l border-zinc-800 ml-2 space-y-8">
                                    {selectedLead.history.map((log) => (
                                        <div key={log.id} className="ml-8 relative">
                                            <div className="absolute -left-[37px] top-1.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-lime-500/50 shadow-[0_0_10px_rgba(163,230,53,0.2)]"></div>
                                            <div className="flex flex-col">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="text-sm font-bold text-zinc-200">{log.action}</p>
                                                    <span className="text-[10px] text-zinc-600 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{log.details}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-400">{log.author.substring(0, 1)}</div>
                                                    <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide">{log.author}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA EMPRESA */}
                    {activeTab === 'empresa' && (
                        <div className="space-y-6">
                            {/* Toggle PF / PJ */}
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">Tipo de Pessoa</label>
                                <div className="flex gap-2">
                                    {(['PF', 'PJ'] as const).map(type => (
                                        <button key={type}
                                            onClick={() => onDataChange({ ...editingData, personType: type })}
                                            className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all ${
                                                (editingData.personType ?? selectedLead.personType ?? 'PF') === type
                                                    ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                                                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'
                                            }`}>{type === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Campos PJ */}
                            {(editingData.personType ?? selectedLead.personType ?? 'PF') === 'PJ' && (
                                <>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">Razão Social</label>
                                        <input type="text"
                                            value={editingData.companyName ?? selectedLead.companyName ?? ''}
                                            onChange={(e) => onDataChange({ ...editingData, companyName: e.target.value })}
                                            placeholder="Nome da empresa"
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">CNPJ</label>
                                            <input type="text"
                                                value={editingData.cnpj ?? selectedLead.cnpj ?? ''}
                                                onChange={(e) => onDataChange({ ...editingData, cnpj: formatCnpj(e.target.value) })}
                                                placeholder="00.000.000/0000-00"
                                                maxLength={18}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600 font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">Inscrição Estadual</label>
                                            <input type="text"
                                                value={editingData.stateRegistration ?? selectedLead.stateRegistration ?? ''}
                                                onChange={(e) => onDataChange({ ...editingData, stateRegistration: e.target.value })}
                                                placeholder="Ex: 123.456.789.000"
                                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600 font-mono" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Campos PF */}
                            {(editingData.personType ?? selectedLead.personType ?? 'PF') === 'PF' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">CPF</label>
                                        <input type="text"
                                            value={editingData.cpfCnpj ?? selectedLead.cpfCnpj ?? ''}
                                            onChange={(e) => onDataChange({ ...editingData, cpfCnpj: e.target.value })}
                                            placeholder="000.000.000-00"
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">RG</label>
                                        <input type="text"
                                            value={editingData.rg ?? selectedLead.rg ?? ''}
                                            onChange={(e) => onDataChange({ ...editingData, rg: e.target.value })}
                                            placeholder="00.000.000-0"
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-lime-500 outline-none transition-all placeholder-zinc-600 font-mono" />
                                    </div>
                                </div>
                            )}

                            {/* Botão salvar empresa */}
                            <button onClick={onSave}
                                className="w-full py-3 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 text-lime-400 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[44px] min-h-[44px]">
                                <Save size={16} /> Salvar Dados da Empresa
                            </button>
                        </div>
                    )}
                    
                    {/* ABA CPQ PROPOSTA */}
                    {activeTab === 'proposta' && (
                        <LeadCPQPanel 
                            lead={selectedLead} 
                            onUpdateLead={(data) => onDataChange({...editingData, ...data})} 
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-white/10 bg-zinc-900/90 backdrop-blur-md flex-shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}>
                    <button onClick={() => onWhatsApp(selectedLead)}
                        className="w-full py-3.5 sm:py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold transition-all shadow-lg shadow-lime-500/20 active:scale-95 flex justify-center items-center gap-2 touch-target">
                        <Send size={18} /> Iniciar Conversa WhatsApp
                    </button>
                </div>
            </div>
        </>
    );
};
