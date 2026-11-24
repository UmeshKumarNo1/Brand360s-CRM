const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);
const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function resync() {
  console.log('1. Checking invoice B360-INV-2026-0018...');
  const invId = 'c08cda34-beb8-406e-abd8-95f68acdd95a';
  const clientId = '34b3d3b7-7b69-4737-a55b-f229435cf56e';

  // 1. Fetch live allocations for B360-INV-2026-0018
  const { data: allocs } = await supabase
    .from('invoice_payment_allocations')
    .select('allocated_amount')
    .eq('invoice_id', invId);

  const totalAllocated = (allocs || []).reduce((sum, a) => sum + Number(a.allocated_amount), 0);
  console.log(`Live allocations for invoice ${invId}: ₹${totalAllocated}`);

  const totalAmount = 53100;
  const newBalance = Math.max(0, totalAmount - totalAllocated);
  const newStatus = totalAllocated >= totalAmount ? 'Paid' : totalAllocated > 0 ? 'Partially Paid' : 'Issued';

  console.log(`Syncing invoice to: amount_paid=${totalAllocated}, balance_due=${newBalance}, status=${newStatus}`);

  const { error: invErr } = await supabase
    .from('invoices')
    .update({
      amount_paid: totalAllocated,
      balance_due: newBalance,
      status: newStatus,
    })
    .eq('id', invId);

  if (invErr) console.error('Error updating invoice:', invErr);
  else console.log('Successfully updated invoice B360-INV-2026-0018!');

  // 2. Fetch all valid invoices for Dreamm Holidayz to calculate balance_receivable
  const { data: allInvs } = await supabase
    .from('invoices')
    .select('id, total_amount, amount_paid, balance_due, status')
    .eq('client_id', clientId)
    .not('status', 'in', '("Draft","Void","Cancelled")');

  const totalInvoiced = (allInvs || []).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalBalanceDue = (allInvs || []).reduce((sum, inv) => {
    // If it was the updated one, use newBalance
    if (inv.id === invId) return sum + newBalance;
    return sum + (Number(inv.balance_due) || 0);
  }, 0);

  console.log(`Client totalInvoiced: ₹${totalInvoiced}, totalBalanceDue: ₹${totalBalanceDue}`);

  const { error: clientErr } = await supabase
    .from('clients')
    .update({
      balance_receivable: totalBalanceDue,
      payments_received: 45000,
    })
    .eq('id', clientId);

  if (clientErr) console.error('Error updating client:', clientErr);
  else console.log('Successfully updated client Dreamm Holidayz balance_receivable to ₹' + totalBalanceDue);
}

resync();

