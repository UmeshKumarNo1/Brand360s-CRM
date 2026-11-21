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

async function inspectPayments() {
  const { data: pmts } = await supabase.from('payments').select('*');
  console.log('Payments count:', pmts.length);
  pmts.forEach(p => console.log(`  Pmt: ${p.id.slice(0, 8)} | Client: ${p.client_id.slice(0, 8)} | Amount: ${p.amount} | Status: ${p.status} | Method: ${p.payment_method}`));

  const { data: allocs } = await supabase.from('invoice_payment_allocations').select('*');
  console.log('Allocations count:', allocs.length);
  allocs.forEach(a => console.log(`  Alloc: ${a.id.slice(0, 8)} | Inv: ${a.invoice_id.slice(0, 8)} | Pmt: ${a.payment_id.slice(0, 8)} | Amount: ${a.allocated_amount}`));
}
inspectPayments();

