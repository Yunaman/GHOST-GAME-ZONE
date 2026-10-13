import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim();
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function cleanup() {
  console.log('Cleaning up orphan active sessions for TV 2 (c-2)...');

  // Fetch all active sessions for c-2
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id, created_at')
    .eq('console_id', 'c-2')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (!activeSessions || activeSessions.length <= 1) {
    console.log('TV 2 active sessions count:', activeSessions?.length || 0, '- No cleanup required.');
    return;
  }

  console.log(`Found ${activeSessions.length} active sessions on TV 2. Keeping latest (${activeSessions[0].id}) and cancelling ${activeSessions.length - 1} older orphans...`);

  const orphanIds = activeSessions.slice(1).map((s) => s.id);
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'CANCELLED' })
    .in('id', orphanIds);

  console.log('Cleanup result error:', error || 'None (Success)');
}

cleanup().catch(console.error);
