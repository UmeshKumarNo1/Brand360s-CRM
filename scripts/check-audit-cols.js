const fs = require('fs');
const path = require('path');
const dotenv = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function checkAuditLogs() {
  const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
  if (error) {
    console.error('audit_logs error:', error);
  } else if (data && data.length > 0) {
    console.log('audit_logs columns:', Object.keys(data[0]));
  }
}
checkAuditLogs();

