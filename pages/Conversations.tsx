import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, QrCode, RefreshCw, MessageSquare, Search, MoreVertical, Paperclip, Send, User as UserIcon, Tag, Zap, Clock, ShieldCheck, PauseCircle, PlayCircle, PowerOff, Bot, MapPin, TrendingUp, ArrowLeft, X } from 'lucide-react';
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
const BACKEND_URL = 'http://localhost:3001';

const Conversations: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [qrCountdown, setQrCountdown] = useState(QR_LIFETIME_SECONDS);
    const [backendOnline, setBackendOnline] = useState(false);
    const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [messageText, setMessageText] = useState("");
    const [searchText, setSearchText] = useState("");
    const [showContactPanel, setShowContactPanel] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [agentEnabled, setAgentEnabled] = useState(false);
    const [pausedContacts, setPausedContacts] = useState<Set<string>>(new Set());
    const [activeContacts, setActiveContacts] = useState<Set<string>>(new Set());
    const [leadContext, setLeadContext] = useState<any>(null);
    const [isContextLoading, setIsContextLoading] = useState(false);

    // Mobile: track if we're viewing a chat (hides sidebar on mobile)
    const [mobileShowChat, setMobileShowChat] = useState(false);

    // ─── Auto-scroll to latest message ────────────────────────────────────
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [chats, selectedChat, scrollToBottom]);

    // ─── Countdown timer ──────────────────────────────────────────────────
    const startCountdown = useCallback(() => {
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
    }, []);

    // ─── Socket.io Connection (with proper cleanup) ───────────────────────
    useEffect(() => {
        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Conectado ao backend WhatsApp.');
            setBackendOnline(true);
            newSocket.emit('generate_qr');
        });

        newSocket.on('disconnect', () => {
            setBackendOnline(false);
        });

        newSocket.on('whatsapp_qr', (qrBuffer: string) => {
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

        newSocket.on('agent_status', (data: { enabled: boolean }) => {
            setAgentEnabled(data.enabled);
        });

        newSocket.on('active_contacts_sync', (data: { contacts: string[] }) => {
            setActiveContacts(new Set(data.contacts));
        });

        newSocket.on('contact_activated', (data: { active: boolean; contactId: string }) => {
            setActiveContacts(prev => {
                const next = new Set(prev);
                if (data.active) next.add(data.contactId);
                else next.delete(data.contactId);
                return next;
            });
        });

        newSocket.on('contact_paused', (data: { paused: boolean; contactId: string }) => {
            setPausedContacts(prev => {
                const next = new Set(prev);
                if (data.paused) next.add(data.contactId);
                else next.delete(data.contactId);
                return next;
            });
        });

        newSocket.on('whatsapp_message', (msg: any) => {
            setChats((prevChats) => {
                const rawSenderId = msg.chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const existingChatIndex = prevChats.findIndex(
                    c => c.id.replace('@s.whatsapp.net', '').replace('@c.us', '') === rawSenderId
                );

                const newMessage: ChatMessage = {
                    id: msg.id,
                    body: msg.body,
                    from: msg.from || msg.from_user,
                    to: msg.to || msg.to_user,
                    fromMe: msg.fromMe,
                    timestamp: msg.timestamp,
                    chatName: msg.chatName,
                };

                if (existingChatIndex >= 0) {
                    const updatedChats = [...prevChats];
                    const chat = { ...updatedChats[existingChatIndex] };
                    chat.messages = [...chat.messages, newMessage];
                    chat.lastMsg = newMessage.body;
                    chat.time = new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (!msg.fromMe) chat.unread = (chat.unread || 0) + 1;
                    updatedChats.splice(existingChatIndex, 1);
                    return [chat, ...updatedChats];
                } else {
                    const newChat: ChatItem = {
                        id: msg.chatId,
                        name: msg.chatName || rawSenderId,
                        phone: rawSenderId,
                        lastMsg: newMessage.body,
                        time: new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        unread: !msg.fromMe ? 1 : 0,
                        tag: 'Novo Contato',
                        tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                        messages: [newMessage],
                    };
                    return [newChat, ...prevChats];
                }
            });
        });

        // ✅ Proper cleanup
        return () => {
            newSocket.removeAllListeners();
            newSocket.disconnect();
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [startCountdown]);

    // ─── Load AI Context when chat changes ────────────────────────────────
    useEffect(() => {
        if (!selectedChat) { setLeadContext(null); return; }
        setIsContextLoading(true);
        setLeadContext(null);

        fetch(`${BACKEND_URL}/agent/context/${encodeURIComponent(selectedChat)}`)
            .then(r => r.json())
            .then(data => {
                setLeadContext(data.context || null);
                setIsContextLoading(false);
            })
            .catch(() => {
                setLeadContext(null);
                setIsContextLoading(false);
            });
    }, [selectedChat]);

    // ─── Constants ────────────────────────────────────────────────────────
    const QUICK_REPLIES = [
        { label: '☀️ Simulação', text: 'Olá! Posso preparar uma simulação personalizada de economia com energia solar para você. Qual é o valor médio da sua conta de luz?' },
        { label: '📅 Agendamento', text: 'Que tal agendarmos uma visita técnica gratuita? Nosso consultor vai até você sem compromisso. Qual o melhor dia e horário?' },
        { label: '💰 Proposta', text: 'Tenho uma proposta exclusiva preparada para você com as melhores condições de financiamento. Posso enviar os detalhes agora?' },
        { label: '⚡ Follow-up', text: 'Oi! Passando para saber se você teve a chance de analisar nossa proposta. Ficou alguma dúvida que posso esclarecer?' },
    ];

    const AVAILABLE_TAGS = [
        { label: 'Novo Contato', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
        { label: 'Em Qualificação', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
        { label: 'Proposta Enviada', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
        { label: 'Negócio Fechado', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
        { label: 'Não Interessado', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
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

        try {
            const res = await fetch(`${BACKEND_URL}/agent/suggest/${encodeURIComponent(activeChat.id)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: activeChat.messages.slice(-10).map(m => ({ role: m.fromMe ? 'assistant' : 'user', content: m.body })) }),
            });
            const data = await res.json();
            setAiSuggestion(data.suggestion || 'Não foi possível gerar sugestão.');
        } catch {
            setAiSuggestion('Erro ao conectar com a IA. Verifique o backend.');
        }
        setAiLoading(false);
    };

    const handleConnect = () => {
        if (socket) socket.emit('generate_qr');
    };

    const handleToggleAgent = async () => {
        try { await fetch(`${BACKEND_URL}/agent/toggle`, { method: 'POST' }); } catch {}
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Desconectar o WhatsApp da empresa? Você precisará escanear o QR novamente.')) return;
        try { await fetch(`${BACKEND_URL}/disconnect`, { method: 'POST' }); } catch {}
    };

    const handlePauseContact = async (contactId: string) => {
        const isPaused = pausedContacts.has(contactId);
        try {
            const endpoint = isPaused ? 'resume' : 'pause';
            await fetch(`${BACKEND_URL}/agent/${endpoint}/${encodeURIComponent(contactId)}`, { method: 'POST' });
        } catch {}
    };

    const handleActivateContact = async (contactId: string) => {
        const isActive = activeContacts.has(contactId);
        const endpoint = isActive ? 'deactivate' : 'activate';
        try { await fetch(`${BACKEND_URL}/agent/${endpoint}/${encodeURIComponent(contactId)}`, { method: 'POST' }); } catch {}
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChat(chatId);
        setAiSuggestion(null);
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
        setMobileShowChat(true); // On mobile, switch to chat view
    };

    const handleBackToList = () => {
        setMobileShowChat(false);
        setSelectedChat(null);
        setShowContactPanel(false);
    };

    // ─────────────────────────────────────────────────────────────────────
    // QR CODE SCREEN (Not connected)
    // ─────────────────────────────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-4xl bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
                    <div className="absolute top-0 right-0 w-[40%] h-full bg-lime-500/5 rounded-full blur-[100px] pointer-events-none" />

                    {/* Left: Instructions */}
                    <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative z-10">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-lime-400/10 border border-lime-400/20 rounded-2xl flex items-center justify-center mb-5 md:mb-6">
                            <MessageSquare size={28} className="text-lime-400" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3 md:mb-4">Conecte o WhatsApp da Empresa</h2>
                        <p className="text-slate-400 mb-6 md:mb-8 text-base md:text-lg">
                            Sincronize o número oficial da Quark Energia para atender todos os leads diretamente pelo CRM com automações nativas.
                        </p>
                        <ol className="space-y-4 md:space-y-6 text-slate-300 text-sm md:text-base">
                            <li className="flex gap-3 md:gap-4 items-start">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white text-xs md:text-sm">1</div>
                                <div>Abra o WhatsApp no seu celular oficial da empresa.</div>
                            </li>
                            <li className="flex gap-3 md:gap-4 items-start">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white text-xs md:text-sm">2</div>
                                <div>Toque em <strong>Mais opções</strong> (Android) ou <strong>Configurações</strong> (iPhone).</div>
                            </li>
                            <li className="flex gap-3 md:gap-4 items-start">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white text-xs md:text-sm">3</div>
                                <div>Exiba a câmera selecionando <strong>Aparelhos Conectados</strong>.</div>
                            </li>
                            <li className="flex gap-3 md:gap-4 items-start">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0 font-bold text-white text-xs md:text-sm">4</div>
                                <div>Aponte a câmera para o código QR ao lado.</div>
                            </li>
                        </ol>
                        <div className="mt-6 md:mt-8 flex items-center gap-2 text-xs text-slate-500 bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                            <ShieldCheck size={16} className="text-lime-500 flex-shrink-0" />
                            Conexão 100% segura usando end-to-end encryption.
                        </div>
                    </div>

                    {/* Right: QR Code */}
                    <div className="md:w-1/2 p-6 md:p-10 bg-zinc-900/30 flex items-center justify-center relative z-10">
                        <div className="text-center w-full max-w-sm">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 border ${backendOnline
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                {backendOnline ? 'Servidor WhatsApp Online' : 'Conectando ao servidor...'}
                            </div>

                            <div className="bg-white p-5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative mx-auto inline-block">
                                {qrCode ? (
                                    <div className="w-56 h-56 md:w-64 md:h-64 relative">
                                        {qrCountdown === 0 && (
                                            <div className="absolute inset-0 z-10 bg-white/90 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
                                                <RefreshCw size={36} className="text-lime-500 animate-spin mb-3" />
                                                <p className="text-slate-800 font-bold text-sm">Gerando novo QR Code...</p>
                                            </div>
                                        )}
                                        {qrCode.startsWith('data:image/') ? (
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain rounded-xl" />
                                        ) : (
                                            <QRCodeSVG
                                                value={qrCode}
                                                size={256}
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                                level="M"
                                                includeMargin={false}
                                                className="w-full h-full"
                                            />
                                        )}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-slate-100 shadow-sm">
                                            <Zap size={20} className="text-lime-500 fill-lime-500" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-56 h-56 md:w-64 md:h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl">
                                        <RefreshCw size={40} className="text-lime-500 animate-spin mb-4" />
                                        <p className="text-slate-700 font-bold text-sm">{backendOnline ? 'Gerando QR Code...' : 'Aguardando servidor...'}</p>
                                        <p className="text-slate-400 text-xs mt-1">Isso pode levar alguns segundos</p>
                                    </div>
                                )}
                            </div>

                            {qrCode && qrCountdown > 0 && (
                                <div className="mt-5">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                        <span className="flex items-center gap-1.5"><Clock size={12} />QR válido por</span>
                                        <span className={`font-bold font-mono text-sm ${qrCountdown <= 8 ? 'text-red-400' : qrCountdown <= 15 ? 'text-yellow-400' : 'text-lime-400'}`}>{qrCountdown}s</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${qrCountdown <= 8 ? 'bg-red-500' : qrCountdown <= 15 ? 'bg-yellow-500' : 'bg-lime-500'}`}
                                            style={{ width: `${(qrCountdown / QR_LIFETIME_SECONDS) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button onClick={handleConnect} className="mt-6 px-6 py-2.5 bg-lime-500/20 text-lime-400 hover:bg-lime-500 hover:text-black font-bold rounded-xl border border-lime-500/30 transition-all text-xs uppercase tracking-wide shadow-lg shadow-lime-500/10 active:scale-95">
                                Gerar QR Code
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

    // ─────────────────────────────────────────────────────────────────────
    // CONNECTED STATE: Full WhatsApp CRM
    // ─────────────────────────────────────────────────────────────────────
    const activeChat = chats.find(c => c.id === selectedChat);

    return (
        <div className="h-[calc(100vh-80px)] bg-[#050b14] border border-white/5 rounded-2xl overflow-hidden flex shadow-2xl relative animate-enter mx-auto">

            {/* ─── LEFT PANEL: Chat List ─────────────────────────────── */}
            <div className={`
                w-full md:w-80 flex flex-col border-r border-white/5 bg-[#0a0f16] shrink-0
                ${mobileShowChat ? 'hidden md:flex' : 'flex'}
            `}>
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
                        <button
                            onClick={handleToggleAgent}
                            title={agentEnabled ? 'Agente IA ligado' : 'Agente IA desligado'}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${agentEnabled
                                ? 'bg-lime-500/15 border-lime-500/30 text-lime-400'
                                : 'bg-zinc-800/60 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${agentEnabled ? 'bg-lime-400 animate-pulse' : 'bg-slate-600'}`} />
                            Bot {agentEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <button onClick={handleDisconnect} className="mt-2 text-[10px] text-slate-600 hover:text-red-400 transition-colors w-full text-left">
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
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors placeholder-slate-600"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageSquare size={32} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">{searchText ? 'Nenhuma conversa encontrada.' : 'Aguardando mensagens no WhatsApp...'}</p>
                            <p className="text-slate-600 text-xs mt-2">As conversas aparecerão aqui automaticamente quando alguém enviar uma mensagem.</p>
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={`p-3 border-b border-white/5 cursor-pointer transition-all flex gap-3 relative
                                    ${selectedChat === chat.id ? 'bg-lime-500/5' : 'hover:bg-white/[0.03]'}
                                    ${pausedContacts.has(chat.id) && activeContacts.has(chat.id) ? 'border-l-[3px] border-l-orange-500 bg-orange-500/5' : ''}
                                `}
                            >
                                {selectedChat === chat.id && !pausedContacts.has(chat.id) && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-lime-500" />}
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
                                            {agentEnabled && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${activeContacts.has(chat.id)
                                                    ? pausedContacts.has(chat.id)
                                                        ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                                                        : 'text-lime-400 bg-lime-400/10 border-lime-400/20'
                                                    : 'text-slate-600 bg-zinc-800/50 border-white/5'
                                                    }`}>
                                                    {activeContacts.has(chat.id) ? (pausedContacts.has(chat.id) ? 'Aguardando' : 'Bot ON') : 'Bot OFF'}
                                                </span>
                                            )}
                                            {chat.unread > 0 && (
                                                <div className="w-5 h-5 rounded-full bg-lime-500 text-black text-[10px] font-bold flex items-center justify-center">
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

            {/* ─── CENTER PANEL: Active Chat ─────────────────────────── */}
            <div className={`
                flex-1 flex flex-col bg-[#050b14] relative min-w-0
                ${!mobileShowChat ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: '400px', backgroundRepeat: 'repeat', filter: 'grayscale(100%) contrast(120%)' }} />

                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-14 md:h-16 px-3 md:px-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md z-20 shrink-0">
                            <div className="flex items-center gap-2 md:gap-3">
                                {/* Mobile back button */}
                                <button onClick={handleBackToList} className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center text-white font-bold text-sm md:text-base">
                                    {activeChat.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm leading-tight">{activeChat.name}</h3>
                                    <p className="text-xs text-slate-400 hidden sm:block">{activeChat.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 md:gap-2">
                                <button
                                    onClick={() => handleActivateContact(activeChat.id)}
                                    title={activeContacts.has(activeChat.id) ? 'Desativar bot' : 'Ativar bot'}
                                    className={`hidden sm:flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${!agentEnabled
                                        ? 'opacity-40 cursor-not-allowed bg-zinc-800/60 border-white/10 text-slate-600'
                                        : activeContacts.has(activeChat.id)
                                            ? 'bg-lime-500/15 border-lime-500/30 text-lime-400'
                                            : 'bg-zinc-800/60 border-white/10 text-slate-400 hover:border-lime-500/30 hover:text-lime-400'
                                        }`}
                                    disabled={!agentEnabled}
                                >
                                    {activeContacts.has(activeChat.id) ? <><Bot size={13} /> Bot Ativo</> : <><PowerOff size={13} /> Ativar Bot</>}
                                </button>
                                {activeContacts.has(activeChat.id) && (
                                    <button
                                        onClick={() => handlePauseContact(activeChat.id)}
                                        className={`hidden sm:flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${pausedContacts.has(activeChat.id)
                                            ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                                            : 'bg-zinc-800/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                            }`}
                                    >
                                        {pausedContacts.has(activeChat.id) ? <><PlayCircle size={13} /> Retomar</> : <><PauseCircle size={13} /> Pausar</>}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowContactPanel(v => !v)}
                                    className={`p-2 rounded-lg transition-colors text-sm border ${showContactPanel ? 'bg-lime-500/10 text-lime-400 border-lime-500/20' : 'bg-zinc-800/50 text-slate-400 border-white/5 hover:text-white'}`}
                                    title="Painel do Contato"
                                >
                                    <UserIcon size={16} />
                                </button>
                            </div>
                        </div>

                        {/* AI Suggestion Banner */}
                        {aiSuggestion && (
                            <div className="mx-3 md:mx-4 mt-3 p-3 bg-lime-500/10 border border-lime-500/20 rounded-xl text-sm text-lime-300 relative z-10">
                                <div className="flex items-start gap-2">
                                    <Zap size={14} className="text-lime-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-lime-400 text-xs mb-1">Quark IA Suggest</p>
                                        <p className="text-xs text-slate-300 whitespace-pre-line break-words">{aiSuggestion}</p>
                                    </div>
                                    <button onClick={() => { setMessageText(aiSuggestion || ''); setAiSuggestion(null); }} className="text-xs bg-lime-500 text-black font-bold px-2 py-1 rounded-lg flex-shrink-0">
                                        Usar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 p-3 md:p-5 overflow-y-auto flex flex-col gap-2.5 md:gap-3 relative z-10">
                            <div className="flex justify-center">
                                <span className="bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 font-medium px-3 py-1 rounded-full uppercase tracking-wider">
                                    Histórico via WhatsApp
                                </span>
                            </div>

                            {activeChat.messages && activeChat.messages.map((msg: ChatMessage, idx: number) => {
                                const msgDate = new Date(msg.timestamp * 1000);
                                const dateString = msgDate.toLocaleDateString('pt-BR');
                                const prevMsgDate = idx > 0 ? new Date(activeChat.messages[idx - 1].timestamp * 1000).toLocaleDateString('pt-BR') : null;
                                const showDate = dateString !== prevMsgDate;

                                return (
                                    <React.Fragment key={msg.id || idx}>
                                        {showDate && (
                                            <div className="flex justify-center my-3">
                                                <span className="bg-zinc-900 border border-white/10 text-[10px] text-zinc-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                                    {dateString === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : dateString}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${msg.fromMe ? 'self-end items-end' : 'self-start items-start'}`}>
                                            <div className={`px-3.5 py-2.5 shadow-md relative group ${msg.fromMe
                                                ? 'bg-lime-500 text-black rounded-2xl rounded-tr-sm'
                                                : 'bg-zinc-800 border border-white/5 text-slate-100 rounded-2xl rounded-tl-sm'
                                                }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                                {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {msg.fromMe && (
                                                    <svg viewBox="0 0 18 18" width="14" height="14" className="text-lime-500 ml-0.5">
                                                        <path fill="currentColor" d="M17.394 5.035l-.57-.444a.434.434 0 0 0-.609.076l-6.39 8.198a.38.38 0 0 1-.577.039l-.427-.388a.381.381 0 0 0-.578.038l-.451.576a.497.497 0 0 0 .043.645l1.575 1.51c.2.193.53.193.73-.01.206-.21.21-.54.015-.748L8.74 13.06l5.965-7.653a.434.434 0 0 0-.077-.611H17.4z"></path>
                                                        <path fill="currentColor" d="M10.776 5.035l-.57-.444a.434.434 0 0 0-.609.076l-6.39 8.198a.38.38 0 0 1-.577.039L1.04 11.458a.43.43 0 0 0-.604.032l-.46.568a.43.43 0 0 0 .032.604l2.844 2.302c.2.164.492.148.67-.043l6.096-7.854a.434.434 0 0 0-.077-.61z"></path>
                                                    </svg>
                                                )}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            
                            {aiLoading && (
                                <div className="self-start items-start flex flex-col gap-1 max-w-[85%] md:max-w-[75%] animate-pulse">
                                    <div className="px-4 py-3 shadow-md bg-zinc-800 border border-white/5 text-slate-100 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-[10px] text-lime-500 font-bold ml-1">IA digitando...</span>
                                </div>
                            )}
                            {/* Auto-scroll anchor */}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Reply Templates */}
                        <div className="px-3 md:px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar bg-zinc-900/20 z-20 shrink-0">
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
                        <div className="p-3 md:p-4 border-t border-white/5 bg-zinc-900/40 z-20 shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                            <form
                                className="flex items-end gap-2 bg-black/40 border border-white/10 p-1.5 md:p-2 rounded-2xl focus-within:border-lime-500/40 transition-colors"
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
                                <button type="button" className="p-2.5 md:p-3 text-slate-500 hover:text-slate-300 transition-colors rounded-xl hover:bg-white/5 flex-shrink-0">
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
                                    placeholder="Escreva uma mensagem..."
                                    className="flex-1 bg-transparent text-white py-2.5 md:py-3 px-2 text-sm focus:outline-none resize-none max-h-32 placeholder-slate-600"
                                    style={{ minHeight: '40px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageText.trim()}
                                    className="p-2.5 md:p-3 bg-lime-500 hover:bg-lime-400 text-black rounded-xl transition-all shadow-lg shadow-lime-500/20 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed group"
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
                        <p className="text-sm mt-2 text-slate-600 max-w-xs text-center">Escolha uma das conversas na lista para começar a atender.</p>
                    </div>
                )}
            </div>

            {/* ─── RIGHT PANEL: Contact Info (Desktop overlay on mobile) ─── */}
            {showContactPanel && activeChat && (
                <>
                    {/* Mobile overlay backdrop */}
                    <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setShowContactPanel(false)} />
                    <div className="
                        fixed right-0 top-0 bottom-0 w-[85%] max-w-sm z-50
                        md:static md:w-80 md:z-auto
                        border-l border-white/5 bg-[#050b14] flex flex-col shrink-0 overflow-y-auto relative isolate
                        animate-in slide-in-from-right duration-200
                    ">
                        {/* Close button (mobile) */}
                        <button onClick={() => setShowContactPanel(false)} className="md:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-10">
                            <X size={20} />
                        </button>

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

                        {/* AI Context */}
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

                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-start gap-3 transition-colors hover:bg-white/[0.04]">
                                        <div className="p-2 bg-lime-500/10 rounded-lg text-lime-400"><TrendingUp size={16} /></div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Conta Extraída</p>
                                            <p className="text-sm text-white font-medium">
                                                {leadContext.billValue ? `R$ ${leadContext.billValue}` : <span className="text-slate-600 italic">Analisando...</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-start gap-3 transition-colors hover:bg-white/[0.04]">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MapPin size={16} /></div>
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
                                    <p className="text-xs text-slate-500">Sem histórico de Inteligência para este lead.</p>
                                </div>
                            )}
                        </div>

                        {/* CRM Tags */}
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
                                {aiLoading ? 'Analisando conversa...' : 'Quark IA Suggest'}
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
                </>
            )}
        </div>
    );
};

export default Conversations;
