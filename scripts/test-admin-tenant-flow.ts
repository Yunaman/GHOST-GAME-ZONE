import { repository } from '../src/lib/repository';

async function testAdminTenantFlow() {
  console.log('--- TESTING OWNER ADMIN & TENANT REGISTRATION FLOW ---');

  // 1. Fetch initial admin stats
  const initialStats = await repository.getAdminStats();
  console.log('[TEST 1] Initial Admin Stats:', initialStats);

  // 2. Register a new customer with initial password
  const testZoneName = `Test Zone ${Date.now()}`;
  const testUsername = `cust_${Date.now()}`;
  const testPassword = `pass_${Date.now()}`;
  console.log(`[TEST 2] Registering Customer: "${testZoneName}" (@${testUsername}) with Password "${testPassword}"...`);

  const newTenant = await repository.registerCustomerTenant(
    testZoneName,
    'Abebe Kebede',
    testUsername,
    testPassword,
    5000
  );

  console.log('[TEST 2 SUCCESS] Registered Tenant:', newTenant);

  // 3. Verify stats updated
  const updatedStats = await repository.getAdminStats();
  console.log('[TEST 3] Updated Admin Stats:', updatedStats);

  if (updatedStats.totalCustomers <= initialStats.totalCustomers) {
    throw new Error('Total customers count did not increase after registration');
  }

  // 4. Update Game Zone Name
  const updatedName = `${testZoneName} (Renamed)`;
  const renamedTenant = await repository.updateTenantGameZoneName(newTenant.id, updatedName);
  console.log('[TEST 4 SUCCESS] Renamed Tenant:', renamedTenant);

  if (renamedTenant.game_zone_name !== updatedName) {
    throw new Error('Game Zone Name was not updated');
  }

  // 5. Suspend Customer Access
  const suspendedTenant = await repository.updateTenantStatus(newTenant.id, 'SUSPENDED');
  console.log('[TEST 5 SUCCESS] Suspended Tenant:', suspendedTenant);

  if (suspendedTenant.status !== 'SUSPENDED') {
    throw new Error('Tenant status was not changed to SUSPENDED');
  }

  // 6. Reactivate Customer Access
  const reactivatedTenant = await repository.updateTenantStatus(newTenant.id, 'ACTIVE');
  console.log('[TEST 6 SUCCESS] Reactivated Tenant:', reactivatedTenant);

  if (reactivatedTenant.status !== 'ACTIVE') {
    throw new Error('Tenant status was not reactivated to ACTIVE');
  }

  console.log('----------------------------------------------------');
  console.log('ALL OWNER ADMIN TENANT TESTS PASSED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
}

testAdminTenantFlow().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
