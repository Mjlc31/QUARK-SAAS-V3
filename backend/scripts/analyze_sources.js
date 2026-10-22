import { supabase } from '../services/supabase.js';
import fs from 'fs';

function normalize(s) {
  if (!s) return '';
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function analyze() {
  const csvContent = fs.readFileSync('clientes_quark_trello.csv', 'utf8');
  const csvLines = csvContent.split('\n').filter(l => l.trim().length > 0).slice(1);
  const trelloClients = csvLines.map(l => {
    const p = l.split(';');
    return {
      name: p[0]?.trim(),
      stage: p[1]?.trim(),
      cpf: p[3]?.trim()?.replace(/\D/g, '') || null,
      phone: p[7]?.trim(),
      email: p[8]?.trim()?.toLowerCase(),
      cleanName: normalize(p[0]),
    };
  });

  const { data: dbClients } = await supabase.from('client_portal_users').select('*');
  const { data: opps } = await supabase.from('opportunities').select('*');

  console.log(`DB Clients: ${dbClients.length}`);
  console.log(`Trello Clients: ${trelloClients.length}`);
  console.log(`Opportunities: ${opps?.length || 0}`);

  // Check which DB clients match Trello
  const trelloMatches = [];
  const crmMatches = [];
  const others = [];

  for (const c of dbClients) {
    const cCleanName = normalize(c.name);
    const cCpf = c.cpf ? c.cpf.replace(/\D/g, '') : null;
    const cEmail = c.email?.toLowerCase();

    // Check Trello match
    const matchedTrello = trelloClients.find(t => {
      if (cCpf && t.cpf && cCpf === t.cpf) return true;
      if (cEmail && t.email && cEmail === t.email && !cEmail.includes('@cliente.quarkenergia.com.br')) return true;
      if (cCleanName && t.cleanName && (cCleanName === t.cleanName || t.cleanName.includes(cCleanName) || cCleanName.includes(t.cleanName))) return true;
      return false;
    });

    if (matchedTrello) {
      trelloMatches.push({ client: c, trello: matchedTrello });
      continue;
    }

    // Check if it's an opportunity
    const matchedOpp = (opps || []).find(o => {
      const oClean = normalize(o.title);
      return oClean && (oClean === cCleanName || oClean.includes(cCleanName) || cCleanName.includes(oClean));
    });

    if (matchedOpp || ['jeferson', 'almirilario', 'raulretrofit', 'coronelcleydsonvillar', 'jhoatan', 'cesar', 'yuliaamaral'].includes(cCleanName)) {
      crmMatches.push({ client: c, opp: matchedOpp });
    } else {
      others.push(c);
    }
  }

  console.log(`\nMatched Trello: ${trelloMatches.length}`);
  console.log(`CRM Opportunities erroneously in client_portal_users: ${crmMatches.length}`);
  crmMatches.forEach(m => console.log(`  - [${m.client.id}] "${m.client.name}" (created: ${m.client.created_at})`));

  console.log(`\nOther records: ${others.length}`);
  others.forEach(o => console.log(`  - [${o.id}] "${o.name}" | CPF: ${o.cpf} | Email: ${o.email}`));
}

analyze();
