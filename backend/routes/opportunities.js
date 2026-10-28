import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { supabase } from '../services/supabase.js';

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../data/opportunities_store.json');
const DELETED_PATH = path.resolve(__dirname, '../data/deleted_opportunities.json');

const router = express.Router();

function readDeleted() {
  try {
    if (fs.existsSync(DELETED_PATH)) {
      const data = fs.readFileSync(DELETED_PATH, 'utf8');
      const list = JSON.parse(data);
      if (Array.isArray(list)) return new Set(list.map(String));
    }
  } catch (e) {
    console.error('[OpportunitiesAPI] Erro ao ler deleted store:', e);
  }
  return new Set();
}

function saveDeleted(set) {
  try {
    fs.writeFileSync(DELETED_PATH, JSON.stringify(Array.from(set), null, 2), 'utf8');
  } catch (e) {
    console.error('[OpportunitiesAPI] Erro ao gravar deleted store:', e);
  }
}

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[OpportunitiesAPI] Erro ao ler store:', e);
  }
  return [];
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[OpportunitiesAPI] Erro ao gravar store:', e);
  }
}

// GET /api/opportunities
router.get('/', async (req, res) => {
  try {
    const deletedSet = readDeleted();

    // 1. Tenta buscar diretamente do Supabase (fonte única da verdade)
    let dbOpps = [];
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        dbOpps = data.filter(d => !deletedSet.has(String(d.id)) && !d.deleted_at);
        // Mantém store local espelhado em sincronia com o banco
        writeStore(dbOpps);
        return res.json({ success: true, count: dbOpps.length, opportunities: dbOpps });
      }
    } catch (sbErr) {
      console.warn('[OpportunitiesAPI] Supabase inacessível, recorrendo ao store local:', sbErr.message);
    }

    // 2. Fallback somente se Supabase estiver offline
    const fileOpps = readStore().filter(f => !deletedSet.has(String(f.id)) && !f.deleted_at);
    return res.json({ success: true, count: fileOpps.length, opportunities: fileOpps });
  } catch (err) {
    console.error('[OpportunitiesAPI] Erro interno:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/opportunities
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const title = (body.title || body.name || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, error: 'O título ou nome é obrigatório.' });
    }

    const targetId = isUUID(body.id) ? body.id : crypto.randomUUID();

    const newOpp = {
      id: targetId,
      title,
      status: body.status || 'Lead',
      amount: Number(body.amount) || 0,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      city: body.city?.trim() || 'Maceió',
      services: Array.isArray(body.services) ? body.services : ['solar'],
      source: body.source || 'Manual',
      temperature: body.temperature || 'morno',
      avg_bill: Number(body.avg_bill) || null,
      consumption_kwh: Number(body.consumption_kwh) || null,
      notes: body.notes?.trim() || null,
      user_id: isUUID(body.user_id) ? body.user_id : '7dacc88f-9ebd-4710-a1be-0647841db24a',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove do conjunto de deletados se estivesse lá
    const deletedSet = readDeleted();
    if (deletedSet.has(String(newOpp.id))) {
      deletedSet.delete(String(newOpp.id));
      saveDeleted(deletedSet);
    }

    // Salva no store local (atualiza se o ID coincidir ou se o nome for idêntico)
    const list = readStore();
    const existingIndex = list.findIndex(o => o.id === newOpp.id || (o.title?.toLowerCase().trim() === title.toLowerCase().trim() && o.phone === newOpp.phone));
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newOpp, updated_at: new Date().toISOString() };
    } else {
      list.unshift(newOpp);
    }
    writeStore(list);

    // Tenta salvar no Supabase em background
    const sbPayload = {
      id: newOpp.id,
      title: newOpp.title,
      status: newOpp.status,
      amount: newOpp.amount,
      phone: newOpp.phone,
      email: newOpp.email,
      city: newOpp.city,
      services: newOpp.services,
      source: newOpp.source,
      temperature: newOpp.temperature,
      avg_bill: newOpp.avg_bill,
      consumption_kwh: newOpp.consumption_kwh,
      notes: newOpp.notes,
      user_id: newOpp.user_id,
    };

    // Salva no Supabase garantindo consistência no banco
    try {
      const { error } = await supabase.from('opportunities').upsert(sbPayload);
      if (error) {
        console.error('[OpportunitiesAPI] Erro ao sincronizar oportunidade com Supabase:', error);
      } else {
        console.log(`[OpportunitiesAPI] Oportunidade salva com sucesso no Supabase: ${newOpp.title} (${newOpp.id})`);
      }
    } catch (sbErr) {
      console.error('[OpportunitiesAPI] Exceção ao gravar no Supabase:', sbErr);
    }

    console.log(`[OpportunitiesAPI] Nova oportunidade criada: ${newOpp.title} (${newOpp.status})`);
    return res.status(201).json({ success: true, opportunity: newOpp });
  } catch (err) {
    console.error('[OpportunitiesAPI] Erro ao criar:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/opportunities/bulk-delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de IDs inválida.' });
    }

    const deletedSet = readDeleted();
    ids.forEach(id => deletedSet.add(String(id)));
    saveDeleted(deletedSet);

    let list = readStore();
    const idSet = new Set(ids.map(String));
    list = list.filter(o => !idSet.has(String(o.id)));
    writeStore(list);

    // Tenta remover no Supabase se possível
    Promise.resolve(supabase.from('opportunities').delete().in('id', ids)).catch(() => {});
    return res.json({ success: true, count: ids.length });
  } catch (err) {
    console.error('[OpportunitiesAPI] Erro ao deletar em lote:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/opportunities/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const list = readStore();

    const idx = list.findIndex(o => o.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Oportunidade não encontrada' });
    }

    const updated = {
      ...list[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    writeStore(list);

    // Tenta atualizar todos os campos no Supabase de forma resiliente
    const updatePayload = {
      title: updated.title,
      client_name: updated.client_name || updated.title,
      phone: updated.phone,
      email: updated.email,
      city: updated.city,
      status: updated.status,
      amount: updated.amount,
      temperature: updated.temperature,
      notes: updated.notes,
      services: updated.services,
      system_power: updated.system_power,
      avg_bill: updated.avg_bill,
      consumption_kwh: updated.consumption_kwh,
      updated_at: new Date().toISOString()
    };

    try {
      await supabase.from('opportunities').update(updatePayload).eq('id', id);
    } catch (err) {
      console.warn('[OpportunitiesAPI] Erro ao sincronizar update no Supabase:', err.message);
    }

    return res.json({ success: true, opportunity: updated });
  } catch (err) {
    console.error('[OpportunitiesAPI] Erro ao atualizar:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/opportunities/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Registra no tombstone store
    const deletedSet = readDeleted();
    deletedSet.add(String(id));
    saveDeleted(deletedSet);

    // 2. Remove da store local
    let list = readStore();
    list = list.filter(o => o.id !== id);
    writeStore(list);

    // 3. Atualiza soft delete no Supabase
    try {
      await supabase.from('opportunities').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } catch (_) {}

    return res.json({ success: true, id });
  } catch (err) {
    console.error('[OpportunitiesAPI] Erro ao deletar:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
