const fs = require('fs');

let content = fs.readFileSync('src/pages/Conversations.tsx', 'utf8');

const missingCode = `
    const handleToggleAgent = async () => {
        const newState = !agentEnabled;
        setAgentEnabled(newState);
        try {
            await fetch(\`\${BACKEND_URL}/agent/toggle\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newState })
            });
        } catch (e) {
            console.error("Failed to toggle agent", e);
        }
    };

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
        { label: 'Cliente', color: 'text-lime-400 bg-lime-400/10 border-lime-400/20' },
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
            const res = await fetch(\`\${BACKEND_URL}/agent/suggest/\${encodeURIComponent(activeChat.id)}\`, {
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

    const handleConnectWhatsapp = () => {`;

content = content.replace("    const handleConnectWhatsapp = () => {", missingCode);

fs.writeFileSync('src/pages/Conversations.tsx', content);
console.log("Fixed missing variables!");
