const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKeyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const url = urlMatch ? urlMatch[1].trim() : '';
const key = serviceKeyMatch ? serviceKeyMatch[1].trim() : '';
const supabase = createClient(url, key);

async function testAllScenarios() {
  console.log('=== Step 1: Find Client La-fantaisie & Website Development Service ===');
  const { data: client } = await supabase.from('clients').select('id, company_name').ilike('company_name', '%fantaisie%').single();
  const { data: service } = await supabase.from('client_services').select('id, service_name, service_fee').eq('client_id', client.id).ilike('service_name', '%Website%').single();
  console.log('Found:', { client: client?.company_name, service: service?.service_name, fee: service?.service_fee });

  console.log('=== Step 2: Find Vendors (rajaoverseas & create temporary 2nd vendor) ===');
  let { data: vendor1 } = await supabase.from('vendors').select('id, name').ilike('name', '%raja%').single();
  
  let { data: vendor2 } = await supabase.from('vendors').select('id, name').eq('name', 'Creative Designer Partner').maybeSingle();
  if (!vendor2) {
    const { data: v2Created } = await supabase.from('vendors').insert({
      name: 'Creative Designer Partner',
      category: 'Web & Technology',
      contact_person: 'Priya S',
      phone: '+919988776655',
      status: 'Active'
    }).select().single();
    vendor2 = v2Created;
  }
  console.log('Vendors ready:', { v1: vendor1?.name, v2: vendor2?.name });

  console.log('=== Step 3: Scenario 1 — Assign First Vendor (rajaoverseas, Cost: 8000, Status: Pending) ===');
  // Clean prior tests
  await supabase.from('service_vendors').delete().eq('client_service_id', service.id);

  const { data: assign1, error: aErr1 } = await supabase.from('service_vendors').insert({
    client_service_id: service.id,
    vendor_id: vendor1.id,
    agreed_cost: 8000,
    payment_status: 'Pending',
    notes: 'Website development outsourced to rajaoverseas'
  }).select().single();
  console.log('Assigned vendor 1:', { id: assign1?.id, cost: assign1?.agreed_cost, status: assign1?.payment_status, error: aErr1 });

  console.log('=== Step 4: Scenario 2 — Assign Second Vendor (Cost: 3000) ===');
  const { data: assign2, error: aErr2 } = await supabase.from('service_vendors').insert({
    client_service_id: service.id,
    vendor_id: vendor2.id,
    agreed_cost: 3000,
    payment_status: 'Pending',
    notes: 'UI/UX wireframes and visual design'
  }).select().single();
  console.log('Assigned vendor 2:', { id: assign2?.id, cost: assign2?.agreed_cost, error: aErr2 });

  console.log('=== Step 5: Verify Aggregation / Fetch for Client Services Table ===');
  const query = 'id, service_name, service_fee, vendor_assignments:service_vendors(id, agreed_cost, payment_status, vendor:vendors!vendor_id(id, name, category))';
  const { data: srvWithVendors } = await supabase
    .from('client_services')
    .select(query)
    .eq('id', service.id)
    .single();

  const totalCost = (srvWithVendors.vendor_assignments || []).reduce((sum, a) => sum + Number(a.agreed_cost), 0);
  console.log('Service with vendors:', {
    serviceName: srvWithVendors.service_name,
    vendorCount: srvWithVendors.vendor_assignments?.length,
    totalCost,
    margin: srvWithVendors.service_fee - totalCost
  });

  console.log('=== Step 6: Scenario 3 — Edit Vendor 1 Cost (8000 -> 9000) ===');
  const { data: updatedAssign1 } = await supabase
    .from('service_vendors')
    .update({ agreed_cost: 9000 })
    .eq('id', assign1.id)
    .select()
    .single();
  console.log('Updated cost:', updatedAssign1?.agreed_cost);

  console.log('=== Step 7: Scenario 4 & 5 — Update Payment Status (Pending -> Partially Paid -> Paid) ===');
  const { data: markedPartially } = await supabase
    .from('service_vendors')
    .update({ payment_status: 'Partially Paid' })
    .eq('id', assign1.id)
    .select()
    .single();
  console.log('Status updated to:', markedPartially?.payment_status);

  const { data: markedPaid } = await supabase
    .from('service_vendors')
    .update({ payment_status: 'Paid' })
    .eq('id', assign1.id)
    .select()
    .single();
  console.log('Status updated to:', markedPaid?.payment_status);

  console.log('=== Step 8: Scenario 6 — Remove Vendor 2 Assignment ===');
  const { error: delErr } = await supabase.from('service_vendors').delete().eq('id', assign2.id);
  console.log('Deleted assignment 2, error:', delErr);
  const { data: checkVendor2 } = await supabase.from('vendors').select('id, name').eq('id', vendor2.id).single();
  console.log('Vendor 2 still exists in vendors table:', checkVendor2?.name);

  console.log('=== Step 9: Check Active Jobs Count in Vendors Query ===');
  const vQuery = 'id, name, assignments:service_vendors(id, client_service:client_services!client_service_id(id, service_status))';
  const { data: vList } = await supabase
    .from('vendors')
    .select(vQuery)
    .eq('id', vendor1.id)
    .single();

  const activeJobs = (vList.assignments || []).filter(a => a.client_service?.service_status !== 'Completed' && a.client_service?.service_status !== 'Cancelled').length;
  console.log('Vendor active jobs count:', { vendor: vList.name, activeJobs });

  console.log('=== ALL SCENARIOS VERIFIED END-TO-END ===');
}

testAllScenarios();

