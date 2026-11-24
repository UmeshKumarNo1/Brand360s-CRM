const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);
const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoin() {
  const { data, error } = await supabase
    .from('renewals')
    .select(`
      id,
      client_id,
      client_service_id,
      salesperson_id,
      service_name_snapshot,
      previous_expiry_date,
      renewal_start_date,
      renewal_end_date,
      renewal_date,
      renewal_amount,
      invoice_id,
      payment_status,
      renewal_status,
      notes,
      created_at,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        contact_person,
        email,
        phone,
        client_status,
        assigned_salesperson
      ),
      salesperson_profile:profiles!salesperson_id (
        id,
        full_name
      ),
      invoice:invoices!invoice_id (
        id,
        invoice_number,
        status,
        total_amount,
        amount_paid,
        balance_due
      ),
      client_service:client_services!client_service_id (
        id,
        service_category,
        expected_completion_date
      )
    `);
  console.log('Join test error:', error);
  console.log('Join test data:', data);
}
testJoin();

