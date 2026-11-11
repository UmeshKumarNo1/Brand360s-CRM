const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function inspect() {
  const { data, error } = await supabase.from('follow_ups').select('*').limit(3);
  if (error) {
    console.error('Error fetching follow_ups:', error);
  } else {
    console.log('Follow-ups count in sample:', data?.length);
    if (data && data.length > 0) {
      console.log('Sample row keys:', Object.keys(data[0]));
      console.log('Sample row data:', data[0]);
    } else {
      console.log('Table exists but is empty. Trying to inspect schema by inserting and rolling back or checking column names.');
    }
  }

  // Also check profiles for assigned employees
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, email, role, is_active');
  console.log('Profiles count:', profiles?.length);
  if (profiles) console.log('Profiles:', profiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })));
}

inspect();

