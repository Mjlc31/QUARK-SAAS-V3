import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Serviço de Integração SolarZ -> Quark SaaS
 * Open API: oa_424239634f7e
 * Dashboard API & Telemetria em tempo real
 */

const SOLARZ_BASE_URL = process.env.SOLARZ_API_URL || 'https://app.solarz.com.br';
const SOLARZ_USER = process.env.SOLARZ_API_USER || process.env.SOLARZ_USER || 'oa_424239634f7e';
const SOLARZ_PASS = process.env.SOLARZ_API_PASS || process.env.SOLARZ_PASSWORD || '82aea63d0e8edecb41cedc6099648710f6b3719c48f3da274cd4f23969983cca';

/**
 * Cria cliente HTTP com Basic Auth para a Open API do SolarZ
 */
export function getSolarZOpenApiClient() {
  const authHeader = (SOLARZ_USER && SOLARZ_PASS)
    ? `Basic ${Buffer.from(`${SOLARZ_USER}:${SOLARZ_PASS}`).toString('base64')}`
    : null;

  return axios.create({
    baseURL: SOLARZ_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });
}

/**
 * Carrega a lista de usinas do SolarZ (persistidas localmente com fallback para API)
 */
export function getAllSolarZPlants() {
  try {
    const plantsFile = path.resolve(__dirname, '../data/solarz_plants.json');
    if (fs.existsSync(plantsFile)) {
      return JSON.parse(fs.readFileSync(plantsFile, 'utf8'));
    }
  } catch (err) {
    console.warn('[SOLARZ] Erro ao carregar solarz_plants.json:', err.message);
  }
  return [];
}

/**
 * Carrega a lista de unidades consumidoras (UCs) do SolarZ
 */
export function getAllSolarZUnidades() {
  try {
    const unidadesFile = path.resolve(__dirname, '../data/solarz_unidades.json');
    if (fs.existsSync(unidadesFile)) {
      return JSON.parse(fs.readFileSync(unidadesFile, 'utf8'));
    }
  } catch (err) {
    console.warn('[SOLARZ] Erro ao carregar solarz_unidades.json:', err.message);
  }
  return [];
}

/**
 * Sincroniza todas as 58 usinas e 74 UCs do SolarZ com o Supabase
 */
export async function syncAllSolarZ() {
  const { runSolarZSync } = await import('../scripts/syncSolarZ.js');
  return await runSolarZSync();
}

/**
 * Sincroniza a geração do SolarZ para um cliente específico
 */
export async function syncClientWithSolarZ(clientId, ucCode) {
  if (!clientId) return { success: false, error: 'clientId obrigatório' };

  try {
    const plants = getAllSolarZPlants();
    const unidades = getAllSolarZUnidades();

    const cleanUc = (ucCode || '').replace(/\D/g, '');

    // Busca cliente no Supabase
    const { data: clientUser } = await supabase
      .from('client_portal_users')
      .select('*')
      .or(`id.eq.${clientId},auth_user_id.eq.${clientId}`)
      .maybeSingle();

    const clientName = clientUser?.name?.toLowerCase().trim() || '';

    // Encontra a usina correspondente
    const matched = plants.find(p => {
      const pName = (p.name || '').toLowerCase().trim();
      const pId = p.id;
      const ucMatch = cleanUc && unidades.some(u => 
        (u.contrato && u.contrato.replace(/\D/g, '') === cleanUc) &&
        (u.id === p.consumerUnitId || u.usinas?.some(us => us.id === pId))
      );
      if (ucMatch) return true;
      if (clientName && (pName.includes(clientName) || clientName.includes(pName))) return true;
      return false;
    });

    if (!matched) {
      return { success: false, message: `Usina não encontrada no SolarZ para o cliente informado.` };
    }

    const installedKw = Number(matched.installedPower || 0);
    const annualKwh = Number(matched.expectedAnnualGeneration || 0);
    const monthlyGen = Math.round(annualKwh > 0 ? annualKwh / 12 : installedKw * 5.4 * 30 * 0.78);
    const totalSavings = monthlyGen * 0.92;

    // Atualiza client_intelligence
    const { data: updatedIntel, error: intelErr } = await supabase
      .from('client_intelligence')
      .upsert({
        client_id: clientUser?.id || clientId,
        client_name: matched.name,
        system_size_kw: installedKw > 0 ? installedKw : undefined,
        monthly_generation_kwh: monthlyGen,
        total_savings_brl: totalSavings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' })
      .select()
      .single();

    if (intelErr) throw intelErr;

    return {
      success: true,
      usina: matched.name,
      monthly_kwh: monthlyGen,
      system_size_kw: installedKw,
      updated: updatedIntel,
    };
  } catch (err) {
    console.error('[SOLARZ] Falha na sincronização:', err);
    return { success: false, error: err.message };
  }
}
