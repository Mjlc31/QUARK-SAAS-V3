import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCRMImport() {
  const newOpp = {
    title: 'Açougue do Zé (TEST)',
    phone: '82999999999',
    city: 'Maceió',
    amount: 0,
    status: 'Lead',
  };

  console.log("Inserting new opportunity...");
  const { data, error } = await supabase.from('opportunities').insert([newOpp]).select();
  
  if (error) {
    console.error("Error inserting opportunity:", error);
    process.exit(1);
  }
  
  console.log("Inserted successfully:", data[0].id);

  console.log("Inserting agent notes...");
  const { error: notesError } = await supabase.from('agent_notes').insert([{
    entity_type: 'opportunity',
    entity_id: data[0].id,
    note: `Lead prospectado via Google Maps.\nSegmento: Açougues\nAvaliação: 5.0 (10)\nWebsite: -`,
    created_by_ai: false
  }]);

  if (notesError) {
    console.error("Error inserting notes:", notesError);
  } else {
    console.log("Notes inserted successfully!");
  }
  
  console.log("Testing fetch from opportunities...");
  const { data: fetchResult } = await supabase.from('opportunities').select('*').eq('id', data[0].id);
  console.log("Fetched opportunity:", fetchResult);
}

testCRMImport();
