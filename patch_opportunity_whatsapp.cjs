const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/OpportunityDetailsPanel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const stateVariablesRegex = /const \[newTaskDate, setNewTaskDate\] = useState\(''\);/;
const stateVariablesReplacement = `const [newTaskDate, setNewTaskDate] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);`;

content = content.replace(stateVariablesRegex, stateVariablesReplacement);

const fetchFunctionRegex = /const mockWhatsAppMessages = \[\s*\{ id: 1[^\]]*\];/;
const fetchFunctionReplacement = `const mockWhatsAppMessages = [
    { id: 1, type: 'in', text: 'Olá, gostaria de saber mais sobre os serviços de vocês.', time: '10:30' },
    { id: 2, type: 'out', text: 'Olá! Claro, como podemos ajudar? O que você busca no momento?', time: '10:35' },
    { id: 3, type: 'in', text: 'Estou buscando uma solução para minha empresa.', time: '10:42' },
  ];

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchWhatsappMessages();
    }
  }, [activeTab, opportunity.phone]);

  const fetchWhatsappMessages = async () => {
    if (!opportunity.phone) return;
    const cleanPhone = opportunity.phone.replace(/\\D/g, '');
    if (cleanPhone.length < 10) return;
    
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .like('chat_id', \`\${cleanPhone}%\`)
      .order('timestamp', { ascending: true });
    
    if (data && data.length > 0) {
      setWhatsappMessages(data.map(m => ({
        id: m.id,
        type: m.from_user === 'me' ? 'out' : 'in',
        text: m.body,
        time: new Date(m.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      })));
    } else {
      setWhatsappMessages([]);
    }
  };

  const handleSendWhatsapp = async () => {
    if (!whatsappInput.trim() || !opportunity.phone) return;
    setSendingMsg(true);
    try {
      const cleanPhone = opportunity.phone.replace(/\\D/g, '');
      const response = await fetch('http://localhost:8082/message/sendText/quark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'quark_senha_secreta_123'
        },
        body: JSON.stringify({
          number: cleanPhone,
          textMessage: { text: whatsappInput }
        })
      });
      if (response.ok) {
        setWhatsappInput('');
        setTimeout(fetchWhatsappMessages, 1000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };`;

content = content.replace(fetchFunctionRegex, fetchFunctionReplacement);

const renderRegex = /\{mockWhatsAppMessages\.map\(msg => \(\s*<div key=\{msg\.id\}[^]*?\{msg\.time\}<\/span>\s*<\/div>\s*<\/div>\s*\)\)\}/;
const renderReplacement = `{(whatsappMessages.length > 0 ? whatsappMessages : mockWhatsAppMessages).map((msg: any) => (
                  <div key={msg.id} className={\`flex w-full \${msg.type === 'out' ? 'justify-end' : 'justify-start'}\`}>
                    <div className={\`max-w-[80%] p-3 rounded-2xl \${msg.type === 'out' ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}\`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-[10px] text-white/50 block text-right mt-1 font-mono">{msg.time}</span>
                    </div>
                  </div>
                ))}`;

content = content.replace(renderRegex, renderReplacement);

const inputRegex = /<input type="text" placeholder="Digite uma mensagem..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-white focus:border-green-500 outline-none transition-all placeholder-zinc-600" \/>\s*<button className="absolute right-2 top-1\/2 -translate-y-1\/2 p-2 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-all shadow-lg shadow-green-500\/20">\s*<Send size=\{16\} \/>\s*<\/button>/;
const inputReplacement = `<input 
                  type="text" 
                  placeholder="Digite uma mensagem..." 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-white focus:border-green-500 outline-none transition-all placeholder-zinc-600" 
                  value={whatsappInput}
                  onChange={e => setWhatsappInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendWhatsapp()}
                />
                <button 
                  onClick={handleSendWhatsapp}
                  disabled={sendingMsg}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                >
                  {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>`;

content = content.replace(inputRegex, inputReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('OpportunityDetailsPanel patched successfully!');
