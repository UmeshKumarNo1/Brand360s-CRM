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

async function fullAudit() {
  console.log("=== PHASE 1 & 2: LIVE SUPABASE COMPLETE CLIENT FINANCIAL AUDIT ===");

  const { data: clients, error: cErr } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  const { data: services, error: sErr } = await supabase.from('client_services').select('*');
  const { data: invoices, error: iErr } = await supabase.from('invoices').select('*, items:invoice_items(*)');
  const { data: payments, error: pErr } = await supabase.from('payments').select('*');
  const { data: allocations, error: aErr } = await supabase.from('invoice_payment_allocations').select('*');

  if (cErr || sErr || iErr || pErr || aErr) {
    console.error("Fetch error:", { cErr, sErr, iErr, pErr, aErr });
    return;
  }

  console.log(`Auditing ${clients.length} clients...`);
  console.log(`Total Services: ${services.length}, Invoices: ${invoices.length}, Payments: ${payments.length}, Allocations: ${allocations.length}\n`);

  const auditRows = [];

  for (const client of clients) {
    const clientId = client.id;
    const clientName = client.company_name || client.name || "Unknown";

    // 1. Active Services
    const cSvcs = services.filter(s => s.client_id === clientId && (s.service_status || s.status) !== 'Cancelled');
    const contractValue = cSvcs.reduce((sum, s) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0) + (Number(s.additional_fee) || 0) - (Number(s.discount) || 0));
      return sum + amt;
    }, 0);

    // 2. Valid Issued Invoices
    const cInvs = invoices.filter(i => i.client_id === clientId && !['Draft', 'Void', 'Cancelled'].includes(i.status));
    const invoicedAmount = cInvs.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    // 3. Payments Received (Verified & Non-reversed)
    const cPmts = payments.filter(p => p.client_id === clientId && (['Verified', 'Completed', 'Received'].includes(p.status) || (!['Pending', 'Failed', 'Cancelled', 'Reversed'].includes(p.status) && p.status !== undefined)));
    const paymentsReceived = cPmts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 4. Allocated Payments
    const cInvIds = new Set(cInvs.map(i => i.id));
    const cAllocs = allocations.filter(a => cInvIds.has(a.invoice_id));
    const allocatedPayments = cAllocs.reduce((sum, a) => sum + (Number(a.allocated_amount ?? a.amount) || 0), 0);

    // 5. Unallocated Advance
    const unallocatedAdvance = Math.max(0, paymentsReceived - allocatedPayments);

    // 6. Invoice Outstanding
    const invoiceOutstanding = cInvs.reduce((sum, i) => {
      const bal = i.balance_due !== undefined && i.balance_due !== null ? Number(i.balance_due) : Math.max(0, (Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0));
      return sum + bal;
    }, 0);

    // 7. Check for Issues
    const issues = [];
    if (contractValue === 0 && (invoicedAmount > 0 || paymentsReceived > 0)) {
      issues.push(`Contract is ₹0 but has invoices (₹${invoicedAmount}) or payments (₹${paymentsReceived})`);
    }

    // Check orphaned invoice items
    for (const inv of cInvs) {
      for (const item of (inv.items || [])) {
        if (!item.client_service_id) {
          issues.push(`Invoice ${inv.invoice_number} item "${item.description}" has NULL client_service_id`);
        }
      }
    }

    // Check commercial mismatches
    if (contractValue > 0 && invoicedAmount > 0 && contractValue !== invoicedAmount) {
      issues.push(`Commercial mismatch: Contract ₹${contractValue} vs Invoiced ₹${invoicedAmount}`);
    }

    // Classification
    let classification = "Reconciled";
    if (issues.some(iss => iss.includes("NULL client_service_id") || iss.includes("Contract is ₹0"))) {
      classification = "Mismatch";
    } else if (unallocatedAdvance > 0) {
      classification = "Advance Payment";
    } else if (issues.length > 0) {
      classification = "Needs Review";
    }

    auditRows.push({
      clientId,
      clientName,
      contractValue,
      invoicedAmount,
      paymentsReceived,
      allocatedPayments,
      unallocatedAdvance,
      invoiceOutstanding,
      classification,
      issues,
      services: cSvcs,
      invoices: cInvs,
      payments: cPmts,
    });
  }

  console.log(JSON.stringify(auditRows, null, 2));
}

fullAudit();
