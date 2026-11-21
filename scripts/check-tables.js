const fs = require('fs');
const path = require('path');
const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols, error: err1 } = await supabase.from('client_services').select('*').limit(1);
  console.log('client_services sample keys:', cols && cols[0] ? Object.keys(cols[0]) : 'None', err1 ? err1.message : '');

  const { data: customWf, error: err2 } = await supabase.from('workflow_templates').select('*');
  console.log('workflow_templates query result:', customWf ? `${customWf.length} rows` : 'Table might not exist', err2 ? err2.message : '');
}
check();
