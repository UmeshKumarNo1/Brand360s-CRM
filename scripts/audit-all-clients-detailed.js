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

async function fullFinancialAudit() {
  console.log("=== PHASE 1: COMPREHENSIVE LIVE DATABASE FINANCIAL AUDIT ===\n");

  const [clientsRes, servicesRes, invoicesRes, paymentsRes, allocsRes] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('client_services').select('*'),
    supabase.from('invoices').select('*, items:invoice_items(*)'),
    supabase.from('payments').select('*'),
    supabase.from('invoice_payment_allocations').select('*'),
  ]);

  const clients = clientsRes.data || [];
  const services = servicesRes.data || [];
  const invoices = invoicesRes.data || [];
  const payments = paymentsRes.data || [];
  const allocations = allocsRes.data || [];

  for (const client of clients) {
    const cid = client.id;
    const name = client.company_name || client.name;
    const clientStoredContract = Number(client.contract_value) || 0;
    const clientStoredReceived = Number(client.payments_received) || 0;
    const clientStoredBalance = Number(client.balance_receivable) || 0;

    // 1. Services
    const cSvcs = services.filter(s => s.client_id === cid);
    const activeSvcs = cSvcs.filter(s => (s.service_status || s.status) !== 'Cancelled');
    const serviceContractSum = activeSvcs.reduce((sum, s) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0) + (Number(s.additional_fee) || 0) - (Number(s.discount) || 0));
      return sum + amt;
    }, 0);

    // 2. Invoices
    const cInvs = invoices.filter(i => i.client_id === cid);
    const validIssuedInvs = cInvs.filter(i => !['Draft', 'Void', 'Cancelled'].includes(i.status));
    const totalInvoiced = validIssuedInvs.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    const invoiceReceivable = validIssuedInvs.reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0);

    // 3. Payments
    const cPayments = payments.filter(p => p.client_id === cid);
    const verifiedPayments = cPayments.filter(p => ['Verified', 'Completed', 'Received'].includes(p.status));
    const reversedPayments = cPayments.filter(p => p.status === 'Reversed');
    const verifiedTotal = verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const reversedTotal = reversedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 4. Allocations
    const validInvIds = new Set(validIssuedInvs.map(i => i.id));
    const cAllocs = allocations.filter(a => validInvIds.has(a.invoice_id));
    const allocatedTotal = cAllocs.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);
    const unallocatedAdvance = Math.max(0, verifiedTotal - allocatedTotal);

    // Derived Metrics
    const unbilledContract = Math.max(0, serviceContractSum - totalInvoiced);
    const netContractRemaining = Math.max(0, serviceContractSum - verifiedTotal);

    console.log(`================================================================================`);
    console.log(`CLIENT: ${name} (ID: ${cid})`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[Database Raw Stored on 'clients' table]`);
    console.log(`  - contract_value: ₹${clientStoredContract.toLocaleString('en-IN')}`);
    console.log(`  - payments_received: ₹${clientStoredReceived.toLocaleString('en-IN')}`);
    console.log(`  - balance_receivable: ₹${clientStoredBalance.toLocaleString('en-IN')}`);
    console.log(`\n[Services Audit (${cSvcs.length} total, ${activeSvcs.length} active)]`);
    activeSvcs.forEach(s => {
      console.log(`  * [${s.id.slice(0, 8)}] ${s.service_name} | Fee: ₹${s.service_fee} | Govt: ₹${s.govt_fee} | Total: ₹${s.total_amount} | Status: ${s.service_status}`);
    });
    console.log(`  => Active Services Contract Sum: ₹${serviceContractSum.toLocaleString('en-IN')}`);

    console.log(`\n[Invoices Audit (${cInvs.length} total, ${validIssuedInvs.length} valid issued)]`);
    cInvs.forEach(i => {
      const isLinked = i.items && i.items.some(it => it.client_service_id);
      console.log(`  * [${i.invoice_number}] ID: ${i.id.slice(0, 8)} | Total: ₹${Number(i.total_amount).toLocaleString('en-IN')} | Paid: ₹${Number(i.amount_paid).toLocaleString('en-IN')} | Due: ₹${Number(i.balance_due).toLocaleString('en-IN')} | Status: ${i.status} | Linked to Svc: ${isLinked ? 'YES' : 'NO'} | Note: ${i.notes || '-'}`);
    });
    console.log(`  => Total Valid Invoiced: ₹${totalInvoiced.toLocaleString('en-IN')}`);
    console.log(`  => Total Invoice Receivable (Sum of balance_due): ₹${invoiceReceivable.toLocaleString('en-IN')}`);

    console.log(`\n[Payments Audit (${cPayments.length} txns: ${verifiedPayments.length} verified, ${reversedPayments.length} reversed)]`);
    cPayments.forEach(p => {
      console.log(`  * [Txn ${p.id.slice(0, 8)}] ₹${Number(p.amount).toLocaleString('en-IN')} | Status: ${p.status} | Method: ${p.payment_method} | Date: ${p.payment_date} | Notes: ${p.notes || '-'}`);
    });
    console.log(`  => Verified Payments Received: ₹${verifiedTotal.toLocaleString('en-IN')}`);
    console.log(`  => Reversed Payments Excluded: ₹${reversedTotal.toLocaleString('en-IN')}`);

    console.log(`\n[Payment Allocations Audit (${cAllocs.length} records)]`);
    cAllocs.forEach(a => {
      const inv = invoices.find(i => i.id === a.invoice_id);
      console.log(`  * [Alloc ${a.id.slice(0, 8)}] ₹${Number(a.allocated_amount).toLocaleString('en-IN')} -> ${inv ? inv.invoice_number : a.invoice_id} (from Payment ${a.payment_id.slice(0, 8)})`);
    });
    console.log(`  => Total Allocated to Invoices: ₹${allocatedTotal.toLocaleString('en-IN')}`);
    console.log(`  => Unallocated Advance: ₹${unallocatedAdvance.toLocaleString('en-IN')}`);

    console.log(`\n[Reconciled Core Financial Metrics]`);
    console.log(`  * Contract Value: ₹${serviceContractSum.toLocaleString('en-IN')}`);
    console.log(`  * Invoiced Amount: ₹${totalInvoiced.toLocaleString('en-IN')}`);
    console.log(`  * Verified Payments: ₹${verifiedTotal.toLocaleString('en-IN')}`);
    console.log(`  * Allocated Payments: ₹${allocatedTotal.toLocaleString('en-IN')}`);
    console.log(`  * Invoice Receivable: ₹${invoiceReceivable.toLocaleString('en-IN')}`);
    console.log(`  * Unbilled Contract: ₹${unbilledContract.toLocaleString('en-IN')}`);
    console.log(`  * Unallocated Advance: ₹${unallocatedAdvance.toLocaleString('en-IN')}`);
    console.log(`  * Net Contract Collection Remaining: ₹${netContractRemaining.toLocaleString('en-IN')}`);
    console.log(`--------------------------------------------------------------------------------\n`);
  }
}

fullFinancialAudit();

