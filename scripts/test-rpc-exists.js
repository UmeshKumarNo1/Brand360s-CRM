const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function testRpc() {
  const res = await supabase.rpc('record_client_payment', {
    p_client_id: '00000000-0000-0000-0000-000000000000',
    p_amount: 100,
    p_payment_date: '2026-11-20',
    p_payment_method: 'Cash'
  });
  console.log("record_client_payment result:", res);
}

testRpc();
