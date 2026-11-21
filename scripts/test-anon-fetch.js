const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function testFetch() {
  const { data, error } = await supabase.from('clients').select('id, company_name');
  console.log('Publishable key fetch error:', error);
  console.log('Publishable key fetch data count:', data ? data.length : 0);
  if (data) {
    console.log('Clients:', data);
  }
}
testFetch();
