import { supabase } from '../services/supabase.js';

async function run() {
  const { data: clients } = await supabase
    .from('client_portal_users')
    .select('id, name, cpf, email, phone, city, system_size_kw, created_at, opportunity_id, lead_id')
    .order('name');

  console.log('Total clients in DB:', clients?.length);
  clients?.forEach((c, idx) => {
    console.log(`${idx + 1}. [${c.id}] "${c.name}" | CPF: ${c.cpf || 'N/A'} | Email: ${c.email || 'N/A'} | Created: ${c.created_at?.slice(0, 19)}`);
  });
}

run();
