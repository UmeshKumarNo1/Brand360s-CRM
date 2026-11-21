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

async function checkAllInvoices() {
  const { data: invs } = await supabase.from('invoices').select('id, invoice_number, client_id, total_amount, amount_paid, balance_due, status');
  console.log('Total invoices in DB:', invs.length);
  invs.forEach(i => console.log(`  Inv: ${i.invoice_number} | Client: ${i.client_id.slice(0, 8)} | Total: ${i.total_amount} | Paid: ${i.amount_paid} | Due: ${i.balance_due} | Status: ${i.status}`));
}
checkAllInvoices();

