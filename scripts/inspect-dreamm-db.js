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

async function inspectDreamm() {
  const { data: clients, error: cErr } = await supabase.from('clients').select('*').ilike('company_name', '%Dreamm%');
  if (cErr) {
    console.error("Client fetch error:", cErr);
    return;
  }
  console.log("Dreamm Clients found:", clients.length);
  for (const c of clients) {
    console.log(`\nClient ID: ${c.id}, Name: ${c.company_name}, Contract Value: ${c.contract_value}, Payments Received: ${c.payments_received}, Balance Receivable: ${c.balance_receivable}`);
    
    const { data: services } = await supabase.from('client_services').select('*').eq('client_id', c.id);
    console.log(`Services (${services?.length || 0}):`);
    for (const s of (services || [])) {
      console.log(`  - ${s.service_name} (id: ${s.id}): fee=${s.service_fee}, govt=${s.govt_fee}, total=${s.total_amount}, taxRate=${s.tax_rate}`);
    }

    const { data: invoices } = await supabase.from('invoices').select('*, items:invoice_items(*)').eq('client_id', c.id);
    console.log(`Invoices (${invoices?.length || 0}):`);
    for (const inv of (invoices || [])) {
      console.log(`  - Inv #${inv.invoice_number} (id: ${inv.id}, status: ${inv.status}): total=${inv.total_amount}, paid=${inv.amount_paid}, balance=${inv.balance_due}`);
      for (const it of (inv.items || [])) {
        console.log(`      * Item: "${it.description}", total=${it.total}, svcId=${it.client_service_id}`);
      }
    }

    const { data: payments } = await supabase.from('payments').select('*').eq('client_id', c.id);
    console.log(`Payments (${payments?.length || 0}):`);
    for (const p of (payments || [])) {
      console.log(`  - Payment ${p.id}: amount=${p.amount}, status=${p.status}, date=${p.payment_date}`);
    }

    const { data: allocs } = await supabase.from('invoice_payment_allocations').select('*').in('invoice_id', (invoices || []).map(i => i.id));
    console.log(`Allocations (${allocs?.length || 0}):`);
    for (const a of (allocs || [])) {
      console.log(`  - Alloc: payment_id=${a.payment_id}, invoice_id=${a.invoice_id}, amount=${a.allocated_amount}`);
    }
  }
}

inspectDreamm();
