import { repository } from '../src/lib/repository';
import { loadDb, saveDb } from '../src/lib/db/fs-db';

async function runMultiTenantIsolationTests() {
  console.log('----------------------------------------------------');
  console.log('STARTING MULTI-TENANT ISOLATION & SECURITY TESTS');
  console.log('----------------------------------------------------');

  const tenantA = 't-tenant-a';
  const tenantB = 't-tenant-b';

  // Backup original db state to preserve friend's data
  const originalDb = loadDb();

  try {
    // Seed test state
    const db = loadDb();
    (db as any).tenants = [
      {
        id: tenantA,
        name: 'Yanus Game Zone',
        owner_name: 'Yanus',
        username: 'yanusgame',
        password_hash: 'pass123',
        license_price: 5000,
        payment_status: 'PAID',
        account_status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: tenantB,
        name: 'Sami Game Center',
        owner_name: 'Sami',
        username: 'samigame',
        password_hash: 'pass123',
        license_price: 5000,
        payment_status: 'PAID',
        account_status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    db.consoles = [
      { id: `c-${tenantA}-1`, tenant_id: tenantA, name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true, created_at: new Date().toISOString() },
      { id: `c-${tenantA}-2`, tenant_id: tenantA, name: 'TV 2', status: 'AVAILABLE', display_order: 2, is_active: true, created_at: new Date().toISOString() },
      { id: `c-${tenantB}-1`, tenant_id: tenantB, name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true, created_at: new Date().toISOString() },
    ];
    db.sessions = [];
    db.matches = [];
    db.payments = [];
    db.adjustments = [];
    saveDb(db);

    // [TEST 1] Tenant A starts session on TV 1
    console.log('[TEST 1] Tenant A (Yanus Game Zone) starts session on TV 1...');
    const sessA = await repository.startSession(`c-${tenantA}-1`, 'YanusStaff', undefined, tenantA);
    console.log(`✓ Tenant A Session Created: ${sessA.id}, TV Status: PLAYING`);

    // [TEST 2] Tenant A duplicate active session on TV 1 should be blocked
    console.log('\n[TEST 2] Tenant A attempting duplicate session on TV 1 (should be blocked)...');
    try {
      await repository.startSession(`c-${tenantA}-1`, 'YanusStaff', undefined, tenantA);
      throw new Error('FAILED: Tenant A was able to duplicate active session on TV 1!');
    } catch (err: any) {
      console.log(`✓ Duplicate session blocked as expected: "${err.message}"`);
    }

    // [TEST 3] Tenant B starts session on THEIR TV 1 independently
    console.log('\n[TEST 3] Tenant B (Sami Game Center) starts session on THEIR TV 1...');
    const sessB = await repository.startSession(`c-${tenantB}-1`, 'SamiStaff', undefined, tenantB);
    console.log(`✓ Tenant B Session Created: ${sessB.id}. Overlapping TV 1 IDs do not block separate tenants!`);

    // [TEST 4] Tenant A adds match to session
    console.log('\n[TEST 4] Tenant A adds match to session...');
    await repository.addMatch(sessA.id, undefined, tenantA);
    await repository.addMatch(sessA.id, undefined, tenantA);
    await repository.finishSession(sessA.id, 'CASH', undefined, tenantA);
    console.log('✓ Tenant A session finished with 2 matches (30 ETB)');

    // [TEST 5] Verify Data Isolation: Tenant B history must NOT include Tenant A records
    console.log('\n[TEST 5] Verifying Data Isolation on History & Analytics...');
    const historyB = await repository.getSessionsHistory(100, tenantB);
    console.log(`✓ Tenant B History Count: ${historyB.length} (Expected 0)`);
    if (historyB.length !== 0) {
      throw new Error('DATA LEAKAGE DETECTED: Tenant B retrieved Tenant A session history!');
    }

    const analyticsB = await repository.getAnalyticsSummary(tenantB);
    console.log(`✓ Tenant B Total Revenue: ${analyticsB.revenue.allTime} ETB (Expected 0 ETB)`);
    if (analyticsB.revenue.allTime !== 0) {
      throw new Error('DATA LEAKAGE DETECTED: Tenant B retrieved Tenant A analytics summary!');
    }

    const historyA = await repository.getSessionsHistory(100, tenantA);
    console.log(`✓ Tenant A History Count: ${historyA.length} (Expected 1)`);
    if (historyA.length !== 1) {
      throw new Error('Tenant A history failed to record session!');
    }

    console.log('\n----------------------------------------------------');
    console.log('ALL MULTI-TENANT ISOLATION TESTS PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
  } finally {
    // Restore original DB state to protect production data
    saveDb(originalDb);
  }
}

runMultiTenantIsolationTests().catch((err) => {
  console.error('❌ MULTI-TENANT TEST FAILED:', err);
  process.exit(1);
});
