import { repository } from '../src/lib/repository';
import { verifyCredentials } from '../src/lib/auth';

async function testPersistenceFlow() {
  console.log('----------------------------------------------------');
  console.log('STARTING REAL SUPABASE DATA PERSISTENCE TESTS');
  console.log('----------------------------------------------------');

  // 1. Auth Test
  const isAuthOk = await verifyCredentials('ghostvon', 'von$111');
  console.log('[TEST 1] Authentication check (ghostvon / von$111):', isAuthOk ? '✓ PASSED' : 'FAILED');
  if (!isAuthOk) throw new Error('Authentication check failed');

  // 2. Fetch Consoles
  const consoles = await repository.getConsoles();
  const tv1 = consoles.find((c) => c.name === 'TV 1') || consoles[0];
  console.log(`[TEST 2] TV Station Found: ${tv1.name} (${tv1.id})`);

  // Clear any previous active session if exists
  const existingActive = await repository.getActiveSessionByConsoleId(tv1.id);
  if (existingActive) {
    console.log('Finishing previous stale active session on TV 1...');
    await repository.finishSession(existingActive.id, 'CASH');
  }

  // 3. Start Session
  const newSession = await repository.startSession(tv1.id, 'Tester');
  console.log(`[TEST 3] Started new session on ${tv1.name}. Session ID: ${newSession.id}`);

  // 4. Add Match 1
  const m1Res = await repository.addMatch(newSession.id);
  console.log(`[TEST 4] Added Match 1. Session Total: ${m1Res.sessionTotal} ETB (Expected 15 ETB)`);

  // 5. Add Match 2
  const m2Res = await repository.addMatch(newSession.id);
  console.log(`[TEST 5] Added Match 2. Session Total: ${m2Res.sessionTotal} ETB (Expected 30 ETB)`);

  // 6. Add Extra Time to Match 2
  const extraRes = await repository.toggleMatchExtraTime(newSession.id, m2Res.match.id);
  console.log(`[TEST 6] Added Extra Time to Match 2. Session Total: ${extraRes.sessionTotal} ETB (Expected 35 ETB)`);

  // 7. Re-query Supabase Session directly to verify persistence
  const queriedSession = await repository.getSessionById(newSession.id);
  console.log(`[TEST 7] Queried Session from Supabase -> Matches Count: ${queriedSession?.matches?.length}, Total: ${queriedSession?.total_amount} ETB`);
  if (queriedSession?.matches?.length !== 2 || queriedSession?.total_amount !== 35) {
    throw new Error('Supabase session matches or total count mismatch!');
  }

  // 8. Test Undo Last
  const undoRes = await repository.undoLastMatch(newSession.id);
  console.log(`[TEST 8] Undid Match 2. Session Total: ${undoRes.sessionTotal} ETB (Expected 15 ETB)`);

  const queriedSessionAfterUndo = await repository.getSessionById(newSession.id);
  console.log(`[TEST 9] Queried Session after Undo -> Matches Count: ${queriedSessionAfterUndo?.matches?.length}, Total: ${queriedSessionAfterUndo?.total_amount} ETB`);
  if (queriedSessionAfterUndo?.matches?.length !== 1 || queriedSessionAfterUndo?.total_amount !== 15) {
    throw new Error('Undo last match persistence verification failed!');
  }

  // 9. Finish Session
  const finishedSess = await repository.finishSession(newSession.id, 'CASH');
  console.log(`[TEST 10] Finished session with CASH. Status: ${finishedSess.status}, Payment Status: ${finishedSess.payment_status}`);

  // 10. Check History
  const history = await repository.getSessionsHistory(10);
  const foundInHistory = history.find((s) => s.id === newSession.id);
  console.log(`[TEST 11] History verification -> Found in completed history:`, !!foundInHistory ? '✓ YES' : 'NO');
  if (!foundInHistory) throw new Error('Finished session not found in completed history!');

  console.log('----------------------------------------------------');
  console.log('ALL SUPABASE PERSISTENCE TESTS PASSED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
}

testPersistenceFlow().catch((err) => {
  console.error('Persistence Test Error:', err);
  process.exit(1);
});
