import { supabase } from '../services/supabase.js';

async function checkRelations() {
  const { data: clients } = await supabase.from('client_portal_users').select('id, name, cpf, email, created_at');
  
  // Records to remove from client_portal_users:
  // 1. CRM opportunities:
  const crmNames = [
    'jeferson', 'almir ilário', 'raul - retrofit', 'coronel cleydson villar', 
    'jhoatan', 'cesar', 'yulia amaral', 'haroldo', 'lucas'
  ];
  // 2. SolarZ duplicate slugs:
  const slugNames = [
    'claudetecariri', 'onoriopeiter', 'rosenildocandido', 'sirmanifrazao',
    'genivaldopedro', 'ronaldobarbosa', 'glauciamd', 'diogopereira',
    'celiamartins', 'vip fitness', 'elitech fit club', 'anderson alves'
  ];

  const targetIds = [];
  for (const c of clients) {
    const low = c.name?.trim().toLowerCase();
    if (crmNames.includes(low) && !c.cpf) {
      targetIds.push({ id: c.id, name: c.name, type: 'crm_opportunity' });
    } else if (slugNames.includes(low) && !c.cpf) {
      targetIds.push({ id: c.id, name: c.name, type: 'solarz_slug_dup' });
    }
  }

  console.log(`Found ${targetIds.length} candidate records to clean:`);
  for (const t of targetIds) {
    const [intel, track, maint, tick] = await Promise.all([
      supabase.from('client_intelligence').select('id').eq('client_id', t.id),
      supabase.from('project_tracking').select('id').eq('client_id', t.id),
      supabase.from('maintenance_services').select('id').eq('client_id', t.id),
      supabase.from('support_tickets').select('id').eq('client_id', t.id),
    ]);

    console.log(`- [${t.id}] "${t.name}" (${t.type}): Intel=${intel.data?.length || 0}, Track=${track.data?.length || 0}, Maint=${maint.data?.length || 0}, Tickets=${tick.data?.length || 0}`);
  }
}

checkRelations();
