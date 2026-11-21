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

async function testPerf() {
  const t0 = Date.now();
  const [cRes, sRes, iRes, pRes, fRes, profRes] = await Promise.all([
    supabase.from('clients').select('id, company_name, trade_name, client_code, contact_person, email, phone, created_at, client_status, assigned_salesperson, next_payment_due_date, next_payment_due_amount, payment_status, gst_number').order('created_at', { ascending: false }),
    supabase.from('client_services').select('id, client_id, service_name, service_category, service_fee, govt_fee, total_amount, tax_rate, tax_amount, assigned_employee_id, start_date, expected_completion_date, service_status, fulfillment_stages, current_stage_name, current_stage_description, progress_percentage'),
    supabase.from('invoices').select('id, client_id, total_amount, amount_paid, balance_due, status, items:invoice_items(id, total, client_service_id)').not('status', 'in', '("Draft","Void","Cancelled")'),
    supabase.from('payments').select('id, client_id, amount, status'),
    supabase.from('follow_ups').select('client_id, title, follow_up_type, due_date').eq('status', 'Pending').order('due_date', { ascending: true }),
    supabase.from('profiles').select('id, full_name, email, role, is_active')
  ]);
  const t1 = Date.now();
  console.log('Single parallel batch took:', (t1 - t0), 'ms');
  console.log('Clients count:', cRes.data ? cRes.data.length : 0);
  console.log('Services count:', sRes.data ? sRes.data.length : 0);
  console.log('Invoices count:', iRes.data ? iRes.data.length : 0);
  console.log('Payments count:', pRes.data ? pRes.data.length : 0);
  console.log('Followups count:', fRes.data ? fRes.data.length : 0);
  console.log('Profiles count:', profRes.data ? profRes.data.length : 0);
}
testPerf();

