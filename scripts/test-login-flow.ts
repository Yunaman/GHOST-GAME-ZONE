import { verifyCredentials } from '../src/lib/auth';

async function testLoginCredentials() {
  console.log('--- TESTING GHOST GAME CENTER AUTHENTICATION ---');

  // Test 1: Valid Product Owner Credentials (yunaonice / yuna$1)
  const validUser = 'yunaonice';
  const validPass = 'yuna$1';
  const res1 = await verifyCredentials(validUser, validPass);
  const isOk = res1.success;
  console.log(`[TEST 1] Username '${validUser}' + Password '${validPass}':`, isOk ? '✓ SUCCESS' : 'FAILED');

  // Test 2: Invalid Password for Product Owner
  const res2 = await verifyCredentials(validUser, 'wrongpass');
  const isBadPass = res2.success;
  console.log(`[TEST 2] Username '${validUser}' + Bad Password:`, !isBadPass ? '✓ REJECTED (Expected)' : 'FAILED');

  // Test 3: Invalid Username
  const res3 = await verifyCredentials('nonexistent_user', validPass);
  const isBadUser = res3.success;
  console.log(`[TEST 3] Bad Username + Password '${validPass}':`, !isBadUser ? '✓ REJECTED (Expected)' : 'FAILED');

  if (isOk && !isBadPass && !isBadUser) {
    console.log('----------------------------------------------------');
    console.log('ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
  } else {
    throw new Error('Authentication tests failed!');
  }
}

testLoginCredentials().catch((err) => {
  console.error(err);
  process.exit(1);
});
