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

async function testActions() {
  const { data: svcs } = await supabase.from('client_services').select('id, client_id, service_name, assigned_employee_id, expected_completion_date, service_status, fulfillment_stages').limit(3);
  console.log('Services count:', svcs?.length);
  svcs.forEach(s => {
    console.log(`- ID: ${s.id} | Svc: ${s.service_name} | Emp: ${s.assigned_employee_id} | Due: ${s.expected_completion_date} | Status: ${s.service_status}`);
  });

  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
  console.log('Profiles count:', profiles?.length);

  // Check documents for first service
  if (svcs && svcs[0]) {
    const { data: docs } = await supabase.from('documents').select('*').eq('client_service_id', svcs[0].id);
    console.log(`Documents for ${svcs[0].id}:`, docs?.length);
  }
}
testActions();

