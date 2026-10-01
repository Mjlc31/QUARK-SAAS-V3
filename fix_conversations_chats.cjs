const fs = require('fs');

let content = fs.readFileSync('src/pages/Conversations.tsx', 'utf8');

content = content.replace(
    /const \[chats, setChats\] = useState<ChatItem\[\]>\(\[\]\);/,
`const [chats, setChats] = useState<ChatItem[]>([]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const { data, error } = await supabase
                    .from('whatsapp_messages')
                    .select('*')
                    .order('timestamp', { ascending: true });
                
                if (error) throw error;
                if (!data) return;

                const chatMap = new Map<string, ChatItem>();

                data.forEach((msg: any) => {
                    const chatId = msg.chat_id;
                    if (!chatId) return;

                    const isMe = msg.from_me;
                    const name = msg.chat_name || chatId.split('@')[0];

                    if (!chatMap.has(chatId)) {
                        chatMap.set(chatId, {
                            id: chatId,
                            name: name,
                            phone: chatId.split('@')[0],
                            lastMsg: msg.body,
                            time: new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                            unread: 0,
                            tag: 'Lead',
                            tagColor: 'bg-blue-500/20 text-blue-400',
                            messages: []
                        });
                    }

                    const chat = chatMap.get(chatId)!;
                    chat.lastMsg = msg.body;
                    chat.time = new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    chat.messages.push({
                        id: msg.id,
                        body: msg.body,
                        from: msg.from_user,
                        to: msg.to_user,
                        fromMe: isMe,
                        timestamp: msg.timestamp,
                        chatName: name
                    });
                });

                setChats(Array.from(chatMap.values()).sort((a, b) => b.messages[b.messages.length - 1].timestamp - a.messages[a.messages.length - 1].timestamp));
            } catch (err) {
                console.error("Error fetching chats", err);
            }
        };

        fetchChats();

        const subscription = supabase
            .channel('whatsapp_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, payload => {
                const msg = payload.new;
                setChats(prev => {
                    const chatId = msg.chat_id;
                    if (!chatId) return prev;
                    const existingChatIndex = prev.findIndex(c => c.id === chatId);
                    const newMsg = {
                        id: msg.id,
                        body: msg.body,
                        from: msg.from_user,
                        to: msg.to_user,
                        fromMe: msg.from_me,
                        timestamp: msg.timestamp,
                        chatName: msg.chat_name || chatId.split('@')[0]
                    };
                    
                    if (existingChatIndex >= 0) {
                        const newChats = [...prev];
                        const chat = { ...newChats[existingChatIndex] };
                        chat.messages = [...chat.messages, newMsg];
                        chat.lastMsg = msg.body;
                        chat.time = new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        chat.unread = selectedChat === chatId ? 0 : chat.unread + 1;
                        newChats[existingChatIndex] = chat;
                        return newChats.sort((a, b) => b.messages[b.messages.length - 1].timestamp - a.messages[a.messages.length - 1].timestamp);
                    } else {
                        const newChat = {
                            id: chatId,
                            name: msg.chat_name || chatId.split('@')[0],
                            phone: chatId.split('@')[0],
                            lastMsg: msg.body,
                            time: new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                            unread: 1,
                            tag: 'Novo',
                            tagColor: 'bg-green-500/20 text-green-400',
                            messages: [newMsg]
                        };
                        return [newChat, ...prev];
                    }
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);`
);

fs.writeFileSync('src/pages/Conversations.tsx', content);
console.log("Updated Conversations.tsx with fetchChats!");
