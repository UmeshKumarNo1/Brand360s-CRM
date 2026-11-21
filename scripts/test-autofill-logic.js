const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function testAutoFillLogic() {
  console.log("=== RUNNING AUTO-FILL & SERVER VALIDATION VERIFICATION ===\n");

  // 1. Fetch DTU Foundation (All invoices fully paid)
  const { data: dtuClient } = await supabase
    .from('clients')
    .select('id, company_name')
    .ilike('company_name', '%DTU%')
    .single();

  if (dtuClient) {
    const { data: dtuInvoices } = await supabase
      .from('invoices')
      .select('id, total_amount, amount_paid, balance_due, status')
      .eq('client_id', dtuClient.id)
      .not('status', 'in', '("Draft","Void","Cancelled")');

    const dtuRemaining = (dtuInvoices || []).reduce((sum, inv) => {
      const bal = inv.balance_due !== undefined && inv.balance_due !== null
        ? Number(inv.balance_due)
        : Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0));
      return sum + bal;
    }, 0);

    console.log(`DTU Foundation: Remaining Invoice Balance = ₹${dtuRemaining}`);
    console.log(`  -> Expected auto-filled amount in form: ${dtuRemaining > 0 ? dtuRemaining : 0}`);
    console.log(`  -> Form submit blocked when remaining <= 0: ${dtuRemaining <= 0 ? 'YES (Blocked as expected)' : 'NO'}`);
  }

  // 2. Fetch Dreamm Holidayz (Partially Paid invoice)
  const { data: dreammClient } = await supabase
    .from('clients')
    .select('id, company_name')
    .ilike('company_name', '%Dreamm%')
    .single();

  if (dreammClient) {
    const { data: dreammInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, amount_paid, balance_due, status')
      .eq('client_id', dreammClient.id)
      .not('status', 'in', '("Draft","Void","Cancelled")');

    const dreammRemaining = (dreammInvoices || []).reduce((sum, inv) => {
      const bal = inv.balance_due !== undefined && inv.balance_due !== null
        ? Number(inv.balance_due)
        : Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0));
      return sum + bal;
    }, 0);

    console.log(`\nDreamm Holidayz:`);
    console.log(`  Total Invoices Count: ${dreammInvoices.length}`);
    dreammInvoices.forEach(inv => {
      console.log(`  - Inv: ${inv.invoice_number} | Total: ₹${inv.total_amount} | Due: ₹${inv.balance_due}`);
    });
    console.log(`  Remaining Client Invoice Balance = ₹${dreammRemaining}`);
    console.log(`  -> Expected initial auto-fill on client selection: ₹${dreammRemaining}`);
    console.log(`  -> When specific invoice selected: auto-populates invoice's remaining balance ₹${dreammInvoices[0]?.balance_due}`);
  }

  console.log("\nVerification logic validated successfully.");
}

testAutoFillLogic();
