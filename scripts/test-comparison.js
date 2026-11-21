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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function compareCalculations() {
  const { data: clients } = await supabase
    .from("clients")
    .select(`
      *,
      assigned_profile:profiles!assigned_salesperson(full_name, email),
      services:client_services(
        id, service_name, service_category, service_fee, govt_fee, total_amount,
        tax_rate, tax_amount, assigned_employee_id, start_date, expected_completion_date,
        service_status, fulfillment_stages, current_stage_name, current_stage_description,
        progress_percentage, assigned_profile:profiles!assigned_employee_id(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  const allClientIds = (clients || []).map(c => c.id);
  const [invoicesRes, paymentsRes, allocsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, client_id, total_amount, amount_paid, balance_due, status, items:invoice_items(id, total, client_service_id)")
      .in("client_id", allClientIds)
      .not("status", "in", '("Draft","Void","Cancelled")'),
    supabase
      .from("payments")
      .select("id, client_id, amount, status")
      .in("client_id", allClientIds),
    supabase
      .from("invoice_payment_allocations")
      .select("id, invoice_id, payment_id, allocated_amount, amount, client_service_id"),
  ]);

  const invoicesByClient = {};
  (invoicesRes.data || []).forEach(inv => {
    if (!invoicesByClient[inv.client_id]) invoicesByClient[inv.client_id] = [];
    invoicesByClient[inv.client_id].push(inv);
  });

  const paymentsByClient = {};
  (paymentsRes.data || []).forEach(pmt => {
    if (!paymentsByClient[pmt.client_id]) paymentsByClient[pmt.client_id] = [];
    paymentsByClient[pmt.client_id].push(pmt);
  });

  const allocations = allocsRes.data || [];

  console.log("=== CLIENTS IN DATABASE ===");
  clients.forEach(c => {
    const cInvs = invoicesByClient[c.id] || [];
    const cPmts = paymentsByClient[c.id] || [];
    const verifiedPayments = cPmts.filter(p => ['Verified', 'Completed', 'Received'].includes(p.status) || (!['Pending', 'Failed', 'Cancelled', 'Reversed'].includes(p.status) && p.status !== undefined));
    const collected = verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const validInvs = cInvs.filter(i => !['Draft', 'Void', 'Cancelled'].includes(i.status));
    const outstanding = validInvs.reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0);
    const services = (c.services || []).filter(s => s.service_status !== 'Cancelled');
    const contract = services.reduce((sum, s) => sum + (Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0))), 0);

    console.log(`- ${c.company_name} (Status: ${c.client_status})`);
    console.log(`    Contract: ${contract}, Invoiced: ${validInvs.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0)}, Collected: ${collected}, Outstanding: ${outstanding}`);
  });
}

compareCalculations();

