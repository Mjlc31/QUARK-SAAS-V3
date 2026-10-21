import axios from 'axios';
import { supabase } from './supabase.js';

/**
 * Serviço de Integração SolarZ -> Quark SaaS
 * Documentação Oficial da Open API SolarZ:
 * https://app.swaggerhub.com/apis-docs/suportesolarz/SZ-OPEN-API/1.0.0
 * 
 * Autenticação: HTTP Basic Auth (Usuário e Senha de API gerados em SolarZ -> Configurações -> Usuário de API)
 */

const SOLARZ_BASE_URL = process.env.SOLARZ_API_URL || 'https://app.solarz.com.br';
const SOLARZ_USER = process.env.SOLARZ_API_USER || process.env.SOLARZ_USER || '';
const SOLARZ_PASS = process.env.SOLARZ_API_PASS || process.env.SOLARZ_PASSWORD || '';

/**
 * Cria cliente HTTP com Basic Auth para a API do SolarZ
 */
function getSolarZClient() {
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
 * Busca todas as usinas solares cadastradas na conta SolarZ
 */
export async function getSolarZUsinas() {
  const client = getSolarZClient();
  try {
    const res = await client.get('/v1/usinas');
    return res.data?.data || res.data || [];
  } catch (error) {
    console.warn('[SOLARZ] Erro ao buscar usinas no SolarZ:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Busca dados de telemetria e geração de uma usina específica
 */
export async function getSolarZTelemetria(usinaId) {
  const client = getSolarZClient();
  try {
    const res = await client.get(`/v1/usinas/${usinaId}/geracao`);
    return res.data?.data || res.data || null;
  } catch (error) {
    console.warn(`[SOLARZ] Erro ao buscar telemetria da usina ${usinaId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Sincroniza a geração do SolarZ para a tabela client_intelligence do Quark
 */
export async function syncClientWithSolarZ(clientId, ucCode) {
  if (!clientId) return { success: false, error: 'clientId obrigatório' };

  try {
    const usinas = await getSolarZUsinas();
    if (!usinas || usinas.length === 0) {
      return { success: false, message: 'Nenhuma usina retornada pela API SolarZ ou credenciais pendentes.' };
    }

    // Busca a usina pelo código da UC (Conta Contrato) ou ID
    const cleanUc = (ucCode || '').replace(/\D/g, '');
    const matched = usinas.find(u => {
      const uUc = String(u.codigo_uc || u.conta_contrato || u.uc || '').replace(/\D/g, '');
      return cleanUc && uUc && uUc === cleanUc;
    });

    if (!matched) {
      return { success: false, message: `Usina com UC ${ucCode} não encontrada no SolarZ.` };
    }

    const telemetria = await getSolarZTelemetria(matched.id || matched.usina_id);
    const monthlyGen = Number(telemetria?.geracao_mensal_kwh || matched.geracao_mensal_kwh || 0);
    const systemKw = Number(matched.potencia_kwp || matched.potencia_instalada || 0);
    const totalSavings = monthlyGen * 0.92; // R$ 0,92 por kWh médio

    // Atualiza client_intelligence no Supabase
    const { data: updatedIntel, error: intelErr } = await supabase
      .from('client_intelligence')
      .upsert({
        client_id: clientId,
        system_size_kw: systemKw > 0 ? systemKw : undefined,
        monthly_generation_kwh: monthlyGen,
        total_savings_brl: totalSavings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' })
      .select()
      .single();

    if (intelErr) throw intelErr;

    return {
      success: true,
      usina: matched.nome || matched.title,
      monthly_kwh: monthlyGen,
      system_size_kw: systemKw,
      updated: updatedIntel,
    };
  } catch (err) {
    console.error('[SOLARZ] Falha na sincronização:', err);
    return { success: false, error: err.message };
  }
}
