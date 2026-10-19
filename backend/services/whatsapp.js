import axios from 'axios';
import crypto from 'crypto';
import { supabase } from './supabase.js';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8082';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'quark_senha_secreta_123';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'quark';

export const evoClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    apikey: EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export function cleanPhoneNumber(number) {
  if (!number) return '';
  let cleaned = String(number).replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
  }
  return cleaned;
}

export function formatJid(phone) {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned ? `${cleaned}@s.whatsapp.net` : phone;
}

/**
 * Envia mensagem via Evolution API e armazena histórico no Supabase.
 * @param {string} number - Telefone do destinatário
 * @param {string} message - Texto da mensagem
 * @param {object} [options] - Opções adicionais (chatName, io, userId)
 */
export async function sendWhatsAppMessage(number, message, options = {}) {
  const cleanPhone = cleanPhoneNumber(number);
  if (!cleanPhone || !message) {
    return { success: false, error: 'Telefone e mensagem são obrigatórios' };
  }

  const jid = formatJid(cleanPhone);
  console.log(`[EVOLUTION] Enviando mensagem para ${cleanPhone} (${jid})...`);

  let evoSuccess = false;
  let evoError = null;
  let evoData = null;

  try {
    const res = await evoClient.post(`/message/sendText/${INSTANCE_NAME}`, {
      number: cleanPhone,
      text: message,
    });
    evoSuccess = true;
    evoData = res.data;
    console.log(`[EVOLUTION] Mensagem enviada com sucesso para ${cleanPhone}`);
  } catch (err) {
    evoError = err.response?.data?.message || err.message;
    console.warn(`[EVOLUTION] Aviso: Falha ao despachar via Evolution API (${evoError}). Gravando log no banco.`);
  }

  // Grava mensagem no Supabase para histórico e auditoria
  try {
    const messageRecord = {
      id: crypto.randomUUID(),
      chat_id: jid,
      chat_name: options.chatName || cleanPhone,
      from_user: 'me',
      to_user: jid,
      from_me: true,
      body: message,
      is_group: false,
      timestamp: Math.floor(Date.now() / 1000),
      created_at: new Date().toISOString(),
    };

    if (options.userId) {
      messageRecord.user_id = options.userId;
    }

    const { error: dbError } = await supabase.from('whatsapp_messages').insert([messageRecord]);
    if (dbError) {
      console.warn('[SUPABASE] Aviso ao salvar mensagem:', dbError.message);
    }
  } catch (dbEx) {
    console.warn('[SUPABASE] Exceção ao gravar whatsapp_messages:', dbEx.message);
  }

  // Notifica via Socket.IO se disponível
  if (options.io) {
    options.io.emit('whatsapp:message_sent', {
      phone: cleanPhone,
      message,
      success: evoSuccess,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    success: evoSuccess,
    delivered: evoSuccess,
    phone: cleanPhone,
    data: evoData,
    error: evoError,
  };
}

export default {
  cleanPhoneNumber,
  formatJid,
  sendWhatsAppMessage,
  evoClient,
};
