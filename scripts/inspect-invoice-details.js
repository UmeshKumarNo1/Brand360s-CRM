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

async function inspectInvoiceDetails() {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*),
      allocations:invoice_payment_allocations(*)
    `)
    .eq('invoice_number', 'B360-INV-2026-0018')
    .single();

  console.log('=== INVOICE B360-INV-2026-0018 ===');
  console.log(inv);

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', inv.client_id);

  console.log('=== PAYMENTS FOR THIS CLIENT ===');
  console.log(payments);
}

inspectInvoiceDetails();

