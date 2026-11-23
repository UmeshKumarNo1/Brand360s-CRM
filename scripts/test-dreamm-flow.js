const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function testFetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select(`
      *,
      assigned_profile:profiles!assigned_salesperson(full_name, email),
      services:client_services(
        id,
        service_name,
        service_category,
        service_fee,
        govt_fee,
        total_amount,
        tax_rate,
        tax_amount,
        assigned_employee_id,
        start_date,
        expected_completion_date,
        service_status,
        fulfillment_stages,
        current_stage_name,
        current_stage_description,
        progress_percentage,
        assigned_profile:profiles!assigned_employee_id(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  console.log('Clients count:', data?.length, 'error:', error);

  const allClientIds = (data || []).map((c) => c.id);
  const allServiceIds = [];
  (data || []).forEach((c) => {
    (c.services || []).forEach((s) => {
      if (s.id) allServiceIds.push(s.id);
    });
  });

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
    allServiceIds.length > 0 || allClientIds.length > 0
      ? supabase
          .from("invoice_payment_allocations")
          .select("id, invoice_id, payment_id, allocated_amount, client_service_id")
      : Promise.resolve({ data: [] }),
  ]);

  console.log('invoicesRes:', invoicesRes.data?.length, invoicesRes.error);
  console.log('paymentsRes:', paymentsRes.data?.length, paymentsRes.error);
  console.log('allocsRes:', allocsRes.data?.length, allocsRes.error);

  const dreamm = data.find(c => c.company_name?.includes('Dreamm'));
  console.log('Dreamm services:', dreamm?.services);

  const dreammInvs = (invoicesRes.data || []).filter(i => i.client_id === dreamm.id);
  const dreammPmts = (paymentsRes.data || []).filter(p => p.client_id === dreamm.id);
  const dreammInvIds = new Set(dreammInvs.map(i => i.id));
  const dreammAllocs = (allocsRes.data || []).filter(a => dreammInvIds.has(a.invoice_id));

  console.log('Dreamm Invs:', dreammInvs);
  console.log('Dreamm Pmts:', dreammPmts);
  console.log('Dreamm Allocs:', dreammAllocs);

  dreamm.services.forEach(s => {
    const matchingInvoices = dreammInvs.filter((inv) => {
      if (inv.items && inv.items.some((it) => it.client_service_id === s.id)) return true;
      if ((dreamm.services || []).length === 1 && !inv.items?.some((it) => it.client_service_id && it.client_service_id !== s.id)) return true;
      return false;
    });

    const matchingInvIds = new Set(matchingInvoices.map((i) => i.id));
    let serviceAllocatedAmount = dreammAllocs
      .filter((a) => a.client_service_id === s.id || matchingInvIds.has(a.invoice_id))
      .reduce((sum, a) => sum + (Number(a.allocated_amount ?? a.amount) || 0), 0);

    console.log(`Service "${s.service_name}": matchingInvoices=`, matchingInvoices.length, 'serviceAllocatedAmount=', serviceAllocatedAmount);
  });
}

testFetchClients();

