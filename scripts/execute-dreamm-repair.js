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

async function repairDreamm() {
  console.log("=== EXECUTING SAFE LIVE DATABASE REPAIR FOR DREAMM HOLIDAYZ ===");

  const clientId = '4ff6f172-db1d-467b-8c32-1bcada266c39';
  const serviceId = '1893fc1c-6413-488f-96e9-ad375ee1b2c9';
  const invoiceItemId = 'fd8d2cb5-6a30-4e1e-8ec8-fa643acc127e';

  // 1. Update service fees
  const { data: sData, error: sErr } = await supabase
    .from('client_services')
    .update({
      service_fee: 50000,
      govt_fee: 0,
      additional_fee: 0,
      discount: 0,
      total_amount: 50000,
      updated_at: new Date().toISOString()
    })
    .eq('id', serviceId)
    .eq('client_id', clientId)
    .select();

  if (sErr) {
    console.error("Error updating service:", sErr);
    return;
  }
  console.log("1. Updated client_service:", sData[0].service_name, "total_amount =", sData[0].total_amount);

  // 2. Link orphaned invoice item
  const { data: itemData, error: itemErr } = await supabase
    .from('invoice_items')
    .update({
      client_service_id: serviceId
    })
    .eq('id', invoiceItemId)
    .select();

  if (itemErr) {
    console.error("Error linking invoice item:", itemErr);
    return;
  }
  console.log("2. Linked invoice_item:", itemData[0].id, "client_service_id =", itemData[0].client_service_id);

  // 3. Update client summary columns
  const { data: cData, error: cErr } = await supabase
    .from('clients')
    .update({
      contract_value: 50000,
      payments_received: 25000,
      balance_receivable: 25000,
      payment_status: 'Partially Paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .select();

  if (cErr) {
    console.error("Error updating client:", cErr);
    return;
  }
  console.log("3. Synchronized client:", cData[0].company_name, "contract_value =", cData[0].contract_value, "balance =", cData[0].balance_receivable);

  console.log("\nLive Database Repair completed successfully!");
}

repairDreamm();
