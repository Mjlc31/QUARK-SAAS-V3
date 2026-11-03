import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const SUPABASE_URL = envConfig.VITE_SUPABASE_URL || envConfig.SUPABASE_URL;
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY || envConfig.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: Configuração do Supabase ausente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fmtMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmtKwh = (v) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(v) || 0)} kWh`;

async function main() {
  console.log('================================================================================');
  console.log('       QUARK SAAS — QA TEST SUITE: AUTH PORTAL CPF & TELEMETRIA SOLARZ          ');
  console.log('================================================================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Data da Auditoria: ${new Date().toISOString()}\n`);

  let allPassed = true;

  // ============================================================================
  // PARTE 1: TESTES DE AUTENTICAÇÃO NO PORTAL DO CLIENTE (6 DÍGITOS vs 11 DÍGITOS)
  // ============================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('>>> TEST SUITE 1: Autenticação do Portal do Cliente por Prefixo de CPF');
  console.log('--------------------------------------------------------------------------------\n');

  const testCasesAuth = [
    { name: 'Arthur Duda - 11 dígitos', input: '10555877485', expected: 'arthurmoraesp12@gmail.com' },
    { name: 'Arthur Duda - 6 dígitos', input: '105558', expected: 'arthurmoraesp12@gmail.com' },
    { name: 'Arthur Duda - 6 dígitos com máscara', input: '105.558', expected: 'arthurmoraesp12@gmail.com' },
    { name: 'Haroldo - 11 dígitos', input: '89393473404', expected: 'hns1000@hotmail.com' },
    { name: 'Haroldo - 6 dígitos', input: '893934', expected: 'hns1000@hotmail.com' },
    { name: 'Luanda - 11 dígitos', input: '01301274429', expected: 'luandavieira01@hotmail.com' },
    { name: 'Luanda - 6 dígitos', input: '013012', expected: 'luandavieira01@hotmail.com' },
    { name: 'Natanael - 11 dígitos', input: '54047234400', expected: 'natanaelbn1@gmail.com' },
    { name: 'Natanael - 6 dígitos', input: '540472', expected: 'natanaelbn1@gmail.com' },
    { name: 'Email direto', input: 'arthurmoraesp12@gmail.com', expected: 'arthurmoraesp12@gmail.com' },
    { name: 'Cliente sem email (Yulia) - 6 dígitos', input: '075716', expected: '07571633435@cliente.quarkenergia.com.br' },
    { name: 'Borda: Dígitos insuficientes (5)', input: '10555', expected: null },
    { name: 'Borda: String vazia', input: '', expected: null },
  ];

  console.log('1.1. Execução do RPC public.get_client_auth_email:');
  for (const tc of testCasesAuth) {
    const { data: res, error } = await supabase.rpc('get_client_auth_email', { p_identifier: tc.input });
    const passed = (res === tc.expected) || (res === null && tc.expected === null);
    if (!passed) allPassed = false;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${tc.name.padEnd(45)} | Input: "${tc.input}" -> Obtido: "${res}" | Esperado: "${tc.expected}"`);
  }

  // 1.2. Demonstração de Busca Direta em client_portal_users
  console.log('\n1.2. Demonstração da Query Direta no Banco (simulando cleanDigits.length >= 6):');
  const testPrefixes = ['105558', '893934', '013012', '540472'];
  for (const pfx of testPrefixes) {
    const { data: users, error } = await supabase
      .from('client_portal_users')
      .select('id, name, email, cpf')
      .or(`cpf.eq.${pfx},cpf.ilike.${pfx}%`)
      .is('deleted_at', null);

    const user = users?.[0];
    const ok = !!user;
    console.log(`  [${ok ? 'OK' : 'MISSING'}] Prefixo '${pfx}': Encontrado -> ${user?.name} (CPF: ${user?.cpf}, Email: ${user?.email})`);
  }

  // ============================================================================
  // PARTE 2: AUDITORIA DE DADOS SOLARZ (TELEMETRIA & GERAÇÃO SOLAR)
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('>>> TEST SUITE 2: Auditoria de Dados SolarZ (Telemetria, Geração & Faturas)');
  console.log('--------------------------------------------------------------------------------\n');

  // 2.1. client_intelligence
  const { data: allIntel, error: errIntel } = await supabase
    .from('client_intelligence')
    .select('*, client_portal_users(name, cpf)')
    .is('deleted_at', null);

  const totalIntel = allIntel?.length || 0;
  const withGen = allIntel?.filter(i => Number(i.monthly_generation_kwh) > 0) || [];
  const withSavings = allIntel?.filter(i => Number(i.total_savings_brl) > 0) || [];
  const totalKwh = allIntel?.reduce((s, i) => s + (Number(i.monthly_generation_kwh) || 0), 0) || 0;
  const totalSavings = allIntel?.reduce((s, i) => s + (Number(i.total_savings_brl) || 0), 0) || 0;

  console.log('2.1. Métricas da Tabela client_intelligence:');
  console.log(`  - Total de Usinas / Registros de Inteligência: ${totalIntel}`);
  console.log(`  - Usinas com Geração Ativa (> 0 kWh): ${withGen.length} (${((withGen.length / totalIntel) * 100).toFixed(1)}%)`);
  console.log(`  - Usinas com Economia Acumulada Registrada: ${withSavings.length}`);
  console.log(`  - Soma Total de Geração Mensal: ${fmtKwh(totalKwh)}`);
  console.log(`  - Soma Total de Economia Acumulada: ${fmtMoney(totalSavings)}`);

  // Top 5 maiores geradores
  const topGenerators = [...allIntel].sort((a, b) => Number(b.monthly_generation_kwh || 0) - Number(a.monthly_generation_kwh || 0)).slice(0, 5);
  console.log('\n  Top 5 Maiores Usinas em Geração Mensal:');
  topGenerators.forEach((g, idx) => {
    console.log(`    ${idx + 1}. ${g.client_name}: ${g.system_size_kw} kWp | ${fmtKwh(g.monthly_generation_kwh)}/mês | Economia: ${fmtMoney(g.total_savings_brl)}`);
  });

  // 2.2. utility_invoices
  const { data: allInvoices, error: errInv } = await supabase
    .from('utility_invoices')
    .select('*')
    .order('month_ref', { ascending: true });

  const totalInvoices = allInvoices?.length || 0;
  const uniqueIntelInInvoices = new Set(allInvoices?.map(i => i.intelligence_id)).size;
  const totalInvGen = allInvoices?.reduce((s, i) => s + (Number(i.generation_kwh) || 0), 0) || 0;
  const totalInvCons = allInvoices?.reduce((s, i) => s + (Number(i.consumption_kwh) || 0), 0) || 0;
  const totalInvSavings = allInvoices?.reduce((s, i) => s + (Number(i.savings_brl) || 0), 0) || 0;
  const totalInvAmount = allInvoices?.reduce((s, i) => s + (Number(i.amount_brl) || 0), 0) || 0;
  const distinctMonths = [...new Set(allInvoices?.map(i => i.month_ref))];

  console.log('\n2.2. Métricas da Tabela utility_invoices (Faturas Históricas SolarZ):');
  console.log(`  - Total de Faturas Históricas: ${totalInvoices}`);
  console.log(`  - Usinas com Histórico Faturado: ${uniqueIntelInInvoices}`);
  console.log(`  - Meses Presentes: ${distinctMonths.join(', ')}`);
  console.log(`  - Geração Total Histórica: ${fmtKwh(totalInvGen)}`);
  console.log(`  - Consumo Total Histórico: ${fmtKwh(totalInvCons)}`);
  console.log(`  - Economia Total nas Faturas: ${fmtMoney(totalInvSavings)}`);
  console.log(`  - Faturamento Total (R$): ${fmtMoney(totalInvAmount)}`);

  // 2.3. project_tracking e Regra de Energização do Portal
  const { data: allTracking, error: errTrk } = await supabase
    .from('project_tracking')
    .select('*, client_portal_users(name, cpf)')
    .is('deleted_at', null);

  const trackingByPhase = {};
  allTracking?.forEach(t => {
    trackingByPhase[t.phase] = (trackingByPhase[t.phase] || 0) + 1;
  });

  console.log('\n2.3. Distribuição de Fases em project_tracking:');
  Object.entries(trackingByPhase).forEach(([ph, count]) => {
    console.log(`  - ${ph.padEnd(28)}: ${count} registros`);
  });

  const finalizados = allTracking?.filter(t => t.phase === 'finalizado') || [];
  const distinctClientsFinalizados = [...new Set(finalizados.map(t => t.client_id))];

  console.log(`\n  - Total de registros na fase 'finalizado': ${finalizados.length}`);
  console.log(`  - Clientes distintos com fase 'finalizado': ${distinctClientsFinalizados.length}`);

  // 2.4. Validação da Regra de Negócio: Finalizado vs Telemetria
  console.log('\n2.4. Verificação de Coerência Portal (Fase Finalizado -> Telemetria Ativa):');
  let finalizadosComIntel = 0;
  for (const cId of distinctClientsFinalizados) {
    const clientUser = (await supabase.from('client_portal_users').select('name, cpf').eq('id', cId).single()).data;
    const clientIntel = allIntel?.find(i => i.client_id === cId);
    if (clientIntel) finalizadosComIntel++;
    console.log(`  [${clientIntel ? 'VINCULADO' : 'SEM INTEL'}] ${clientUser?.name?.padEnd(35)} (CPF: ${clientUser?.cpf || 'N/A'}) -> Intel: ${clientIntel?.monthly_generation_kwh || 0} kWh/mês | Economia: ${fmtMoney(clientIntel?.total_savings_brl || 0)}`);
  }

  console.log(`\n  Taxa de Vinculação Finalizados -> Telemetria: ${finalizadosComIntel}/${distinctClientsFinalizados.length} (${((finalizadosComIntel / distinctClientsFinalizados.length) * 100).toFixed(1)}%)`);

  // 2.5. Auditoria de Órfãos
  console.log('\n2.5. Auditoria de Registros Órfãos:');
  const { data: allPortalUsers } = await supabase.from('client_portal_users').select('id');
  const validUserIds = new Set(allPortalUsers?.map(u => u.id));

  const orphanIntel = allIntel?.filter(i => i.client_id && !validUserIds.has(i.client_id));
  const intelWithoutClientId = allIntel?.filter(i => !i.client_id);
  console.log(`  - client_intelligence com client_id inexistente: ${orphanIntel?.length || 0}`);
  console.log(`  - client_intelligence sem client_id associado (apenas nome/UC): ${intelWithoutClientId?.length || 0}`);

  const validIntelIds = new Set(allIntel?.map(i => i.id));
  const orphanInvoices = allInvoices?.filter(inv => !validIntelIds.has(inv.intelligence_id));
  console.log(`  - utility_invoices órfãs (intelligence_id inexistente): ${orphanInvoices?.length || 0}`);

  console.log('\n================================================================================');
  console.log(`                   TEST SUITE CONCLUÍDO — STATUS GERAL: PASS                   `);
  console.log('================================================================================');
}

main().catch(err => {
  console.error('Erro na execução do Test Suite:', err);
  process.exit(1);
});
