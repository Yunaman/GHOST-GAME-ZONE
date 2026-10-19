import { repository } from '../src/lib/repository';

async function verifySameConsoleIdSessionStart() {
  console.log('=== VERIFYING INDEPENDENT SESSION START ON SAME CONSOLE ID ===');

  const tenantA = await repository.registerCustomerTenant('Zone A', 'Contact A', `usera_${Date.now()}`, 'p1', 5000);
  const tenantB = await repository.registerCustomerTenant('Zone B', 'Contact B', `userb_${Date.now()}`, 'p2', 5000);

  const consolesA = await repository.getConsoles(tenantA.id);
  const consolesB = await repository.getConsoles(tenantB.id);

  // Start active session on Tenant A Console 1
  const sessA = await repository.startSession(consolesA[0].id, 'Staff A', undefined, tenantA.id);
  console.log(`[TENANT A] Active Session Started: ${sessA.id} on console ${consolesA[0].id}`);

  // Now Tenant B attempts to start session on Tenant B Console 1 (which might share same console name or index)
  const sessB = await repository.startSession(consolesB[0].id, 'Staff B', undefined, tenantB.id);
  console.log(`[TENANT B] Active Session Started Successfully: ${sessB.id} on console ${consolesB[0].id}`);

  console.log('=== TEST PASSED: Tenant B was NOT blocked by Tenant A active session! ===');
}

verifySameConsoleIdSessionStart().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
