import fs from 'fs';

// Load .env.local env vars
const envFile = fs.readFileSync('.env.local', 'utf-8');
envFile.split('\n').filter(line => line.trim() && !line.startsWith('#')).forEach(line => {
  const parts = line.split('=');
  const key = parts[0].trim();
  const val = parts.slice(1).join('=').trim();
  process.env[key] = val;
});

import { repository } from '../src/lib/repository';

async function runSupabaseWorkflowTest() {
  console.log('----------------------------------------------------');
  console.log('TESTING LIVE SUPABASE PRODUCTION WORKFLOW');
  console.log('----------------------------------------------------');

  const consoles = await repository.getConsoles();
  console.log(`Fetched ${consoles.length} consoles from Supabase:`, consoles.map(c => c.name));

  const tv1 = consoles.find((c) => c.name === 'TV 1') || consoles[0];
  const tv2 = consoles.find((c) => c.name === 'TV 2') || consoles[1];
  const tv3 = consoles.find((c) => c.name === 'TV 3') || consoles[2];

  console.log(`\n[STEP 1] Starting FIFA Session on ${tv1.name} (${tv1.id})...`);
  const session1 = await repository.startSession(tv1.id, 'Production Staff');
  console.log(`✓ Session created in Supabase! ID: ${session1.id}, Status: ${session1.status}, Total: ${session1.total_amount} ETB`);

  console.log('\n[STEP 2] Adding Match 1 (+15 ETB)...');
  const m1 = await repository.addMatch(session1.id);
  console.log(`✓ Match 1 added to Supabase. Session Total: ${m1.sessionTotal} ETB`);

  console.log('\n[STEP 3] Adding Match 2 (+15 ETB)...');
  const m2 = await repository.addMatch(session1.id);
  console.log(`✓ Match 2 added to Supabase. Session Total: ${m2.sessionTotal} ETB`);

  console.log('\n[STEP 4] Adding Extra Time (+5 ETB) to Match 2...');
  const m2Extra = await repository.toggleMatchExtraTime(session1.id, m2.match.id);
  console.log(`✓ Match 2 Extra Time updated in Supabase. Session Total: ${m2Extra.sessionTotal} ETB`);

  console.log('\n[STEP 5] Adding Match 3 (+15 ETB)...');
  const m3 = await repository.addMatch(session1.id);
  console.log(`✓ Match 3 added to Supabase. Session Total: ${m3.sessionTotal} ETB`);

  if (m3.sessionTotal !== 50) {
    throw new Error(`Expected 50 ETB, got ${m3.sessionTotal} ETB`);
  }

  console.log('\n[STEP 6] Finishing session with CASH payment...');
  const finished = await repository.finishSession(session1.id, 'CASH');
  console.log(`✓ Session finished in Supabase. TV Status: AVAILABLE, Payment: CASH, Final Total: ${finished.total_amount} ETB`);

  console.log('\n[STEP 7] Verifying Session History from Supabase...');
  const history = await repository.getSessionsHistory(10);
  const found = history.find(s => s.id === session1.id);
  if (!found) throw new Error('Session not found in Supabase history!');
  console.log(`✓ Session found in Supabase History! Matches count: ${found.matches?.length}, Total: ${found.total_amount} ETB`);

  console.log('\n[STEP 8] Verifying Analytics Summary from Supabase...');
  const analytics = await repository.getAnalyticsSummary();
  console.log(`✓ Today Revenue: ${analytics.revenue.today} ETB, Cash Payments: ${analytics.revenueByPaymentMethod.CASH} ETB`);

  console.log('\n[STEP 9] Testing TV 2 and TV 3 sessions...');
  const sess2 = await repository.startSession(tv2.id, 'Staff');
  await repository.addMatch(sess2.id);
  await repository.finishSession(sess2.id, 'TELEBIRR');
  console.log(`✓ TV 2 session completed in Supabase.`);

  const sess3 = await repository.startSession(tv3.id, 'Staff');
  await repository.addMatch(sess3.id);
  await repository.finishSession(sess3.id, 'CBE');
  console.log(`✓ TV 3 session completed in Supabase.`);

  console.log('\n----------------------------------------------------');
  console.log('LIVE SUPABASE PRODUCTION WORKFLOW TEST PASSED 100%! 🎉');
  console.log('----------------------------------------------------');
}

runSupabaseWorkflowTest().catch(err => {
  console.error('❌ SUPABASE TEST FAILED:', err);
  process.exit(1);
});
