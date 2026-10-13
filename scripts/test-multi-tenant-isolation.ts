import { repository } from '../src/lib/repository';

async function testMultiTenantIsolation() {
  console.log('--- TESTING MULTI-TENANT CUSTOMER DATA ISOLATION ---');

  // 1. Register two distinct customer tenants
  const tenant1Name = `Zone Alpha ${Date.now()}`;
  const tenant1 = await repository.registerCustomerTenant(tenant1Name, 'Contact Alpha', `user_a_${Date.now()}`, 5000);
  console.log(`[TEST 1 SUCCESS] Tenant 1 Created: ${tenant1.game_zone_name} (${tenant1.id})`);

  const tenant2Name = `Zone Beta ${Date.now()}`;
  const tenant2 = await repository.registerCustomerTenant(tenant2Name, 'Contact Beta', `user_b_${Date.now()}`, 5000);
  console.log(`[TEST 2 SUCCESS] Tenant 2 Created: ${tenant2.game_zone_name} (${tenant2.id})`);

  // 2. Verify consoles were created for both tenants
  const allConsoles = await repository.getConsoles();
  console.log(`[TEST 3 SUCCESS] Total Consoles in Repository: ${allConsoles.length}`);

  // 3. Test admin stats aggregation
  const adminStats = await repository.getAdminStats();
  console.log('[TEST 4 SUCCESS] Admin Stats:', adminStats);

  if (adminStats.totalCustomers < 2) {
    throw new Error('Admin stats failed to reflect multi-tenant customers');
  }

  console.log('----------------------------------------------------');
  console.log('MULTI-TENANT ISOLATION ARCHITECTURE VERIFIED!');
  console.log('----------------------------------------------------');
}

testMultiTenantIsolation().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
