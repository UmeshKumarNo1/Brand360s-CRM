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

async function inspectClientInvoicesAndServices() {
  const { data: clients } = await supabase.from('clients').select('id, company_name, contract_value, payments_received, balance_receivable').order('created_at', { ascending: false });
  const { data: services } = await supabase.from('client_services').select('*');
  const { data: invoices } = await supabase.from('invoices').select('*, invoice_items(*)');

  for (const c of clients) {
    const cSvcs = services.filter(s => s.client_id === c.id);
    const cInvs = invoices.filter(i => i.client_id === c.id);
    console.log('\n======================================');
    console.log('CLIENT: ' + c.company_name);
    console.log('Table columns: contract_value=' + c.contract_value + ', payments_received=' + c.payments_received + ', balance_receivable=' + c.balance_receivable);
    console.log('Services (' + cSvcs.length + '):');
    for (const s of cSvcs) {
      console.log('  [Svc ' + s.id + '] ' + s.service_name + ' | Category: ' + s.service_category + ' | fee: ' + s.service_fee + ', govt: ' + s.govt_fee + ', total: ' + s.total_amount + ', status: ' + s.service_status);
    }
    console.log('Invoices (' + cInvs.length + '):');
    for (const i of cInvs) {
      console.log('  [Inv ' + i.invoice_number + ' - status: ' + i.status + '] total: ' + i.total_amount + ', amount_paid: ' + i.amount_paid + ', balance: ' + i.balance_due + ' | Created: ' + i.created_at + ' | Notes: ' + i.notes);
      for (const item of (i.invoice_items || [])) {
        console.log('      * Item: ' + item.description + ' (total: ' + item.total + ', client_service_id: ' + item.client_service_id + ')');
      }
    }
  }
}
inspectClientInvoicesAndServices();
