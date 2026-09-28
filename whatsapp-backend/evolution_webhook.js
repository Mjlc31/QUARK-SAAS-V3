const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Assuming SUPABASE_URL and SUPABASE_KEY are provided in .env
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    process.env.SUPABASE_KEY || 'your-anon-key'
);

const PORT = process.env.EVOLUTION_WEBHOOK_PORT || 3002;

/**
 * Expose endpoint for Evolution API Webhooks
 */
app.post('/webhook/evolution', async (req, res) => {
    try {
        const body = req.body;
        
        // Respond quickly to Evolution API
        res.status(200).send('OK');

        // Evolution API usually sends events in a format like:
        // {
        //   "event": "messages.upsert",
        //   "instance": "my-instance",
        //   "data": { ... }
        // }
        const eventType = body.event;
        const instance = body.instance;
        const data = body.data;

        console.log(`[Evolution Webhook] Received event: ${eventType} from instance: ${instance}`);

        if (eventType === 'messages.upsert') {
            await handleMessagesUpsert(data, instance);
        } else if (eventType === 'messages.set') {
            // Bulk historical messages sync
            await handleMessagesSet(data, instance);
        } else if (eventType === 'connection.update') {
            await handleConnectionUpdate(data, instance);
        } else {
            console.log(`[Evolution Webhook] Unhandled event type: ${eventType}`);
        }
    } catch (error) {
        console.error('[Evolution Webhook] Error handling webhook:', error);
    }
});

async function handleMessagesUpsert(data, instance) {
    if (!data || !data.message) {
        return;
    }

    // Typical Evolution v2 payload format for message.
    const messageId = data.key?.id;
    const remoteJid = data.key?.remoteJid;
    const fromMe = data.key?.fromMe;
    const pushName = data.pushName;
    
    // Extract text content from various possible message types
    let messageText = '';
    const msgType = Object.keys(data.message || {})[0];

    if (msgType === 'conversation') {
        messageText = data.message.conversation;
    } else if (msgType === 'extendedTextMessage') {
        messageText = data.message.extendedTextMessage.text;
    } else if (msgType === 'imageMessage') {
        messageText = data.message.imageMessage.caption || '[Image]';
    } else if (msgType === 'videoMessage') {
        messageText = data.message.videoMessage.caption || '[Video]';
    } else if (msgType === 'audioMessage') {
        messageText = '[Audio]';
    } else if (msgType === 'documentMessage') {
        messageText = '[Document]';
    } else {
        messageText = `[${msgType}]`;
    }

    console.log(`[Evolution Webhook] Message from ${remoteJid} (fromMe: ${fromMe}): ${messageText}`);

    // Stub insert to Supabase
    // Make sure the table `evolution_messages` exists in your Supabase schema
    try {
        const { error } = await supabase
            .from('whatsapp_messages')
            .insert([{
                id: messageId,
                chat_id: remoteJid,
                from_user: fromMe ? 'me' : remoteJid,
                to_user: fromMe ? remoteJid : 'me',
                from_me: fromMe,
                chat_name: pushName,
                body: messageText,
                is_group: false,
                timestamp: Math.floor(Date.now() / 1000)
            }]);

        if (error) {
            console.error('[Evolution Webhook] Error inserting message to Supabase:', error);
        } else {
            console.log('[Evolution Webhook] Successfully logged message to Supabase');
        }
    } catch (dbError) {
        console.error('[Evolution Webhook] DB exception:', dbError);
    }
}

async function handleConnectionUpdate(data, instance) {
    // Data might contain state like "open", "close", "connecting"
    const state = data.state;
    const statusReason = data.statusReason;
    
    console.log(`[Evolution Webhook] Connection update for ${instance}: ${state} (Reason: ${statusReason})`);
    
    // Log connection status update to Supabase (optional stub)
    try {
        const { error } = await supabase
            .from('evolution_connections')
            .upsert([{
                instance: instance,
                state: state,
                status_reason: statusReason,
                updated_at: new Date().toISOString()
            }], { onConflict: 'instance' });
            
        if (error) {
            console.error('[Evolution Webhook] Error updating connection status to Supabase:', error);
        }
    } catch (dbError) {
        console.error('[Evolution Webhook] DB exception on connection update:', dbError);
    }
}

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[Evolution Webhook] Server listening on port ${PORT}`);
    });
}

module.exports = app;


async function handleMessagesSet(data, instance) {
    if (!data.messages || !data.messages.length) return;
    console.log(`[Evolution Webhook] Syncing ${data.messages.length} historical messages`);
    
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
            console.log(`[Evolution Webhook] Successfully inserted ${inserts.length} historical messages`);
        }
    }
}
