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

async function testFollowupUpdate() {
  console.log('1. Fetching first follow_up...');
  const { data: rows, error: fetchErr } = await supabase.from('follow_ups').select('*').limit(1);
  if (fetchErr || !rows || rows.length === 0) {
    console.error('Fetch error or no rows:', fetchErr);
    return;
  }

  const item = rows[0];
  console.log('Found row:', item.id, item.title, item.priority, item.due_date, item.status);

  console.log('2. Testing update on row...');
  const updatedNotes = 'Updated test notes at ' + new Date().toISOString();
  const nextPriority = item.priority === 'High' ? 'Medium' : 'High';

  const { data: updated, error: updateErr } = await supabase
    .from('follow_ups')
    .update({
      notes: updatedNotes,
      priority: nextPriority,
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Update failed:', updateErr);
  } else {
    console.log('Update success! Updated record:');
    console.log({
      id: updated.id,
      title: updated.title,
      priority: updated.priority,
      notes: updated.notes,
      updated_at: updated.updated_at
    });
  }
}

testFollowupUpdate();

