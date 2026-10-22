import { supabase } from '../services/supabase.js';
import fs from 'fs';

async function audit() {
  const csvContent = fs.readFileSync('clientes_quark_trello.csv', 'utf8');
  const csvLines = csvContent.split('\n').filter(l => l.trim().length > 0).slice(1);
  const trelloClients = csvLines.map(l => {
    const p = l.split(';');
    return {
      name: p[0]?.trim(),
      stage: p[1]?.trim(),
      cpf: p[3]?.trim(),
      phone: p[7]?.trim(),
      email: p[8]?.trim(),
      address: p[9]?.trim(),
      cep: p[13]?.trim(),
      power: p[18]?.trim(),
      kwh: p[19]?.trim(),
      modules: p[20]?.trim(),
      inverter: p[22]?.trim(),
      account: p[17]?.trim(),
    };
  });

  const { data: dbClients } = await supabase.from('client_portal_users').select('*');

  console.log('=== AUDIT SUMMARY ===');
  console.log('Trello CSV lines:', trelloClients.length);
  console.log('DB client_portal_users:', dbClients?.length);

  // Group by normalized name or CPF
  const groups = new Map();
  for (const c of dbClients || []) {
    const cleanCpf = c.cpf ? c.cpf.replace(/\D/g, '') : null;
    const normName = c.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = cleanCpf || normName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const multi = [];
  for (const [k, list] of groups.entries()) {
    if (list.length > 1) {
      multi.push(list);
    }
  }

  console.log('\nExact groups with multiple records:', multi.length);
  multi.forEach((list, i) => {
    console.log(`\nDuplicate Group ${i + 1}:`);
    list.forEach(c => console.log(`  - [${c.id}] "${c.name}" | CPF: ${c.cpf} | Email: ${c.email}`));
  });
}

audit();
