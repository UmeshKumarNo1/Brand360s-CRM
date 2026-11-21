const fs = require('fs');
const path = require('path');
const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function listAll() {
  const { data } = await supabase.from('clients').select('id, company_name, client_code, created_at').order('created_at', { ascending: false });
  console.log('Total clients in DB:', data ? data.length : 0);
  (data || []).forEach(c => console.log(c.id, c.company_name, c.client_code, c.created_at));
}
listAll();

