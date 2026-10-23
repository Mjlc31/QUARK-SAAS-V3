import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../services/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../data/proposals_store.json');

const router = express.Router();

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[ProposalsAPI] Erro ao ler proposals store:', e);
  }
  return [];
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[ProposalsAPI] Erro ao gravar proposals store:', e);
  }
}

// GET /api/proposals
router.get('/', async (req, res) => {
  try {
    const fileProposals = readStore().filter(p => !p.deleted_at);

    // Tenta buscar do Supabase se houver registros
    let dbProposals = [];
    try {
      const { data } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        dbProposals = data.filter(d => !d.deleted_at);
      }
    } catch (_) {}

    const map = new Map();
    // Prioriza dados do arquivo local/servidor
    for (const fp of fileProposals) map.set(fp.id, fp);
    // Mescla com os do DB caso existam novos
    for (const dp of dbProposals) {
      if (!map.has(dp.id)) {
        map.set(dp.id, dp);
      }
    }

    const list = Array.from(map.values())
      .filter(p => !p.deleted_at)
      .sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0));

    return res.json({ success: true, count: list.length, proposals: list });
  } catch (err) {
    console.error('[ProposalsAPI] Erro interno ao listar propostas:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/proposals/:idOrToken
router.get('/:idOrToken', async (req, res) => {
  try {
    const { idOrToken } = req.params;
    const list = readStore();
    const found = list.find(p => !p.deleted_at && (p.id === idOrToken || p.public_token === idOrToken));

    if (found) {
      return res.json({
        success: true,
        proposal: {
          id: found.id,
          number: found.number,
          title: found.title,
          status: found.status,
          inputs: found.inputs,
          final_price: found.final_price,
          power_kwp: found.power_kwp,
          valid_until: found.valid_until,
          created_at: found.created_at,
          accepted_at: found.accepted_at || null,
          accepted_by: found.accepted_by || null,
        },
        lead: found.lead || { name: found.client_name || "Cliente Quark", city: "Maceió - AL", state: "AL", address: null },
        seller: { name: "Arthur Duda", email: "arthurmoraesp12@gmail.com", phone: "(82) 99424-1835" },
        settings: {},
      });
    }

    // Tenta no Supabase
    try {
      const { data } = await supabase.from('proposals').select('*').or(`id.eq.${idOrToken},public_token.eq.${idOrToken}`).single();
      if (data) {
        return res.json({
          success: true,
          proposal: data,
          lead: data.lead || { name: data.client_name || "Cliente Quark", city: data.city || "Maceió - AL", state: "AL", address: null },
          seller: { name: "Arthur Duda", email: "arthurmoraesp12@gmail.com", phone: "(82) 99424-1835" },
          settings: {},
        });
      }
    } catch (_) {}

    return res.status(404).json({ success: false, error: 'Proposta não encontrada.' });
  } catch (err) {
    console.error('[ProposalsAPI] Erro ao buscar proposta:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/proposals
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const list = readStore();

    const id = body.id || `prop_${Date.now()}`;
    const nextNumber = body.number || (list.reduce((max, p) => Math.max(max, Number(p.number) || 0), 41) + 1);
    const publicToken = body.public_token || `tok_${Math.random().toString(36).slice(2, 10)}`;

    const proposal = {
      id,
      number: nextNumber,
      public_token: publicToken,
      lead_id: body.lead_id || null,
      opportunity_id: body.opportunity_id || body.lead_id || null,
      title: body.title || `Orçamento #${nextNumber}`,
      status: body.status || 'rascunho',
      client_name: body.client_name || body.lead?.name || 'Cliente',
      inputs: body.inputs || {},
      power_kwp: Number(body.power_kwp) || 0,
      monthly_generation: Number(body.monthly_generation) || 0,
      direct_cost: Number(body.direct_cost) || 0,
      commission_value: Number(body.commission_value) || 0,
      tax_value: Number(body.tax_value) || 0,
      profit_value: Number(body.profit_value) || 0,
      final_price: Number(body.final_price) || 0,
      valid_until: body.valid_until || null,
      sent_at: body.sent_at || null,
      viewed_at: body.viewed_at || null,
      accepted_at: body.accepted_at || null,
      accepted_by: body.accepted_by || null,
      created_by: body.created_by || 'usr_admin',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lead: body.lead || {
        id: body.lead_id,
        name: body.client_name || 'Cliente',
        city: body.city || 'Maceió - AL',
        phone: body.phone || null,
      },
    };

    const existingIdx = list.findIndex(p => p.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...proposal, updated_at: new Date().toISOString() };
    } else {
      list.unshift(proposal);
    }

    writeStore(list);

    // Tenta persistir no Supabase em background sem bloquear
    Promise.resolve().then(async () => {
      try {
        const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        if (isUuid(proposal.id)) {
          const adminUserId = '7dacc88f-9ebd-4710-a1be-0647841db24a';
          const oppId = proposal.opportunity_id && isUuid(proposal.opportunity_id) ? proposal.opportunity_id : (proposal.lead_id && isUuid(proposal.lead_id) ? proposal.lead_id : null);
          await supabase.from('proposals').upsert({
            id: proposal.id,
            opportunity_id: oppId,
            lead_id: proposal.lead_id || null,
            user_id: isUuid(proposal.user_id) ? proposal.user_id : adminUserId,
            created_by: isUuid(proposal.created_by) ? proposal.created_by : adminUserId,
            title: proposal.title,
            client_name: proposal.client_name,
            city: proposal.lead?.city || null,
            phone: proposal.lead?.phone || null,
            inputs: proposal.inputs,
            power_kwp: proposal.power_kwp,
            system_size_kw: proposal.power_kwp,
            monthly_generation: proposal.monthly_generation,
            direct_cost: proposal.direct_cost,
            commission_value: proposal.commission_value,
            tax_value: proposal.tax_value,
            profit_value: proposal.profit_value,
            final_price: proposal.final_price,
            status: proposal.status || 'rascunho',
            data: {
              inputs: proposal.inputs,
              title: proposal.title,
              number: proposal.number,
              public_token: proposal.public_token,
              lead: proposal.lead,
            },
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[ProposalsAPI] Aviso ao salvar no Supabase:', err.message);
      }
    });

    return res.json({ success: true, proposal });
  } catch (err) {
    console.error('[ProposalsAPI] Erro ao salvar proposta:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/proposals/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = readStore();
    const target = list.find(p => p.id === id);
    if (!target) return res.status(404).json({ success: false, error: 'Proposta não encontrada.' });

    target.deleted_at = new Date().toISOString();
    writeStore(list);

    // Atualiza no Supabase
    Promise.resolve().then(async () => {
      try {
        await supabase.from('proposals').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      } catch (_) {}
    });

    return res.json({ success: true, message: 'Proposta excluída com sucesso.' });
  } catch (err) {
    console.error('[ProposalsAPI] Erro ao excluir proposta:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
