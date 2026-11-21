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

async function testIndexFix() {
  const sql = `
    CREATE INDEX IF NOT EXISTS idx_follow_ups_status_client ON public.follow_ups (status, client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON public.invoices (client_id, status);
  `;
  // Check if we can execute sql via rpc or just check
  console.log("Checking if indexes can be created...");
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log("exec_sql result:", error ? error.message : "Success");
  } catch (e) {
    console.log("exec_sql error:", e.message);
  }
}
testIndexFix();

