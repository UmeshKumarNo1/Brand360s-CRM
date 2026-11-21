const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('Users in auth:');
  users.users.forEach(u => console.log(u.id, u.email));
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:');
  profiles.forEach(p => console.log(p.id, p.full_name, p.role));

  const { data: clients } = await supabase.from('clients').select('id, company_name, created_by, assigned_salesperson');
  console.log('Clients:');
  clients.forEach(c => console.log(c.id, c.company_name, 'created_by:', c.created_by, 'assigned:', c.assigned_salesperson));
}
check();
