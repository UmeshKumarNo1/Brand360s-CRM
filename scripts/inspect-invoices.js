const fs = require('fs');
const path = require('path');
const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function inspectInvoices() {
  const { data: clients } = await supabase.from('clients').select('id, company_name, contract_value').order('created_at', { ascending: false });
  const { data: invoices } = await supabase.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: true });

  for (const client of clients) {
    const cInvs = invoices.filter(i => i.client_id === client.id);
    console.log('\n=============================================');
    console.log('Client: ' + client.company_name + ' (Contract: ₹' + client.contract_value + ')');
    console.log('Invoices count: ' + cInvs.length);
    for (const inv of cInvs) {
      console.log('  -> ' + inv.invoice_number + ' | Status: ' + inv.status + ' | Total: ₹' + inv.total_amount + ' | Paid: ₹' + inv.amount_paid + ' | Balance: ₹' + inv.balance_due + ' | Created: ' + inv.created_at + ' | Notes: ' + inv.notes);
      for (const item of (inv.invoice_items || [])) {
        console.log('       * Item: "' + item.description + '" (Qty: ' + item.quantity + ', Unit: ' + item.unit_price + ', Total: ' + item.total + ', client_service_id: ' + item.client_service_id + ')');
      }
    }
  }
}
inspectInvoices();
