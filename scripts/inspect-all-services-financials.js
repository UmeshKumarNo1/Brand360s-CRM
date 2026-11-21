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

async function checkClient() {
  const { data: clients } = await supabase.from('clients').select('id, company_name');
  for (const c of clients) {
    console.log(`\n=== Client: [${c.id}] "${c.company_name}" ===`);
    const { data: services } = await supabase.from('client_services').select('*').eq('client_id', c.id);
    const { data: invoices } = await supabase.from('invoices').select('id, invoice_number, total_amount, amount_paid, balance_due, status').eq('client_id', c.id);
    const invIds = (invoices || []).map(i => i.id);
    let items = [];
    let allocs = [];
    if (invIds.length > 0) {
      const itRes = await supabase.from('invoice_items').select('*').in('invoice_id', invIds);
      items = itRes.data || [];
      const alRes = await supabase.from('invoice_payment_allocations').select('*').in('invoice_id', invIds);
      allocs = alRes.data || [];
    }
    const { data: payments } = await supabase.from('payments').select('*').eq('client_id', c.id);

    console.log('Services:', services?.map(s => ({
      id: s.id,
      name: s.service_name,
      fee: s.service_fee,
      total_amount: s.total_amount,
      tax_rate: s.tax_rate,
      tax_amount: s.tax_amount,
    })));
    console.log('Invoices:', invoices);
    console.log('Invoice items:', items.map(it => ({ id: it.id, inv_id: it.invoice_id, client_service_id: it.client_service_id, total: it.total })));
    console.log('Payments:', payments?.map(p => ({ id: p.id, amount: p.amount, status: p.status })));
    console.log('Allocations:', allocs);
  }
}

checkClient();
