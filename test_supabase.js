import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://sumydaewtszecrvdgoku.supabase.co';
const key = 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('proposals').select('*').limit(1);
  console.log("Error:", error);
  if(data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  }
}
test();
