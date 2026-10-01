require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('evolution_messages').select('message_id, remote_jid, message_text').limit(1);
    console.log(error || "OK", data);
}
run();
