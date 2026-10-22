import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../services/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/** Helper para sanitizar números */
const sanitizeNumber = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = typeof val === 'string' ? Number(val.replace(',', '.')) : Number(val);
  return Number.isFinite(n) ? n : null;
};

/** Helper para apenas dígitos */
const onlyDigits = (str) => (typeof str === 'string' ? str.replace(/\D/g, '') : '');

/** Sincroniza cliente com o CRM (status Ganho) e com o Financeiro (Receita) */
async function syncClientToCrmAndFinancial(client, rawBody = {}) {
  try {
    const STORE_PATH = path.resolve(__dirname, '../data/opportunities_store.json');
    const DELETED_PATH = path.resolve(__dirname, '../data/deleted_opportunities.json');

    const contractAmount = sanitizeNumber(rawBody.contract_value ?? rawBody.system_cost ?? rawBody.amount)
      || (client.system_size_kw ? Math.round(Number(client.system_size_kw) * 3800) : 25000);

    // 1. Sincronização com CRM (Oportunidade Ganha)
    const oppId = `opp_cli_${client.id}`;
    const oppPayload = {
      id: oppId,
      title: client.name,
      status: 'Ganho',
      amount: contractAmount,
      phone: client.phone || null,
      email: client.email || null,
      cpf_cnpj: client.cpf || null,
      city: client.city || 'Maceió',
      services: ['solar'],
      source: 'Catálogo de Clientes',
      temperature: 'quente',
      notes: `Cliente cadastrado no Catálogo (${client.system_size_kw || 0} kWp). CPF: ${client.cpf || 'Não informado'}.`,
      created_at: client.install_date ? new Date(client.install_date).toISOString() : (client.created_at || new Date().toISOString()),
      updated_at: new Date().toISOString()
    };

    // Remove do conjunto de deletados se estivesse lá
    if (fs.existsSync(DELETED_PATH)) {
      try {
        const deleted = JSON.parse(fs.readFileSync(DELETED_PATH, 'utf8'));
        if (Array.isArray(deleted)) {
          const filtered = deleted.filter(id => id !== oppId && id !== String(client.id));
          fs.writeFileSync(DELETED_PATH, JSON.stringify(filtered, null, 2), 'utf8');
        }
      } catch (_) {}
    }

    // Grava no store do CRM
    if (fs.existsSync(STORE_PATH)) {
      try {
        const opps = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        if (Array.isArray(opps)) {
          const idx = opps.findIndex(o => o.id === oppId || (o.title && o.title.toLowerCase() === client.name.toLowerCase()));
          if (idx >= 0) {
            opps[idx] = { ...opps[idx], ...oppPayload, status: 'Ganho', amount: contractAmount, updated_at: new Date().toISOString() };
          } else {
            opps.unshift(oppPayload);
          }
          fs.writeFileSync(STORE_PATH, JSON.stringify(opps, null, 2), 'utf8');
          console.log(`[ClientsAPI] Sincronizado automaticamente com CRM Ganho: ${client.name} (R$ ${contractAmount})`);
        }
      } catch (e) {
        console.error('[ClientsAPI] Erro ao gravar oportunidade:', e);
      }
    }

    // Tenta persistir no Supabase (opportunities) em background
    try {
      supabase.from('opportunities').upsert({
        title: oppPayload.title,
        status: 'Ganho',
        amount: contractAmount,
        phone: oppPayload.phone,
        city: oppPayload.city,
      }).catch(() => {});
    } catch (_) {}

    // 2. Sincronização com o Financeiro
    const txDate = client.install_date || new Date().toISOString().split('T')[0];
    const txId = `tx_cli_${client.id}`;
    const txPayload = {
      id: txId,
      description: `Contrato Solar — ${client.name}`,
      type: 'receita',
      category: client.system_size_kw && client.system_size_kw > 10 ? 'instalacao_comercial' : 'instalacao_residencial',
      amount: contractAmount,
      date: txDate,
      note: `Contrato originado do Catálogo de Clientes (CPF: ${client.cpf || 'N/A'}, Potência: ${client.system_size_kw || 0} kWp)`
    };

    // Tenta salvar no Supabase (financial_transactions)
    try {
      supabase.from('financial_transactions').upsert(txPayload).catch(() => {});
    } catch (_) {}

  } catch (syncErr) {
    console.error('[ClientsAPI] Erro ao sincronizar CRM/Financeiro:', syncErr);
  }
}

