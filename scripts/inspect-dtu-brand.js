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

async function inspectDTUandBrand() {
  const { data: dtuSvcs } = await supabase.from('client_services').select('*').eq('client_id', 'c3e6169e-cf8e-4cbd-83a7-c5d6646d6afa');
  const { data: dtuInvs } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('client_id', 'c3e6169e-cf8e-4cbd-83a7-c5d6646d6afa');
  console.log('DTU Services:');
  dtuSvcs.forEach(s => console.log('  Svc:', s.id, s.service_name, 'fee:', s.service_fee, 'govt:', s.govt_fee, 'total:', s.total_amount));
  console.log('DTU Invoices:');
  dtuInvs.forEach(i => console.log('  Inv:', i.invoice_number, 'total:', i.total_amount, 'paid:', i.amount_paid, 'due:', i.balance_due, 'status:', i.status, 'items:', i.items));

  const { data: bSvcs } = await supabase.from('client_services').select('*').eq('client_id', 'ba27f606-5c76-4e0b-be6f-e9007571efa8');
  const { data: bInvs } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('client_id', 'ba27f606-5c76-4e0b-be6f-e9007571efa8');
  console.log('Brand 360s Services:');
  bSvcs.forEach(s => console.log('  Svc:', s.id, s.service_name, 'fee:', s.service_fee, 'govt:', s.govt_fee, 'total:', s.total_amount));
  console.log('Brand 360s Invoices:');
  bInvs.forEach(i => console.log('  Inv:', i.invoice_number, 'total:', i.total_amount, 'paid:', i.amount_paid, 'due:', i.balance_due, 'status:', i.status, 'items:', i.items));
}
inspectDTUandBrand();

