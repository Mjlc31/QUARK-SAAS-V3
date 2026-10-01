require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE public.whatsapp_messages ADD COLUMN chat_id TEXT;' });
    console.log(error || "OK", data);
}
run();
