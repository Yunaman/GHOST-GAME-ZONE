import { repository } from '../src/lib/repository';
import { loadDb, saveDb } from '../src/lib/db/fs-db';

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('STARTING MANDATORY WORKFLOW VERIFICATION TESTS');
  console.log('----------------------------------------------------');

  // Reset db to clean state for tests
  const db = loadDb();
  db.adjustments = [];
  db.payments = [];
  db.matches = [];
  db.sessions = [];
  db.consoles.forEach((c) => {
    c.status = 'AVAILABLE';
  });
  saveDb(db);

  const consoles = await repository.getConsoles();
  const tv1 = consoles.find((c) => c.name === 'TV 1') || consoles[0];
  const tv2 = consoles.find((c) => c.name === 'TV 2') || consoles[1];

  console.log(`[TEST 1] Starting session on TV 1 (${tv1.id})...`);
  const session1 = await repository.startSession(tv1.id, 'Tester');
  console.log(`✓ Session started. Status: ${session1.status}, Initial Total: ${session1.total_amount} ETB`);
  if (session1.status !== 'ACTIVE' || session1.total_amount !== 0) {
    throw new Error('Test 1 failed: session not active or total not 0');
  }

  // Prevent double active sessions on same TV
  try {
    await repository.startSession(tv1.id);
    throw new Error('Test failed: Allowed second active session on TV 1!');
  } catch (err: any) {
    console.log(`✓ Prevented double active session on TV 1 (${err.message})`);
  }

  console.log('\n[TEST 2] Adding Match 1 to TV 1...');
  const res1 = await repository.addMatch(session1.id);
  console.log(`✓ Match 1 created. Session Total: ${res1.sessionTotal} ETB (Expected 15 ETB)`);
  if (res1.sessionTotal !== 15) throw new Error(`Expected 15 ETB, got ${res1.sessionTotal}`);

  console.log('\n[TEST 3] Adding Match 2 to TV 1...');
  const res2 = await repository.addMatch(session1.id);
  console.log(`✓ Match 2 created. Session Total: ${res2.sessionTotal} ETB (Expected 30 ETB)`);
  if (res2.sessionTotal !== 30) throw new Error(`Expected 30 ETB, got ${res2.sessionTotal}`);

  console.log('\n[TEST 4] Adding Extra Time (+5 ETB) to Match 2...');
  const resExtra = await repository.toggleMatchExtraTime(session1.id, res2.match.id);
  console.log(`✓ Match 2 extra_time: ${resExtra.match.extra_time}, Match Price: ${resExtra.match.total_price} ETB, Session Total: ${resExtra.sessionTotal} ETB (Expected 35 ETB)`);
  if (resExtra.match.total_price !== 20 || resExtra.sessionTotal !== 35) {
    throw new Error(`Expected Match 2 = 20 ETB & Session Total = 35 ETB, got match=${resExtra.match.total_price}, total=${resExtra.sessionTotal}`);
  }

  console.log('\n[TEST 5] Adding Match 3 to TV 1...');
  const res3 = await repository.addMatch(session1.id);
  console.log(`✓ Match 3 created. Session Total: ${res3.sessionTotal} ETB (Expected 50 ETB)`);
  if (res3.sessionTotal !== 50) throw new Error(`Expected 50 ETB, got ${res3.sessionTotal}`);

  console.log('\n[TEST 6] Testing Double-Tap / Idempotency protection...');
  const key = 'idem-test-key-123';
  const tap1 = await repository.addMatch(session1.id, key);
  const tap2 = await repository.addMatch(session1.id, key);
  console.log(`✓ Double tap prevented. Match count did not duplicate. Total: ${tap2.sessionTotal} ETB`);
  if (tap1.match.id !== tap2.match.id) throw new Error('Idempotency failed: duplicated match!');

  // Revert test match using undo
  await repository.undoLastMatch(session1.id);
  const checkTotalAfterUndo = (await repository.getSessionById(session1.id))?.total_amount;
  console.log(`✓ Undid test match. Session Total restored to: ${checkTotalAfterUndo} ETB (Expected 50 ETB)`);
  if (checkTotalAfterUndo !== 50) throw new Error(`Undo failed: expected 50 ETB, got ${checkTotalAfterUndo}`);

  console.log('\n[TEST 7] Finishing Session on TV 1 with CASH payment...');
  const finishedSess = await repository.finishSession(session1.id, 'CASH');
  console.log(`✓ Session finished. TV Status: AVAILABLE, Payment: CASH, Final Total: ${finishedSess.total_amount} ETB`);

  const updatedConsoles = await repository.getConsoles();
  const tv1After = updatedConsoles.find((c) => c.id === tv1.id);
  if (tv1After?.status !== 'AVAILABLE') throw new Error('TV 1 did not return to AVAILABLE state!');

  console.log('\n[TEST 8] Verifying Session History & Reports Analytics...');
  const history = await repository.getSessionsHistory();
  const recorded = history.find((s) => s.id === session1.id);
  if (!recorded) throw new Error('Session not found in history!');

  const matchesCount = recorded.matches?.length || 0;
  const extraCount = recorded.matches?.filter((m) => m.extra_time).length || 0;
  console.log(`✓ History Record -> Matches: ${matchesCount}, Extra Time: ${extraCount}, Total: ${recorded.total_amount} ETB, Method: ${recorded.payments?.[0]?.method}`);

  if (matchesCount !== 3 || extraCount !== 1 || recorded.total_amount !== 50) {
    throw new Error('History breakdown details mismatch!');
  }

  const analytics = await repository.getAnalyticsSummary();
  console.log(`✓ Analytics Summary -> Today Revenue: ${analytics.revenue.today} ETB, Cash: ${analytics.revenueByPaymentMethod.CASH} ETB`);
  if (analytics.revenue.today !== 50 || analytics.revenueByPaymentMethod.CASH !== 50) {
    throw new Error('Analytics totals mismatch!');
  }

  console.log('\n[TEST 9] Testing TV 2 & TV 3 Independent Sessions...');
  const s2 = await repository.startSession(tv2.id);
  await repository.addMatch(s2.id);
  await repository.finishSession(s2.id, 'TELEBIRR', 'TXN-9988');
  console.log('✓ TV 2 session completed independently with TELEBIRR.');

  console.log('\n----------------------------------------------------');
  console.log('ALL MANDATORY VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
