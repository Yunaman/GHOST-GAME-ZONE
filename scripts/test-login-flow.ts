import { verifyCredentials } from '../src/lib/auth';

async function testLoginCredentials() {
  console.log('--- TESTING GHOST GAME ZONE AUTHENTICATION ---');

  // Test 1: Valid Credentials
  const validUser = 'ghostvon';
  const validPass = 'von$111';
  const isOk = await verifyCredentials(validUser, validPass);
  console.log(`[TEST 1] Username '${validUser}' + Password '${validPass}':`, isOk ? '✓ SUCCESS' : 'FAILED');

  // Test 2: Invalid Password
  const isBadPass = await verifyCredentials(validUser, 'wrongpass');
  console.log(`[TEST 2] Username '${validUser}' + Bad Password:`, !isBadPass ? '✓ REJECTED (Expected)' : 'FAILED');

  // Test 3: Invalid Username
  const isBadUser = await verifyCredentials('wronguser', validPass);
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
