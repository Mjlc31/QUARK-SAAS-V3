import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://sumydaewtszecrvdgoku.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const bearer = (header) => (typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i)?.[1] : undefined);

/**
 * Valida o JWT do Supabase e resolve o papel com as mesmas regras da RLS:
 * is_team_member() para equipe, client_portal_users.auth_user_id para cliente do portal.
 * Retorna null para token ausente, inválido ou igual à anon key (que é pública).
 */
export async function resolveAuth(token) {
  if (!token || token === ANON_KEY || !ANON_KEY) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [team, profile] = await Promise.all([
    asUser.rpc('is_team_member'),
    asUser.from('client_portal_users').select('id').eq('auth_user_id', data.user.id).maybeSingle(),
  ]);

  return { user: data.user, isTeam: team.data === true, clientId: profile.data?.id ?? null };
}

async function attachAuth(req) {
  if (req.auth === undefined) {
    req.auth = await resolveAuth(bearer(req.headers.authorization)).catch(() => null);
  }
  return req.auth;
}

/** Qualquer usuário logado (equipe ou cliente do portal). */
export const requireUser = async (req, res, next) => {
  if (!(await attachAuth(req))) return res.status(401).json({ success: false, error: 'Não autenticado' });
  next();
};

/** Só equipe Quark (Sales/Admin...). */
export const requireTeam = async (req, res, next) => {
  const auth = await attachAuth(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Não autenticado' });
  if (!auth.isTeam) return res.status(403).json({ success: false, error: 'Acesso restrito à equipe' });
  next();
};

/** Equipe acessa qualquer cliente; cliente do portal só o próprio id. */
export const canAccessClient = (req, clientId) =>
  Boolean(req.auth?.isTeam || (req.auth?.clientId && clientId === req.auth.clientId));

/** Exige acesso ao cliente indicado em req.params[param]. Usar depois de requireUser. */
export const requireClientAccess = (param = 'clientId') => (req, res, next) => {
  if (!canAccessClient(req, req.params[param])) {
    return res.status(403).json({ success: false, error: 'Acesso negado a este cliente' });
  }
  next();
};

/** Middleware do Socket.IO: só equipe recebe eventos (mensagens de WhatsApp, chamados etc.). */
export const socketRequireTeam = async (socket, next) => {
  const token = socket.handshake.auth?.token || bearer(socket.handshake.headers?.authorization);
  const auth = await resolveAuth(token).catch(() => null);
  if (!auth?.isTeam) return next(new Error('unauthorized'));
  socket.data.auth = auth;
  next();
};

/** Webhook de terceiros (Evolution API): segredo compartilhado em ?token= ou no header x-webhook-secret. Sem segredo configurado, nega. */
export const requireWebhookSecret = (secret) => (req, res, next) => {
  const given = String(req.query?.token || req.headers?.['x-webhook-secret'] || '');
  const a = Buffer.from(given);
  const b = Buffer.from(secret || '');
  if (!b.length || a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ success: false, error: 'Webhook não autorizado' });
  next();
};
