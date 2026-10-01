const fs = require('fs');

let content = fs.readFileSync('whatsapp-backend/evolution_webhook.js', 'utf8');

const replacement = `
        if (eventType === 'messages.upsert') {
            await handleMessagesUpsert(data, instance);
        } else if (eventType === 'messages.set') {
            // Bulk historical messages sync
            await handleMessagesSet(data, instance);
        } else if (eventType === 'connection.update') {
`;

content = content.replace(`
        if (eventType === 'messages.upsert') {
            await handleMessagesUpsert(data, instance);
        } else if (eventType === 'connection.update') {
`, replacement);

const handlerCode = `
async function handleMessagesSet(data, instance) {
    if (!data.messages || !Array.length) return;
    console.log(\`[Evolution Webhook] Syncing \${data.messages.length} historical messages\`);
    
    const inserts = [];
    for (const msg of data.messages) {
        if (!msg.key) continue;
        const messageId = msg.key.id;
        const remoteJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const pushName = msg.pushName || '';
        
        let messageText = '';
        if (msg.message?.conversation) messageText = msg.message.conversation;
        else if (msg.message?.extendedTextMessage?.text) messageText = msg.message.extendedTextMessage.text;
        
        const timestamp = msg.messageTimestamp || Math.floor(Date.now() / 1000);
        
        inserts.push({
            id: messageId,
            chat_id: remoteJid,
            from_user: fromMe ? 'me' : remoteJid,
            to_user: fromMe ? remoteJid : 'me',
            from_me: fromMe,
            chat_name: pushName || remoteJid.split('@')[0],
            body: messageText || '[Media/Unsupported]',
            is_group: remoteJid.includes('@g.us'),
            timestamp: timestamp
        });
    }

    if (inserts.length > 0) {
        const { error } = await supabase
            .from('whatsapp_messages')
            .upsert(inserts, { onConflict: 'id' });
            
        if (error) {
            console.error('[Evolution Webhook] Error inserting historical messages:', error);
        } else {
            console.log(\`[Evolution Webhook] Successfully inserted \${inserts.length} historical messages\`);
        }
    }
}
`;

content = content + '\n' + handlerCode;
fs.writeFileSync('whatsapp-backend/evolution_webhook.js', content);
console.log("Updated webhook to handle messages.set");
