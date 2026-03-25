import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, QrCode, RefreshCw, MessageSquare, Search, MoreVertical, Paperclip, Send, User as UserIcon, Tag, Zap, Clock, ShieldCheck, PauseCircle, PlayCircle, PowerOff, Bot, MapPin, TrendingUp } from 'lucide-react';
import io from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

export interface ChatMessage {
    id: string;
    body: string;
    from: string;
    to: string;
    fromMe: boolean;
    timestamp: number;
    chatName?: string;
}

export interface ChatItem {
    id: string;
    name: string;
    phone: string;
    lastMsg: string;
    time: string;
    unread: number;
    tag: string;
    tagColor: string;
    messages: ChatMessage[];
}

const QR_LIFETIME_SECONDS = 30;

const Conversations: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [qrCountdown, setQrCountdown] = useState(QR_LIFETIME_SECONDS);
    const [backendOnline, setBackendOnline] = useState(false);
    const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // UI States for the connected chat layout
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [messageText, setMessageText] = useState("");

    // Countdown timer â€” resets whenever a fresh QR arrives
    const startCountdown = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setQrCountdown(QR_LIFETIME_SECONDS);
        countdownRef.current = setInterval(() => {
            setQrCountdown(prev => {
                if (prev <= 1) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Conectado ao backend WhatsApp.');
            setBackendOnline(true);
            newSocket.emit('generate_qr');
        });

        newSocket.on('disconnect', () => {
            setBackendOnline(false);
        });

        newSocket.on('whatsapp_qr', (qrBuffer) => {
            setQrCode(qrBuffer);
            setIsConnected(false);
            startCountdown();
        });

        newSocket.on('whatsapp_ready', () => {
            setIsConnected(true);
            setQrCode(null);
            if (countdownRef.current) clearInterval(countdownRef.current);
        });

        newSocket.on('whatsapp_disconnected', () => {
            setIsConnected(false);
            setQrCode(null);
        });

        newSocket.on('agent_status', (data) => {
            setAgentEnabled(data.enabled);
        });
        
        newSocket.on('active_contacts_sync', (data) => {
            setActiveContacts(new Set(data.contacts));
        });
        
        newSocket.on('contact_activated', (data) => {
            setActiveContacts(prev => {
                const next = new Set(prev);
                if(data.active) next.add(data.contactId);
                else next.delete(data.contactId);
                return next;
            });
        });

        newSocket.on('contact_paused', (data) => {
            setPausedContacts(prev => {
                const next = new Set(prev);
                if(data.paused) next.add(data.contactId);
                else next.delete(data.contactId);
                return next;
            });
        });

        newSocket.on('whatsapp_message', (msg) => {
            setChats((prevChats) => {
                const rawSenderId = msg.chatId.replace('@s.whatsapp.net', '');
                const existingChatIndex = prevChats.findIndex(c => c.id.replace('@s.whatsapp.net', '') === rawSenderId);
                
                const newMessage = {
                    id: msg.id,
                    body: msg.body,
                    from: msg.from,
                    to: msg.to,
                    fromMe: msg.fromMe,
                    timestamp: msg.timestamp,
                    chatName: msg.chatName
                };

                if (existingChatIndex >= 0) {
                    const updatedChats = [...prevChats];
                    const chat = updatedChats[existingChatIndex];
                    chat.messages = [...chat.messages, newMessage];
                    chat.lastMsg = newMessage.body;
                    chat.time = new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (!msg.fromMe) chat.unread = (chat.unread || 0) + 1;
                    const [moved] = updatedChats.splice(existingChatIndex, 1);
                    return [moved, ...updatedChats];
                } else {
                    const newChat = {
                        id: msg.chatId,
                        name: msg.chatName || msg.chatId,
                        phone: msg.chatId.replace('@s.whatsapp.net', ''),
                        lastMsg: newMessage.body,
                        time: new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        unread: !msg.fromMe ? 1 : 0,
                        tag: 'Novo Contato',
                        tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                        messages: [newMessage]
                    };
                    return [newChat, ...prevChats];
                }
            });
        });

        // Simulando contatos já existentes
        setTimeout(() => {
            setChats([                {
                    id: '5511912345678@c.us',
                    name: 'Carlos Oliveira',
                    phone: '55 11 91234-5678',
                    lastMsg: 'Ok, vou analisar a proposta e retorno na sexta.',
                    time: '14:30',
                    unread: 1,
                    tag: 'Proposta Enviada',
                    tagColor: 'text-purple-400 bg-purple-400/10',
                    messages: [
                        { id: 'm1', body: 'Olá Carlos, enviamos a proposta para seu email.', from: 'me', to: '5511912345678@c.us', fromMe: true, timestamp: Math.floor(Date.now() / 1000) - 3600 },
                        { id: 'm2', body: 'Ok, vou analisar a proposta e retorno na sexta.', from: '5511912345678@c.us', to: 'me', fromMe: false, timestamp: Math.floor(Date.now() / 1000) - 1800 }
                    ]
                },
                {
                    id: '5521998765432@c.us',
                    name: 'Empresa Alpha (Financeiro)',
                    phone: '55 21 99876-5432',
                    lastMsg: 'Gostaria de saber mais sobre usinas de investimento.',
                    time: 'Ontem',
                    unread: 2,
                    tag: 'Novo Contato',
                    tagColor: 'text-blue-400 bg-blue-400/10',
                    messages: [
                        { id: 'm3', body: 'Gostaria de saber mais sobre usinas de investimento.', from: '5521998765432@c.us', to: 'me', fromMe: false, timestamp: Math.floor(Date.now() / 1000) - 86400 }
                    ]
                }
            ]);
        }, 2000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const [searchText, setSearchText] = useState("");
    const [showContactPanel, setShowContactPanel] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [agentEnabled, setAgentEnabled] = useState(false);
    const [pausedContacts, setPausedContacts] = useState<Set<string>>(new Set());
    const [activeContacts, setActiveContacts] = useState<Set<string>>(new Set());

    // ✅ Estado para o contexto de Inteligência Artificial do Lead
    const [leadContext, setLeadContext] = useState<any>(null);
    const [isContextLoading, setIsContextLoading] = useState(false);

    // Quando o chat selecionado mudar, buscar o contexto da IA
    useEffect(() => {
        if (!selectedChat) return;
        setIsContextLoading(true);

        // MOCK Contexto da IA
        setTimeout(() => {
            setLeadContext({
                visitScheduled: false,
                disqualified: false,
                phase: 'qualify',
                billValue: '650,00'
            });
            setIsContextLoading(false);
        }, 1200);
    }, [selectedChat]);

    const QUICK_REPLIES = [
        { label: 'â˜€ï¸ SimulaÃ§Ã£o', text: 'OlÃ¡! Posso preparar uma simulaÃ§Ã£o personalizada de economia com energia solar para vocÃª. Qual Ã© o valor mÃ©dio da sua conta de luz?' },
        { label: 'ðŸ“… Agendamento', text: 'Que tal agendarmos uma visita tÃ©cnica gratuita? Nosso consultor vai atÃ© vocÃª sem compromisso. Qual o melhor dia e horÃ¡rio?' },
        { label: 'ðŸ’° Proposta', text: 'Tenho uma proposta exclusiva preparada para vocÃª com as melhores condiÃ§Ãµes de financiamento. Posso enviar os detalhes agora?' },
        { label: 'âš¡ Follow-up', text: 'Oi! Passando para saber se vocÃª teve a chance de analisar nossa proposta. Ficou alguma dÃºvida que posso esclarecer?' },
    ];

    const AVAILABLE_TAGS = [
        { label: 'Novo Contato', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
        { label: 'Em QualificaÃ§Ã£o', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
        { label: 'Proposta Enviada', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
        { label: 'NegÃ³cio Fechado', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
        { label: 'NÃ£o Interessado', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
    ];

    const filteredChats = chats.filter(c =>
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.phone.includes(searchText) ||
        c.lastMsg.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleTagChange = (chatId: string, tag: { label: string; color: string }) => {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, tag: tag.label, tagColor: tag.color } : c));
    };

    const handleAiAssist = async () => {
        const activeChat = chats.find(c => c.id === selectedChat);
        if (!activeChat) return;
        setAiLoading(true);
        setAiSuggestion(null);

        // MOCK Sugestão Inteligente
        setTimeout(() => {
            setAiSuggestion(`Olá ${activeChat.name.split(' ')[0]}, vi que você demonstrou interesse em nossas soluções. Como engenheiro parceiro da Quark, posso garantir que com o seu consumo a economia mensal vai ultrapassar 90%. Posso te ligar rapidinho para alinhar?`);
            setAiLoading(false);
        }, 1500);
    };

    const handleConnect = () => {
        if(socket) socket.emit('generate_qr');
    };

    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-4xl bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">

                    {/* Animated Background Gradients specific to this connection panel */}
                    <div className="absolute top-0 right-0 w-[40%] h-full bg-lime-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                    {/* Left Column: Instructions */}
                    <div className="md:w-1/2 p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative z-10">
                        <div className="w-16 h-16 bg-lime-400/10 border border-lime-400/20 rounded-2xl flex items-center justify-center mb-6">
                            <MessageSquare size={32} className="text-lime-400" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-white mb-4">Conecte o WhatsApp da Empresa</h2>
                        <p className="text-slate-400 mb-8 text-lg">
                            Sincronize o número oficial da Quark Energia para atender todos os leads diretamente pelo CRM com automações nativas.
                        </p>

                        <ol className="space-y-6 text-slate-300">
                            <li className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white">1</div>
                                <div>Abra o WhatsApp no seu celular oficial da empresa.</div>
                            </li>
                            <li className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white">2</div>
                                <div>Toque em <strong>Mais opÃ§Ãµes</strong> (Android) ou <strong>ConfiguraÃ§Ãµes</strong> (iPhone).</div>
                            </li>
                            <li className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white">3</div>
                                <div>Exiba a câmera selecionando <strong>Aparelhos Conectados</strong>.</div>
                            </li>
                            <li className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white">4</div>
                                <div>Aponte a câmera para o código QR ao lado.</div>
                            </li>
                        </ol>

                        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                            <ShieldCheck size={16} className="text-lime-500" />
                            ConexÃ£o 100% segura usando end-to-end encryption.
                        </div>
                    </div>

                    {/* Right Column: QR Code */}
                    <div className="md:w-1/2 p-10 bg-zinc-900/30 flex items-center justify-center relative z-10">
                        <div className="text-center w-full max-w-sm">

                            {/* Backend Status Badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 border ${backendOnline
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                {backendOnline ? 'Servidor WhatsApp Online' : 'Conectando ao servidor...'}
                            </div>

                            {/* QR Code Container */}
                            <div className="bg-white p-5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative mx-auto inline-block">
                                {qrCode ? (
                                    <div className="w-64 h-64 relative">
                                        {/* Expired Overlay */}
                                        {qrCountdown === 0 && (
                                            <div className="absolute inset-0 z-10 bg-white/90 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
                                                <RefreshCw size={36} className="text-lime-500 animate-spin mb-3" />
                                                <p className="text-slate-800 font-bold text-sm">Gerando novo QR Code...</p>
                                            </div>
                                        )}
                                        {qrCode.startsWith('data:image/') ? (
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain rounded-xl" />
                                        ) : (
                                            <QRCodeSVG
                                                value={qrCode}
                                                size={256}
                                                bgColor={"#ffffff"}
                                                fgColor={"#000000"}
                                                level={"M"}
                                                includeMargin={false}
                                            />
                                        )}
                                        {/* Central Logo in QR */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-slate-100 shadow-sm">
                                            <Zap size={20} className="text-lime-500 fill-lime-500" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl">
                                        <RefreshCw size={40} className="text-lime-500 animate-spin mb-4" />
                                        <p className="text-slate-700 font-bold text-sm">{backendOnline ? 'Gerando QR Code...' : 'Aguardando servidor...'}</p>
                                        <p className="text-slate-400 text-xs mt-1">Isso pode levar alguns segundos</p>
                                    </div>
                                )}
                            </div>

                            {/* Countdown Bar */}
                            {qrCode && qrCountdown > 0 && (
                                <div className="mt-5">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={12} />
                                            QR v&#225;lido por
                                        </span>
                                        <span className={`font-bold font-mono text-sm ${qrCountdown <= 8 ? 'text-red-400' : qrCountdown <= 15 ? 'text-yellow-400' : 'text-lime-400'
                                            }`}>{qrCountdown}s</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${qrCountdown <= 8 ? 'bg-red-500' : qrCountdown <= 15 ? 'bg-yellow-500' : 'bg-lime-500'
                                                }`}
                                            style={{ width: `${(qrCountdown / QR_LIFETIME_SECONDS) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3">Um novo cÃ³digo serÃ¡ gerado automaticamente ao expirar</p>
                                </div>
                            )}

                            {/* Dev Mock Connect */}
                            <button onClick={handleConnect} className="mt-6 px-6 py-2 bg-lime-500/20 text-lime-400 hover:bg-lime-500 hover:text-black font-bold rounded-xl border border-lime-500/30 transition-all text-xs uppercase tracking-wide shadow-lg shadow-lime-500/10 active:scale-95">
                                Simular Conexão Segura
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                                <Smartphone className="opacity-50" size={16} />
                                Requer smartphone Android 6.0+ ou iOS 12+
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        );
    }

    const handleToggleAgent = async () => {
        try {
            await fetch('http://localhost:3001/agent/toggle', { method: 'POST' });
        } catch(e) {}
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Desconectar o WhatsApp da empresa? Você precisará escanear o QR novamente.')) return;
        try {
            await fetch('http://localhost:3001/disconnect', { method: 'POST' });
        } catch(e) {}
    };

    const handlePauseContact = async (contactId: string) => {
        const isPaused = pausedContacts.has(contactId);
        try {
            if (isPaused) await fetch(`http://localhost:3001/agent/resume/${encodeURIComponent(contactId)}`, { method: 'POST' });
            else await fetch(`http://localhost:3001/agent/pause/${encodeURIComponent(contactId)}`, { method: 'POST' });
        } catch(e) {}
    };

    const handleActivateContact = async (contactId: string) => {
        const isActive = activeContacts.has(contactId);
        try {
            if (isActive) await fetch(`http://localhost:3001/agent/deactivate/${encodeURIComponent(contactId)}`, { method: 'POST' });
            else await fetch(`http://localhost:3001/agent/activate/${encodeURIComponent(contactId)}`, { method: 'POST' });
        } catch(e) {}
    };

    // CONNECTED STATE: The Full Sales Chat Dashboard
    const activeChat = chats.find(c => c.id === selectedChat);

    return (
        <div className="h-[calc(100vh-80px)] bg-[#050b14] border border-white/5 rounded-2xl overflow-hidden flex shadow-2xl relative animate-enter mx-auto">

            {/* â”€â”€â”€ LEFT PANEL: Chat List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="w-80 flex flex-col border-r border-white/5 bg-[#0a0f16] shrink-0">
                {/* Account Header */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
                                <Zap size={20} className="text-lime-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Quark Energia</h3>
                                <p className="text-xs text-lime-400 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                                    {chats.length} conversa{chats.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        {/* Agent ON/OFF Toggle */}
                        <button
                            onClick={handleToggleAgent}
                            title={agentEnabled ? 'Agente IA ligado — clique para desligar' : 'Agente IA desligado — clique para ligar'}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${agentEnabled
                                ? 'bg-lime-500/15 border-lime-500/30 text-lime-400'
                                : 'bg-zinc-800/60 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${agentEnabled ? 'bg-lime-400 animate-pulse' : 'bg-slate-600'}`} />
                            Bot {agentEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    {/* Disconnect link */}
                    <button
                        onClick={handleDisconnect}
                        className="mt-2 text-[10px] text-slate-600 hover:text-red-400 transition-colors w-full text-left"
                    >
                        Desconectar WhatsApp
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder="Buscar conversas..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors placeholder-slate-600"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageSquare size={32} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">{searchText ? 'Nenhuma conversa encontrada.' : 'Aguardando mensagens no WhatsApp...'}</p>
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => {
                                    setSelectedChat(chat.id);
                                    setAiSuggestion(null);
                                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
                                }}
                                className={`p-3 border-b border-white/5 cursor-pointer transition-all flex gap-3 relative
                                    ${selectedChat === chat.id ? 'bg-lime-500/5' : 'hover:bg-white/[0.03]'}
                                    ${pausedContacts.has(chat.id) && activeContacts.has(chat.id) ? 'border-l-[3px] border-l-orange-500 bg-orange-500/5' : ''}
                                `}
                            >
                                {selectedChat === chat.id && !pausedContacts.has(chat.id) && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-lime-500" />}

                                {/* Avatar */}
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 text-lg font-bold text-white">
                                    {chat.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h4 className="font-semibold text-white text-sm truncate pr-2">{chat.name}</h4>
                                        <span className="text-[10px] text-slate-500 flex-shrink-0">{chat.time}</span>
                                    </div>
                                    <p className={`text-xs truncate mb-1.5 ${chat.unread > 0 ? 'text-white font-medium' : 'text-slate-500'}`}>
                                        {chat.lastMsg}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${chat.tagColor}`}>
                                            {chat.tag}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {/* Bot status pill */}
                                            {agentEnabled && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${activeContacts.has(chat.id)
                                                    ? pausedContacts.has(chat.id)
                                                        ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                                                        : 'text-lime-400 bg-lime-400/10 border-lime-400/20'
                                                    : 'text-slate-600 bg-zinc-800/50 border-white/5'
                                                    }`}>
                                                    {activeContacts.has(chat.id) ? (pausedContacts.has(chat.id) ? 'Aguardando Você' : 'Bot ON') : 'Bot OFF'}
                                                </span>
                                            )}
                                            {chat.unread > 0 && (
                                                <div className="w-4 h-4 rounded-full bg-lime-500 text-black text-[10px] font-bold flex items-center justify-center">
                                                    {chat.unread}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* â”€â”€â”€ CENTER PANEL: Active Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex-1 flex flex-col bg-[#050b14] relative min-w-0">
                {/* Dot pattern bg */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md z-20 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center text-white font-bold text-base">
                                    {activeChat.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm leading-tight">{activeChat.name}</h3>
                                    <p className="text-xs text-slate-400">{activeChat.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Activate Bot for this contact */}
                                <button
                                    onClick={() => handleActivateContact(activeChat.id)}
                                    title={activeContacts.has(activeChat.id) ? 'Bot ativado — clique para desativar' : 'Ativar bot para este contato'}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${!agentEnabled
                                        ? 'opacity-40 cursor-not-allowed bg-zinc-800/60 border-white/10 text-slate-600'
                                        : activeContacts.has(activeChat.id)
                                            ? 'bg-lime-500/15 border-lime-500/30 text-lime-400'
                                            : 'bg-zinc-800/60 border-white/10 text-slate-400 hover:border-lime-500/30 hover:text-lime-400'
                                        }`}
                                    disabled={!agentEnabled}
                                >
                                    {activeContacts.has(activeChat.id)
                                        ? <><Bot size={13} /> Bot Ativo</>
                                        : <><PowerOff size={13} /> Ativar Bot</>
                                    }
                                </button>
                                {/* Pause Bot for this contact */}
                                {activeContacts.has(activeChat.id) && (
                                    <button
                                        onClick={() => handlePauseContact(activeChat.id)}
                                        title={pausedContacts.has(activeChat.id) ? 'Bot pausado — clique para retomar' : 'Pausar bot e assumir conversa'}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${pausedContacts.has(activeChat.id)
                                            ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                                            : 'bg-zinc-800/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                            }`}
                                    >
                                        {pausedContacts.has(activeChat.id)
                                            ? <><PlayCircle size={13} /> Retomar Bot</>
                                            : <><PauseCircle size={13} /> Pausar Bot</>
                                        }
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowContactPanel(v => !v)}
                                    className={`p-2 rounded-lg transition-colors text-sm border ${showContactPanel ? 'bg-lime-500/10 text-lime-400 border-lime-500/20' : 'bg-zinc-800/50 text-slate-400 border-white/5 hover:text-white'}`}
                                    title="Painel do Contato"
                                >
                                    <UserIcon size={16} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-white bg-zinc-800/50 rounded-lg transition-colors border border-white/5">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        {/* AI Suggestion Banner */}
                        {aiSuggestion && (
                            <div className="mx-4 mt-3 p-3 bg-lime-500/10 border border-lime-500/20 rounded-xl text-sm text-lime-300 relative z-10">
                                <div className="flex items-start gap-2">
                                    <Zap size={14} className="text-lime-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-bold text-lime-400 text-xs mb-1">Quark IA Suggest</p>
                                        <p className="text-xs text-slate-300 whitespace-pre-line">{aiSuggestion}</p>
                                    </div>
                                    <button onClick={() => { setMessageText(aiSuggestion || ''); setAiSuggestion(null); }} className="text-xs bg-lime-500 text-black font-bold px-2 py-1 rounded-lg flex-shrink-0">
                                        Usar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3 relative z-10">
                            <div className="flex justify-center">
                                <span className="bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 font-medium px-3 py-1 rounded-full uppercase tracking-wider">
                                    HistÃ³rico via WhatsApp
                                </span>
                            </div>

                            {activeChat.messages && activeChat.messages.map((msg: ChatMessage, idx: number) => (
                                <div key={idx} className={`flex flex-col gap-1 max-w-[75%] ${msg.fromMe ? 'self-end items-end' : 'self-start items-start'}`}>
                                    <div className={`px-4 py-2.5 shadow-md ${msg.fromMe
                                        ? 'bg-lime-500 text-black rounded-2xl rounded-tr-sm'
                                        : 'bg-zinc-800 border border-white/5 text-slate-100 rounded-2xl rounded-tl-sm'
                                        }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                        {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {msg.fromMe && <Clock size={9} />}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Quick Reply Templates */}
                        <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar bg-zinc-900/20 z-20 shrink-0">
                            {QUICK_REPLIES.map((qr, i) => (
                                <button
                                    key={i}
                                    onClick={() => setMessageText(qr.text)}
                                    className="flex-shrink-0 px-3 py-1.5 bg-zinc-800/70 hover:bg-zinc-700/70 border border-white/5 hover:border-lime-500/30 text-slate-300 hover:text-lime-400 rounded-lg text-xs transition-all font-medium"
                                >
                                    {qr.label}
                                </button>
                            ))}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-white/5 bg-zinc-900/40 z-20 shrink-0">
                            <form
                                className="flex items-end gap-2 bg-black/40 border border-white/10 p-2 rounded-2xl focus-within:border-lime-500/40 transition-colors"
                                onSubmit={e => {
                                    e.preventDefault();
                                    if (!messageText.trim() || !socket || !activeChat) return;
                                    const newMsg: ChatMessage = {
                                        id: Math.random().toString(),
                                        body: messageText,
                                        from: 'me',
                                        to: activeChat.id,
                                        fromMe: true,
                                        timestamp: Math.floor(Date.now() / 1000),
                                        chatName: activeChat.name,
                                    };
                                    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, newMsg], lastMsg: messageText } : c));
                                    socket.emit('send_message', { number: activeChat.phone, message: messageText });
                                    setMessageText("");
                                }}
                            >
                                <button type="button" className="p-3 text-slate-500 hover:text-slate-300 transition-colors rounded-xl hover:bg-white/5 flex-shrink-0">
                                    <Paperclip size={18} />
                                </button>
                                <textarea
                                    rows={1}
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                        }
                                    }}
                                    placeholder="Escreva uma mensagem... (Enter para enviar)"
                                    className="flex-1 bg-transparent text-white py-3 px-2 text-sm focus:outline-none resize-none max-h-32 placeholder-slate-600"
                                    style={{ minHeight: '44px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageText.trim()}
                                    className="p-3 bg-lime-500 hover:bg-lime-400 text-black rounded-xl transition-all shadow-lg shadow-lime-500/20 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed group"
                                >
                                    <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                        <div className="w-20 h-20 rounded-3xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-5">
                            <MessageSquare size={36} className="opacity-40" />
                        </div>
                        <p className="text-lg font-semibold text-slate-400">Selecione uma conversa</p>
                        <p className="text-sm mt-2 text-slate-600 max-w-xs text-center">Escolha uma das conversas na lista para comeÃ§ar a atender.</p>
                    </div>
                )}
            </div>

            {/* ─── RIGHT PANEL: Contact Info (Inteligência Central) ─── */}
            {showContactPanel && activeChat && (
                <div className="w-80 border-l border-white/5 bg-[#050b14] flex flex-col shrink-0 overflow-y-auto relative isolate">

                    {/* Glassmorphism Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

                    {/* Contact Header */}
                    <div className="p-6 border-b border-white/5 text-center relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-white/10 shadow-xl shadow-black/50 flex items-center justify-center text-white font-display font-bold text-3xl mx-auto mb-4 relative group">
                            <div className="absolute inset-0 rounded-full bg-lime-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative z-10">{activeChat.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <h3 className="font-bold text-white text-lg tracking-tight mb-1">{activeChat.name}</h3>
                        <p className="text-sm text-slate-400 font-medium">+{activeChat.phone}</p>
                    </div>

                    {/* AI Context Card (O Raio-X) */}
                    <div className="p-5 border-b border-white/5 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-lime-400" />
                            <p className="text-xs text-lime-400/90 uppercase font-bold tracking-widest">Inteligência Quark</p>
                        </div>

                        {isContextLoading ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-10 bg-white/5 rounded-xl w-full" />
                                <div className="h-10 bg-white/5 rounded-xl w-full" />
                            </div>
                        ) : leadContext ? (
                            <div className="space-y-3">
                                {/* Status Box */}
                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-center transition-colors hover:bg-white/[0.04]">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Qualificação da IA</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${leadContext.visitScheduled ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                            leadContext.disqualified ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                (leadContext.phase === 'qualify' || leadContext.phase === 'greeting') ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                                                    'bg-zinc-800 text-slate-300 border-white/10'
                                            }`}>
                                            {leadContext.visitScheduled ? 'Visita Agendada' :
                                                leadContext.disqualified ? 'Desqualificado' :
                                                    leadContext.phase?.toUpperCase() || 'DESCONHECIDO'}
                                        </span>
                                    </div>
                                </div>

                                {/* Conta Box */}
                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-start gap-3 transition-colors hover:bg-white/[0.04]">
                                    <div className="p-2 bg-lime-500/10 rounded-lg text-lime-400">
                                        <TrendingUp size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Conta Extraída</p>
                                        <p className="text-sm text-white font-medium">
                                            {leadContext.billValue ? `R$ ${leadContext.billValue}` : <span className="text-slate-600 italic">Analisando...</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Cidade Box */}
                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-start gap-3 transition-colors hover:bg-white/[0.04]">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Localização</p>
                                        <p className="text-sm text-white font-medium">
                                            {leadContext.city || <span className="text-slate-600 italic">Desconhecida</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl text-center">
                                <p className="text-xs text-slate-500">Sem histórico de Inteligência para este lead recém chegado.</p>
                            </div>
                        )}
                    </div>

                    {/* Funil Tag Manual */}
                    <div className="p-5 border-b border-white/5">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-3">CRM: Etapa Manual</p>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => (
                                <button
                                    key={tag.label}
                                    onClick={() => handleTagChange(activeChat.id, tag)}
                                    className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all ${activeChat.tag === tag.label
                                        ? tag.color + ' ring-1 ring-current shadow-md'
                                        : 'text-slate-400 bg-zinc-800/30 border-white/5 hover:border-white/20 hover:bg-white/5'
                                        }`}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Tools */}
                    <div className="px-5 py-5 space-y-3 mt-auto mb-2">
                        <button
                            onClick={handleAiAssist}
                            disabled={aiLoading}
                            className="w-full text-left px-3 py-3 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/20 text-lime-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                            {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                            {aiLoading ? 'Lendo mente do cliente...' : 'Quark IA Suggest'}
                        </button>

                        <button
                            className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-700/50 text-slate-300 border border-white/5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 group"
                            onClick={() => window.open('/calculator', '_blank')}
                        >
                            <TrendingUp size={14} className="text-slate-500" />
                            Abrir Calculadora
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Conversations;
