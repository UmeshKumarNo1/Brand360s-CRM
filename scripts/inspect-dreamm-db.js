const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envConfig = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envConfig[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function inspectDreamm() {
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('id, company_name, contract_value, payments_received, balance_receivable')
    .ilike('company_name', '%Dreamm%');

  if (cErr || !clients || clients.length === 0) {
    console.error('Client error:', cErr, clients);
    return;
  }

  const dreamm = clients[0];
  console.log('=== CLIENT RECORD ===');
  console.log(dreamm);

  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, subtotal, tax_amount, amount_paid, balance_due, status, issue_date, due_date')
    .eq('client_id', dreamm.id);

  console.log('\n=== INVOICES ===');
  console.log(invoices);

  const { data: payments, error: pErr } = await supabase
    .from('payments')
    .select('id, amount, status, payment_date')
    .eq('client_id', dreamm.id);

  console.log('\n=== PAYMENTS ===');
  console.log(payments);

  const { data: allocs, error: aErr } = await supabase
    .from('invoice_payment_allocations')
    .select('id, invoice_id, payment_id, allocated_amount, client_service_id')
    .in('invoice_id', (invoices || []).map(i => i.id));

  console.log('\n=== ALLOCATIONS ===');
  console.log(allocs);
}

inspectDreamm();
