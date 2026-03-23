import React from 'react';
import { X, Edit2, Save, Trash2, Sparkles, Copy, Check, Loader2, Clock, Send } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadDetailsPanelProps {
    selectedLead: Lead;
    isEditing: boolean;
    editingData: Partial<Lead>;
    columnTitles: Record<string, string>;
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
    columnsConfig: { id: LeadStatus; defaultLabel: string }[];
}

export const LeadDetailsPanel: React.FC<LeadDetailsPanelProps> = ({
    selectedLead,
    isEditing,
    editingData,
    columnTitles,
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
    columnsConfig,
}) => {
    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity" onClick={onClose}></div>
            <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#0c121a]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-[60] animate-enter flex flex-col">
                <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-start bg-black/20">
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

                        <div className="flex gap-2">
                            {isEditing ? (
                                <select
                                    value={editingData.status}
                                    onChange={(e) => onDataChange({ ...editingData, status: e.target.value as LeadStatus })}
                                    className="bg-zinc-800 border border-zinc-700 rounded p-1 text-xs text-lime-400 font-bold uppercase tracking-wide outline-none"
                                >
                                    {columnsConfig.map(col => <option key={col.id} value={col.id}>{col.defaultLabel}</option>)}
                                </select>
                            ) : (
                                <span className="px-3 py-1 rounded-lg text-[11px] bg-lime-500/10 text-lime-400 border border-lime-500/20 font-bold uppercase tracking-wider">{columnTitles[selectedLead.status]}</span>
                            )}
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editingData.city}
                                    onChange={(e) => onDataChange({ ...editingData, city: e.target.value })}
                                    className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-xs text-white w-32 outline-none"
                                />
                            ) : (
                                <span className="px-3 py-1 rounded-lg text-[11px] bg-white/5 text-zinc-300 border border-white/10 font-medium">{selectedLead.city}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isEditing && (
                            <button onClick={onEditToggle} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                                <Edit2 size={20} />
                            </button>
                        )}
                        {isEditing && (
                            <button onClick={onSave} className="p-2 text-lime-400 hover:bg-lime-500/10 rounded-lg transition-colors" title="Salvar">
                                <Save size={20} />
                            </button>
                        )}
                        <button onClick={onDelete} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                            <Trash2 size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white ml-2">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                    <div className="relative group/ai">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-3xl blur opacity-30 group-hover/ai:opacity-60 transition duration-500"></div>
                        <div className="relative p-6 rounded-3xl bg-black/40 border border-white/10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>

                            <div className="flex justify-between items-center mb-5 relative z-10">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <div className="p-1.5 bg-lime-500/20 rounded-lg">
                                        <Sparkles size={16} className="text-lime-400" />
                                    </div>
                                    Quark AI Assistant
                                </h3>
                                {aiProposal && (
                                    <button onClick={onCopyAI} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                                        {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        {isCopied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                )}
                            </div>

                            {!aiProposal ? (
                                <div className="text-center py-6 relative z-10">
                                    <p className="text-[13px] text-zinc-400 mb-6 leading-relaxed max-w-sm mx-auto">Analise o histórico deste lead e gere uma mensagem comercial altamente persuasiva.</p>
                                    <button
                                        onClick={onGenerateAI}
                                        disabled={isGeneratingAI}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-lime-400 font-bold transition-all flex justify-center items-center gap-2 group-hover/ai:border-lime-500/30"
                                    >
                                        {isGeneratingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover/ai:text-lime-300 transition-colors" />}
                                        {isGeneratingAI ? 'Analisando Lead e Histórico...' : 'Gerar Proposta Persuasiva'}
                                    </button>
                                </div>
                            ) : (
                                <div className="relative z-10 animate-enter">
                                    <textarea
                                        value={aiProposal}
                                        readOnly
                                        className="w-full h-48 bg-black/60 border border-lime-500/20 rounded-xl p-4 text-[13px] text-zinc-300 focus:border-lime-500/50 outline-none resize-none leading-relaxed custom-scrollbar shadow-inner"
                                    />
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={onClearAI}
                                            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all"
                                        >
                                            Descartar
                                        </button>
                                        <button
                                            onClick={() => onWhatsApp(selectedLead)}
                                            className="flex-1 py-2 text-xs bg-lime-500 hover:bg-lime-400 text-black rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:shadow-[0_0_20px_rgba(163,230,53,0.5)] flex justify-center items-center gap-2"
                                        >
                                            <Send size={14} /> Enviar no WhatsApp
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Telefone</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editingData.phone}
                                        onChange={(e) => onDataChange({ ...editingData, phone: e.target.value })}
                                        className="bg-black/50 border border-zinc-700/50 rounded-lg p-1.5 text-white w-full outline-none"
                                    />
                                ) : (
                                    <p className="text-zinc-200 font-display text-[15px] font-medium">{selectedLead.phone}</p>
                                )}
                            </div>
                            <div className="p-5 rounded-2xl bg-lime-500/5 border border-lime-500/10 hover:bg-lime-500/10 transition-colors">
                                <label className="text-[10px] text-lime-600/80 uppercase font-bold tracking-wider mb-1 block">Valor Agregado (R$)</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editingData.value}
                                        onChange={(e) => onDataChange({ ...editingData, value: Number(e.target.value) })}
                                        className="bg-black/50 border border-lime-500/30 rounded-lg p-1.5 text-lime-400 w-full outline-none font-bold"
                                    />
                                ) : (
                                    <p className="text-lime-400 font-display text-lg font-bold">R$ {selectedLead.value.toLocaleString()}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                <Clock size={16} className="text-lime-400" />
                                Linha do Tempo
                            </h3>
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
                                                <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-400">
                                                    {log.author.substring(0, 1)}
                                                </div>
                                                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide">{log.author}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-zinc-900/80 flex-shrink-0">
                    <button
                        onClick={() => onWhatsApp(selectedLead)}
                        className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold transition-all shadow-lg shadow-lime-500/20 active:scale-95 flex justify-center gap-2"
                    >
                        <Send size={18} /> Iniciar Conversa WhatsApp
                    </button>
                </div>
            </div>
        </>
    );
};
