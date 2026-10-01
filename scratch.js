import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sumydaewtszecrvdgoku.supabase.co'
const supabaseKey = 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('hello_world') // just trying something
  console.log('Error:', error)
}
check()
