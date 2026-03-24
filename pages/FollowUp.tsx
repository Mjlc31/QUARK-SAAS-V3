import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectStatus } from '../types';
import { Plus, Search, MapPin, Calendar, HardHat, Send, CheckCircle2, Clock, AlertTriangle, X, Trash2, User as UserIcon, Phone } from 'lucide-react';

const COLUMN_CONFIG: { id: ProjectStatus; label: string; color: string }[] = [
    { id: 'Vistoria', label: 'Vistoria Técnica', color: 'border-blue-500' },
    { id: 'Projeto', label: 'Elaboração Projeto', color: 'border-indigo-500' },
    { id: 'Homologacao', label: 'Homologação', color: 'border-purple-500' },
    { id: 'Instalacao', label: 'Agendamento/Instalação', color: 'border-yellow-500' },
    { id: 'Finalizado', label: 'Finalizado', color: 'border-lime-500' },
];

const FollowUp: React.FC = () => {
    const { projects, addProject, updateProjectStatus, deleteProject, leads } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [creationMode, setCreationMode] = useState<'existing' | 'new'>('existing');
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [newProject, setNewProject] = useState<Partial<Project>>({});

    const [draggedProject, setDraggedProject] = useState<string | null>(null);

    const filteredProjects = projects.filter(p =>
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedProject(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
        e.preventDefault();
        if (draggedProject) {
            updateProjectStatus(draggedProject, status);
            setDraggedProject(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const getWhatsAppMessage = (project: Project) => {
        const firstName = project.clientName.split(' ')[0];
        const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';

        switch (project.status) {
            case 'Vistoria':
                return `*${timeOfDay}, ${firstName}!* Tudo bem?\n\nAqui é a equipe de engenharia da *Quark Energia* ⚡\n\nEstou entrando em contato pois nosso próximo passo agora é realizar a Vistoria Técnica no local, para garantirmos que a instalação será perfeita.\n\nQual seria o melhor dia e horário na sua agenda para receber nosso engenheiro? Não se preocupe, é um processo bem rápido e tranquilo!`;
            case 'Projeto':
                return `*${timeOfDay}, ${firstName}!* Tudo ótimo por aí?\n\nPassando para te dar uma atualização quentinha sobre o seu projeto solar ☀️\n\nNossa equipe de engenharia acabou de iniciar a *Elaboração do Projeto Executivo*. Nós estamos cuidando de absolutamente todos os detalhes técnicos, dimensionando tudo milimetricamente para que sua usina tenha a máxima eficiência possível e entregue o máximo de economia.\n\nAssim que os desenhos técnicos ficarem prontos, eu te dou um alô! Qualquer dúvida, estou por aqui.`;
            case 'Homologacao':
                return `*${timeOfDay}, ${firstName}!* Trago excelentes notícias! 📄🚀\n\nSeu projeto de energia solar já foi protocolado oficialmente na concessionária de energia e acabamos de entrar na fase de *Homologação*.\n\nAgora a bola está com eles! É só aguardarmos o prazo legal para a análise. Nossa equipe está monitorando o status diariamente e te aviso no minuto em que o parecer técnico for aprovado, combinado?`;
            case 'Instalacao':
                return `*${timeOfDay}, ${firstName}!* Chegou o grande momento! 🛠️💡\n\nA concessionária *aprovou* nossa homologação com sucesso!\n\nIsso significa que já podemos agendar a *Instalação Física* dos seus painéis solares. Nossa equipe de montagem está com a bota no pé e pronta para entrar em ação.\n\nComo está sua semana? Podemos programar a equipe para os próximos dias? Mal posso esperar para ver o seu medidor rodando devagar! haha`;
            case 'Finalizado':
                return `*${timeOfDay}, ${firstName}!* Missão cumprida! 🎉🟢\n\nSeu sistema solar da Quark Energia está *Oficialmente Conectado, Testado e Gerando Energia Limpa*!\n\nFoi um absoluto prazer conduzir esse projeto pra você. Gostaríamos de te dar os parabéns por dar esse passo rumo ao futuro (e à economia pesada todos os meses rs).\n\nNossa parceria não acaba aqui. Qualquer dúvida sobre o monitoramento no aplicativo ou sobre sua fatura futura, nosso suporte de engenharia continua à sua inteira disposição.\n\nMuito obrigado pela confiança na Quark! 🤝`;
            default:
                return `Olá ${firstName}, tudo bem? Passando para te atualizar sobre o andamento do seu projeto com a Quark Energia. Pode falar rapidinho?`;
        }
    };

    const sendUpdate = (project: Project) => {
        const message = getWhatsAppMessage(project);
        const encodedMessage = encodeURIComponent(message);

        let url = `https://wa.me/?text=${encodedMessage}`;

        if (project.clientPhone) {
            // Clean phone number (remove non-digits)
            const cleanPhone = project.clientPhone.replace(/\D/g, '');
            url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        }

        window.open(url, '_blank');
    };

    const handleLeadSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value;
        setSelectedLeadId(leadId);

        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            setNewProject({
                clientId: lead.id,
                clientName: lead.name,
                city: lead.city,
                systemSizeKw: 0, // Default or estimate from lead value map?
                clientPhone: lead.phone
            });
        }
    };

    const submitProject = async () => {
        if (!newProject.clientName) return;
        await addProject(newProject);
        setIsFormOpen(false);
        setNewProject({});
        setSelectedLeadId('');
        setCreationMode('existing');
    };

    return (
        <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col relative animate-enter pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h1 className="text-2xl font-bold text-white font-display hidden md:block">Acompanhamento</h1>
                    <div className="relative w-full md:w-80">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar obra..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-200 focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-lime-500/10 active:scale-95 w-full md:w-auto justify-center"
                >
                    <Plus size={20} />
                    <span>Novo Projeto</span>
                </button>
            </div>

            {/* Mobile Tabs */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-4 custom-scrollbar mb-2 px-1 snap-x">
                {COLUMN_CONFIG.map((column, index) => (
                    <button
                        key={column.id}
                        onClick={() => {
                            document.getElementById(`col-${column.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }}
                        className={`flex-none px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap snap-center transition-all ${column.color.replace('border-', 'bg-').replace('-500', '-500/20 text-white border-') + column.color.replace('border-', '') + '-500'
                            }`}
                    >
                        {column.label}
                    </button>
                ))}
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto pb-4 -mx-4 md:mx-0 px-4 md:px-0 snap-x snap-mandatory scrollbar-hide md:scrollbar-default">
                <div className="flex flex-col md:flex-row gap-6 md:min-w-[1400px] h-full">
                    {COLUMN_CONFIG.map(column => {
                        const columnProjects = filteredProjects.filter(p => p.status === column.id);

                        return (
                            <div
                                key={column.id}
                                id={`col-${column.id}`}
                                className="flex-1 min-w-[85vw] md:min-w-[300px] flex flex-col group/col snap-center md:snap-align-none"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.id)}
                            >
                                <div className={`flex items-center justify-between p-4 rounded-t-2xl glass-panel border-t-2 ${column.color} mb-3 bg-zinc-900/40`}>
                                    <h3 className="font-bold text-zinc-200 tracking-wide font-display text-sm flex items-center gap-2">
                                        {column.id === 'Vistoria' && <MapPin size={14} />}
                                        {column.id === 'Projeto' && <Clock size={14} />}
                                        {column.id === 'Homologacao' && <CheckCircle2 size={14} />}
                                        {column.id === 'Instalacao' && <HardHat size={14} />}
                                        {column.id === 'Finalizado' && <CheckCircle2 size={14} className="text-lime-500" />}
                                        {column.label}
                                    </h3>
                                    <span className="bg-zinc-800 border border-white/5 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-400">{columnProjects.length}</span>
                                </div>
                                {/* ... rest of column content ... */}
                                <div className="flex-1 rounded-b-2xl space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-220px)] md:max-h-none">
                                    {columnProjects.map(project => (
                                        <div
                                            key={project.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, project.id)}
                                            className="glass-panel p-5 rounded-2xl cursor-grab active:cursor-grabbing glass-card-hover group relative"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-white text-base mb-1">{project.clientName}</h4>
                                                    <p className="text-xs text-zinc-500 flex items-center gap-1"><MapPin size={10} /> {project.city}</p>
                                                    {project.clientPhone && (
                                                        <p className="text-[10px] text-lime-500/70 mt-1 flex items-center gap-1">
                                                            <Phone size={8} /> {project.clientPhone}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => deleteProject(project.id)}
                                                    className="text-zinc-600 hover:text-red-400 p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-white/5 mb-4 flex items-center justify-between">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase">Potência</span>
                                                <span className="text-sm font-display font-bold text-lime-400">{project.systemSizeKw} kWp</span>
                                            </div>

                                            <button
                                                onClick={() => sendUpdate(project)}
                                                className="w-full py-3 bg-zinc-800 hover:bg-green-500/10 border border-zinc-700 hover:border-green-500/50 text-zinc-300 hover:text-green-400 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 group/btn active:scale-95 touch-manipulation"
                                            >
                                                <Send size={14} className="group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                Enviar Update
                                            </button>

                                            <div className="mt-3 flex items-center justify-end gap-2">
                                                <span className="text-[10px] text-zinc-600">Atualizado em {new Date(project.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {columnProjects.length === 0 && (
                                        <div className="border border-dashed border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-zinc-600">
                                            <p className="text-xs">Nenhum projeto</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* New Project Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl animate-enter">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white font-display">Novo Projeto</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Toggle Mode */}
                            <div className="bg-black/40 p-1 rounded-xl flex mb-4">
                                <button
                                    onClick={() => setCreationMode('existing')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${creationMode === 'existing' ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Cliente Existente
                                </button>
                                <button
                                    onClick={() => { setCreationMode('new'); setNewProject({}); setSelectedLeadId(''); }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${creationMode === 'new' ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Novo Cliente
                                </button>
                            </div>

                            {creationMode === 'existing' ? (
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Selecionar Lead</label>
                                    <select
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-lime-500 transition-all appearance-none"
                                        value={selectedLeadId}
                                        onChange={handleLeadSelect}
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {leads.map(lead => (
                                            <option key={lead.id} value={lead.id}>{lead.name} - {lead.city}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Nome do Cliente</label>
                                        <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-lime-500 transition-all"
                                            value={newProject.clientName || ''} onChange={e => setNewProject({ ...newProject, clientName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Telefone (WhatsApp)</label>
                                        <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-lime-500 transition-all"
                                            placeholder="Ex: 5511999999999"
                                            value={newProject.clientPhone || ''} onChange={e => setNewProject({ ...newProject, clientPhone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Cidade</label>
                                        <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-lime-500 transition-all"
                                            value={newProject.city || ''} onChange={e => setNewProject({ ...newProject, city: e.target.value })} />
                                    </div>
                                </>
                            )}

                            {/* Common Fields */}
                            {(creationMode === 'new' || selectedLeadId) && (
                                <div className="animate-enter">
                                    {creationMode === 'existing' && (
                                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-white/5 mb-4 text-xs text-zinc-400 space-y-1">
                                            <p><span className="text-zinc-500 font-bold">Cliente:</span> {newProject.clientName}</p>
                                            <p><span className="text-zinc-500 font-bold">Cidade:</span> {newProject.city}</p>
                                            <p><span className="text-zinc-500 font-bold">Tel:</span> {newProject.clientPhone || 'N/A'}</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Potência (kWp)</label>
                                        <input type="number" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-lime-500 transition-all"
                                            value={newProject.systemSizeKw || ''} onChange={e => setNewProject({ ...newProject, systemSizeKw: Number(e.target.value) })} />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setIsFormOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                                <button
                                    onClick={submitProject}
                                    disabled={!newProject.clientName}
                                    className="flex-1 btn-primary py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Criar Projeto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowUp;