// ─── GET /api/clients ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    let query = supabase
      .from('client_portal_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[ClientsAPI] Erro ao listar clientes do Supabase:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, count: data?.length || 0, clients: data || [] });
  } catch (err) {
    console.error('[ClientsAPI] Erro interno:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/clients ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'O nome do cliente é obrigatório.' });
    }

    const email = body.email && typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null;
    const phone = body.phone && typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
    const rawCpf = body.cpf && typeof body.cpf === 'string' ? body.cpf.trim() : null;
    const cpfDigits = rawCpf ? onlyDigits(rawCpf) : null;
    // Prefer clean digits for CPF in DB if available, else null
    const cpf = cpfDigits && cpfDigits.length >= 11 ? cpfDigits : (rawCpf || null);

    const birth_date = body.birth_date && typeof body.birth_date === 'string' && body.birth_date.trim() ? body.birth_date.trim() : null;
    const install_date = body.install_date && typeof body.install_date === 'string' && body.install_date.trim() ? body.install_date.trim() : null;

    const payload = {
      name,
      email,
      phone,
      cpf,
      birth_date,
      city: body.city?.trim() || 'Maceió',
      state: body.state?.trim() || 'AL',
      address: body.address?.trim() || null,
      cep: body.cep?.trim() || null,
      utility_company: body.utility_company?.trim() || 'Equatorial',
      utility_account: body.utility_account?.trim() || null,
      system_size_kw: sanitizeNumber(body.system_size_kw),
      contract_value: sanitizeNumber(body.contract_value ?? body.system_cost),
      system_cost: sanitizeNumber(body.contract_value ?? body.system_cost),
      install_date,
      monthly_avg_kwh: sanitizeNumber(body.monthly_avg_kwh),
      notes: body.notes?.trim() || null,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    };

    // 1. Verifica se já existe cliente com mesmo CPF ou Email
    let existingId = null;
    if (cpf) {
      let q = supabase.from('client_portal_users').select('id, name');
      if (rawCpf && rawCpf !== cpf) {
        q = q.in('cpf', [cpf, rawCpf]);
      } else {
        q = q.eq('cpf', cpf);
      }
      const { data: byCpf } = await q.maybeSingle();
      if (byCpf) existingId = byCpf.id;
    }

    if (!existingId && email) {
      const { data: byEmail } = await supabase
        .from('client_portal_users')
        .select('id, name')
        .eq('email', email)
        .maybeSingle();
      if (byEmail) existingId = byEmail.id;
    }

    // Se já existe, faz UPDATE (evita erro 23505 e perda de dados)
    if (existingId) {
      const { data: updated, error: updErr } = await supabase
        .from('client_portal_users')
        .update({
          ...payload,
          deleted_at: null,
          is_active: true,
        })
        .eq('id', existingId)
        .select()
        .single();

      if (updErr) {
        console.error('[ClientsAPI] Erro ao atualizar cliente existente:', updErr);
        return res.status(500).json({ success: false, error: updErr.message });
      }

      console.log(`[ClientsAPI] Cliente existente atualizado: ${updated.name} (${updated.id})`);
      await syncClientToCrmAndFinancial(updated, body);
      return res.json({ success: true, client: updated, action: 'updated' });
    }

    // 2. Se não existe, faz INSERT
    const { data: inserted, error: insErr } = await supabase
      .from('client_portal_users')
      .insert(payload)
      .select()
      .single();

    if (insErr) {
      // Se houver conflito de chave única concorrente (23505)
      if (insErr.code === '23505') {
        const { data: fallbackExisting } = await supabase
          .from('client_portal_users')
          .select('*')
          .or(`name.eq.${name}${cpf ? `,cpf.eq.${cpf}` : ''}${email ? `,email.eq.${email}` : ''}`)
          .maybeSingle();

        if (fallbackExisting) {
          const { data: merged } = await supabase
            .from('client_portal_users')
            .update(payload)
            .eq('id', fallbackExisting.id)
            .select()
            .single();
          await syncClientToCrmAndFinancial(merged || fallbackExisting, body);
          return res.json({ success: true, client: merged || fallbackExisting, action: 'merged' });
        }
      }

      console.error('[ClientsAPI] Erro ao cadastrar cliente:', insErr);
      return res.status(500).json({ success: false, error: insErr.message });
    }

    console.log(`[ClientsAPI] Novo cliente cadastrado com sucesso: ${inserted.name} (${inserted.id})`);
    await syncClientToCrmAndFinancial(inserted, body);
    return res.status(201).json({ success: true, client: inserted, action: 'created' });
  } catch (err) {
    console.error('[ClientsAPI] Exceção interna ao cadastrar cliente:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/clients/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.email !== undefined) updates.email = body.email ? body.email.trim().toLowerCase() : null;
    if (body.phone !== undefined) updates.phone = body.phone ? body.phone.trim() : null;
    if (body.cpf !== undefined) updates.cpf = body.cpf ? onlyDigits(body.cpf) || body.cpf.trim() : null;
    if (body.birth_date !== undefined) updates.birth_date = body.birth_date ? body.birth_date.trim() : null;
    if (body.city !== undefined) updates.city = body.city ? body.city.trim() : null;
    if (body.state !== undefined) updates.state = body.state ? body.state.trim() : null;
    if (body.address !== undefined) updates.address = body.address ? body.address.trim() : null;
    if (body.cep !== undefined) updates.cep = body.cep ? body.cep.trim() : null;
    if (body.utility_company !== undefined) updates.utility_company = body.utility_company ? body.utility_company.trim() : null;
    if (body.utility_account !== undefined) updates.utility_account = body.utility_account ? body.utility_account.trim() : null;
    if (body.system_size_kw !== undefined) updates.system_size_kw = sanitizeNumber(body.system_size_kw);
    if (body.contract_value !== undefined || body.system_cost !== undefined) {
      const cVal = sanitizeNumber(body.contract_value ?? body.system_cost);
      updates.contract_value = cVal;
      updates.system_cost = cVal;
    }
    if (body.install_date !== undefined) updates.install_date = body.install_date ? body.install_date.trim() : null;
    if (body.monthly_avg_kwh !== undefined) updates.monthly_avg_kwh = sanitizeNumber(body.monthly_avg_kwh);
    if (body.notes !== undefined) updates.notes = body.notes ? body.notes.trim() : null;
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    const { data: updated, error } = await supabase
      .from('client_portal_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[ClientsAPI] Erro ao atualizar cliente ${id}:`, error);
      return res.status(500).json({ success: false, error: error.message });
    }

    await syncClientToCrmAndFinancial(updated, body);
    return res.json({ success: true, client: updated });
  } catch (err) {
    console.error('[ClientsAPI] Erro interno:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/clients/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isHard = req.query.hard === 'true';

    if (isHard) {
      const { error } = await supabase.from('client_portal_users').delete().eq('id', id);
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({ success: true, id, action: 'hard_deleted' });
    }

    const { data: softDeleted, error } = await supabase
      .from('client_portal_users')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, id, client: softDeleted, action: 'soft_deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
