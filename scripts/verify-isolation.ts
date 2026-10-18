import { repository } from '../src/lib/repository';

async function verifyIsolation() {
  console.log('=== STARTING E2E MULTI-TENANT ISOLATION VERIFICATION ===');

  // 1. Create Tenant A
  const idA = `user_a_${Date.now()}`;
  const tenantA = await repository.registerCustomerTenant('Game Zone Alpha', 'Owner A', idA, 'passA', 5000);
  console.log(`[CREATED] Tenant A: ${tenantA.id} (${tenantA.game_zone_name})`);

  // 2. Create Tenant B
  const idB = `user_b_${Date.now()}`;
  const tenantB = await repository.registerCustomerTenant('Game Zone Beta', 'Owner B', idB, 'passB', 5000);
  console.log(`[CREATED] Tenant B: ${tenantB.id} (${tenantB.game_zone_name})`);

  // 3. Get Consoles for Tenant A
  const consolesA = await repository.getConsoles(tenantA.id);
  console.log(`[TENANT A] Consoles Count: ${consolesA.length}`);
  if (consolesA.length === 0) throw new Error('Tenant A has no consoles');

  // 4. Start session on Console A1 for Tenant A
  const sessionA = await repository.startSession(consolesA[0].id, 'Staff A', undefined, tenantA.id);
  console.log(`[TENANT A] Started Session ID: ${sessionA.id}`);

  // Add a match for Tenant A
  const matchA = await repository.addMatch(sessionA.id, `idemp-a-${Date.now()}`);
  console.log(`[TENANT A] Added Match Total: ${matchA.sessionTotal}`);

  // 5. Get Consoles for Tenant B
  const consolesB = await repository.getConsoles(tenantB.id);
  console.log(`[TENANT B] Consoles Count: ${consolesB.length}`);
  if (consolesB.length === 0) throw new Error('Tenant B has no consoles');

  // Verify Tenant B cannot see Tenant A's session
  const activeBForAConsole = await repository.getActiveSessionByConsoleId(consolesA[0].id, tenantB.id);
  if (activeBForAConsole !== null) {
    throw new Error('SECURITY VIOLATION: Tenant B could query Tenant A console active session!');
  }
  console.log('[SECURITY VERIFIED] Tenant B cannot see Tenant A active session');

  // Verify Tenant B getSessionById returns null for Tenant A session
  const sessionAFromB = await repository.getSessionById(sessionA.id, tenantB.id);
  if (sessionAFromB !== null) {
    throw new Error('SECURITY VIOLATION: Tenant B retrieved Tenant A session by ID!');
  }
  console.log('[SECURITY VERIFIED] Tenant B getSessionById for Tenant A session returned NULL');

  // Finish session for Tenant A
  await repository.finishSession(sessionA.id, 'CASH');
  console.log('[TENANT A] Session finished and paid');

  // Check history for Tenant B
  const historyB = await repository.getSessionsHistory(100, tenantB.id);
  if (historyB.some((s) => s.id === sessionA.id)) {
    throw new Error('SECURITY VIOLATION: Tenant A session appeared in Tenant B history!');
  }
  console.log('[SECURITY VERIFIED] Tenant A session not in Tenant B history');

  console.log('=== MULTI-TENANT ISOLATION VERIFICATION COMPLETED SUCCESSFULLY ===');
}

verifyIsolation().catch((err) => {
  console.error('ISOLATION TEST FAILED:', err);
  process.exit(1);
});
