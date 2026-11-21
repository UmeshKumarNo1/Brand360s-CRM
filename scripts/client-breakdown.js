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

async function run() {
  const { data: clients } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  const { data: services } = await supabase.from('client_services').select('*');
  const { data: invoices } = await supabase.from('invoices').select('*, items:invoice_items(*)');
  const { data: payments } = await supabase.from('payments').select('*');
  const { data: allocations } = await supabase.from('invoice_payment_allocations').select('*');

  console.log("\n========================= CLIENT BY CLIENT DETAILED AUDIT =========================\n");

  for (const client of clients) {
    const cid = client.id;
    const name = client.company_name || client.name;
    const cSvcs = services.filter(s => s.client_id === cid);
    const activeSvcs = cSvcs.filter(s => (s.service_status || s.status) !== 'Cancelled');
    const contractTotal = activeSvcs.reduce((sum, s) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0) + (Number(s.additional_fee) || 0) - (Number(s.discount) || 0));
      return sum + amt;
    }, 0);

    const cInvs = invoices.filter(i => i.client_id === cid);
    const validInvs = cInvs.filter(i => !['Draft', 'Void', 'Cancelled'].includes(i.status));
    const invoicedTotal = validInvs.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    const outstandingTotal = validInvs.reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0);

    const cPayments = payments.filter(p => p.client_id === cid);
    const verifiedPayments = cPayments.filter(p => p.status === 'Verified');
    const reversedPayments = cPayments.filter(p => p.status === 'Reversed');
    const collectedTotal = verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const reversedTotal = reversedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const cAllocations = allocations.filter(a => {
      const inv = invoices.find(i => i.id === a.invoice_id);
      return inv && inv.client_id === cid;
    });
    const allocatedTotal = cAllocations.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);
    const unallocatedAdvance = Math.max(0, collectedTotal - allocatedTotal);

    console.log(`CLIENT: ${name} (ID: ${cid})`);
    console.log(`  - Active Services: ${activeSvcs.length}`);
    activeSvcs.forEach(s => {
      console.log(`    * [${s.id.slice(0, 8)}] ${s.service_name}: fee=${s.service_fee}, govt=${s.govt_fee}, total=${s.total_amount}, status=${s.service_status}`);
    });
    console.log(`  - Service Contract Total: ₹${contractTotal.toLocaleString('en-IN')}`);
    console.log(`  - Invoices (Total ${cInvs.length}, Valid Issued: ${validInvs.length}):`);
    cInvs.forEach(i => {
      const linkedItem = i.items && i.items.length > 0 ? i.items[0] : null;
      console.log(`    * [${i.invoice_number}] ID: ${i.id.slice(0, 8)} | Total: ₹${Number(i.total_amount).toLocaleString('en-IN')} | Paid: ₹${Number(i.amount_paid).toLocaleString('en-IN')} | Due: ₹${Number(i.balance_due).toLocaleString('en-IN')} | Status: ${i.status} | Type: ${i.billing_type} | Date: ${i.issue_date} | Linked Svc: ${linkedItem ? linkedItem.client_service_id : 'NONE'} | Note: ${i.notes || 'none'}`);
    });
    console.log(`  - Invoiced Total: ₹${invoicedTotal.toLocaleString('en-IN')}`);
    console.log(`  - Payments Received: ${cPayments.length} txns (Verified: ₹${collectedTotal.toLocaleString('en-IN')}, Reversed: ₹${reversedTotal.toLocaleString('en-IN')}):`);
    cPayments.forEach(p => {
      console.log(`    * [Txn ${p.id.slice(0, 8)}] Amount: ₹${Number(p.amount).toLocaleString('en-IN')} | Status: ${p.status} | Method: ${p.payment_method} | Date: ${p.payment_date} | Notes: ${p.notes || 'none'}`);
    });
    console.log(`  - Allocations: ${cAllocations.length} records totaling ₹${allocatedTotal.toLocaleString('en-IN')}:`);
    cAllocations.forEach(a => {
      const inv = invoices.find(i => i.id === a.invoice_id);
      console.log(`    * [Alloc ${a.id.slice(0, 8)}] To Invoice ${inv ? inv.invoice_number : a.invoice_id}: ₹${Number(a.allocated_amount).toLocaleString('en-IN')} (from Payment ${a.payment_id.slice(0, 8)})`);
    });
    console.log(`  - Financial Summary:`);
    console.log(`    * Contract: ₹${contractTotal.toLocaleString('en-IN')}`);
    console.log(`    * Invoiced: ₹${invoicedTotal.toLocaleString('en-IN')}`);
    console.log(`    * Collected: ₹${collectedTotal.toLocaleString('en-IN')}`);
    console.log(`    * Allocated: ₹${allocatedTotal.toLocaleString('en-IN')}`);
    console.log(`    * Unallocated Advance: ₹${unallocatedAdvance.toLocaleString('en-IN')}`);
    console.log(`    * Outstanding Balance: ₹${outstandingTotal.toLocaleString('en-IN')}`);
    console.log('--------------------------------------------------------------------------------\n');
  }
}

run();
