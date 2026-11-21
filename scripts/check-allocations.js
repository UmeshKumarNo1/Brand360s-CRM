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

async function check() {
  const { data, error } = await supabase.from('invoice_payment_allocations').select('*');
  console.log('Error:', error);
  console.log('Allocations count:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('Sample allocation row:', data[0]);
    console.log('All allocations:');
    data.forEach(a => console.log(a));
  }
}
check();

