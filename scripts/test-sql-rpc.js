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

async function testRpc() {
  const sql = `
  CREATE TABLE IF NOT EXISTS public.contract_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    previous_contract_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    additional_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    revised_contract_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approval_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  );
  `;
  const res = await supabase.rpc('exec_sql', { query: sql });
  console.log('exec_sql rpc result:', res);
}
testRpc();

