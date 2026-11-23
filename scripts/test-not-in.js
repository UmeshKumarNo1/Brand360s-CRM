const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/))[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function test() {
  const { data: d1, error: e1 } = await supabase
    .from('invoices')
    .select('id, client_id, status')
    .not('status', 'in', '("Draft","Void","Cancelled")');
  console.log('not status in ("Draft","Void","Cancelled"):', d1?.length, e1);

  const { data: d2, error: e2 } = await supabase
    .from('invoices')
    .select('id, client_id, status')
    .not('status', 'in', '(Draft,Void,Cancelled)');
  console.log('not status in (Draft,Void,Cancelled):', d2?.length, e2);
}

test();

