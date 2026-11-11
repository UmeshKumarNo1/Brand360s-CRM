const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
});
const supabase = createClient(url, key);

async function run() {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        contact_person,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        gst_number,
        pan_number
      ),
      creator:profiles!created_by (full_name),
      items:invoice_items (*),
      allocations:invoice_payment_allocations (
        id,
        allocated_amount,
        created_at,
        payment:payments!payment_id (
          id,
          amount,
          payment_date,
          payment_method,
          transaction_ref,
          status
        )
      )
    `)
    .eq('invoice_number', 'B360-INV-2026-0001')
    .maybeSingle();

  console.log('Error:', error);
  console.log('Invoice found:', inv?.id, inv?.invoice_number);
  console.log('Client:', inv?.client);
  console.log('Items:', inv?.items);
  console.log('Creator:', inv?.creator);
}
run();

