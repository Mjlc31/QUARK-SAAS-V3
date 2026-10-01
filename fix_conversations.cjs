const fs = require('fs');

let content = fs.readFileSync('src/pages/Conversations.tsx', 'utf8');

// Replace the Evolution API logic with a much stronger one
content = content.replace(
    /const \[showQrModal, setShowQrModal\] = useState\(false\);[\s\S]*?const handleBackToList = \(\) => {/m,
`const [showQrModal, setShowQrModal] = useState(false);
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting' | 'unknown'>('unknown');
    const [evoInstance, setEvoInstance] = useState<any>(null);

    const checkConnectionState = async () => {
        try {
            const res = await fetch('http://localhost:8082/instance/connectionState/QuarkCRM', {
                headers: { 'apikey': 'YOUR_GLOBAL_API_KEY' }
            });
            if (res.status === 404) {
                setConnectionState('disconnected');
                return;
            }
            const data = await res.json();
            if (data.instance?.state === 'open') {
                setConnectionState('connected');
                setEvoInstance(data.instance);
                setShowQrModal(false);
            } else if (data.instance?.state === 'connecting') {
                setConnectionState('connecting');
            } else {
                setConnectionState('disconnected');
            }
        } catch (e) {
            console.error("Evolution API check failed", e);
            setConnectionState('unknown');
        }
    };

    useEffect(() => {
        checkConnectionState();
        const interval = setInterval(checkConnectionState, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchQrCode = async () => {
        setQrLoading(true);
        setQrError(null);
        try {
            // First check if instance exists
            const stateRes = await fetch('http://localhost:8082/instance/connectionState/QuarkCRM', {
                headers: { 'apikey': 'YOUR_GLOBAL_API_KEY' }
            });
            
            let res;
            if (stateRes.status === 404) {
                // Create new
                res = await fetch('http://localhost:8082/instance/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': 'YOUR_GLOBAL_API_KEY'
                    },
                    body: JSON.stringify({ instanceName: 'QuarkCRM', integration: 'WHATSAPP-BAILEYS', qrcode: true })
                });
            } else {
                // Connect existing
                res = await fetch('http://localhost:8082/instance/connect/QuarkCRM', {
                    method: 'GET',
                    headers: { 'apikey': 'YOUR_GLOBAL_API_KEY' }
                });
            }

            const data = await res.json();
            
            if (data.instance?.state === 'open') {
                setConnectionState('connected');
                setShowQrModal(false);
                return;
            }

            const base64 = data.qrcode?.base64 || data.base64;
            if (base64) {
                setQrCodeBase64(base64);
            } else {
                setQrError('QR Code não retornado pela API. O WhatsApp já pode estar conectado.');
            }
        } catch (err: any) {
            setQrError('Erro ao conectar na Evolution API. Verifique se o servidor local (8082) está rodando.');
        } finally {
            setQrLoading(false);
        }
    };

    const handleConnectWhatsapp = () => {
        setShowQrModal(true);
        fetchQrCode();
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp da empresa?')) return;
        try { 
            await fetch('http://localhost:8082/instance/logout/QuarkCRM', {
                method: 'DELETE',
                headers: { 'apikey': 'YOUR_GLOBAL_API_KEY' }
            });
            setConnectionState('disconnected');
            setQrCodeBase64(null);
        } catch (e) {
            console.error(e);
        }
    };

    const handlePauseContact = async (contactId: string) => {
        const isPaused = pausedContacts.has(contactId);
        try {
            const endpoint = isPaused ? 'resume' : 'pause';
            await fetch(\`\${BACKEND_URL}/agent/\${endpoint}/\${encodeURIComponent(contactId)}\`, { method: 'POST' });
        } catch {}
    };

    const handleActivateContact = async (contactId: string) => {
        const isActive = activeContacts.has(contactId);
        const endpoint = isActive ? 'deactivate' : 'activate';
        try { await fetch(\`\${BACKEND_URL}/agent/\${endpoint}/\${encodeURIComponent(contactId)}\`, { method: 'POST' }); } catch {}
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChat(chatId);
        setAiSuggestion(null);
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
        setMobileShowChat(true);
    };

    const handleBackToList = () => {`
);

// Update connection status in sidebar
content = content.replace(
    /<div className="mt-3 flex flex-col gap-2">[\s\S]*?<\/div>/m,
`<div className="mt-3 flex flex-col gap-2">
                        {connectionState === 'connected' ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-2 w-full py-2 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold rounded-lg">
                                    <ShieldCheck size={14} />
                                    WhatsApp Conectado
                                </div>
                                <button onClick={handleDisconnect} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors w-full text-center py-1 flex items-center justify-center gap-1">
                                    <PowerOff size={10} /> Desconectar Instância
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnectWhatsapp}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-lime-500 hover:bg-lime-400 text-black text-xs font-bold rounded-lg transition-colors"
                            >
                                <QrCode size={14} />
                                Conectar WhatsApp
                            </button>
                        )}
                    </div>`
);

fs.writeFileSync('src/pages/Conversations.tsx', content);
console.log("Updated Conversations.tsx!");
