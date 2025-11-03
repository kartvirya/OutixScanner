// Test script to verify authentication flow
const { validateToken, restoreSession, isAuthenticatedSync } = require('./services/api.ts');

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow...\n');

  // Test 1: Check initial authentication state
  console.log('Test 1: Initial authentication state');
  const initialAuth = isAuthenticatedSync();
  console.log('✅ isAuthenticatedSync():', initialAuth);

  // Test 2: Test token validation with invalid token
  console.log('\nTest 2: Token validation with invalid token');
  try {
    const validation = await validateToken('invalid_token_123');
    console.log('✅ validateToken result:', validation);
  } catch (error) {
    console.log('❌ validateToken error:', error.message);
  }

  // Test 3: Test session restoration (should fail with no valid token)
  console.log('\nTest 3: Session restoration');
  try {
    const restored = await restoreSession();
    console.log('✅ restoreSession result:', restored);
  } catch (error) {
    console.log('❌ restoreSession error:', error.message);
  }

  console.log('\n🎯 Authentication flow tests completed!');
  console.log('📱 Check the app logs to see the authentication flow in action.');
}

// Run the test
testAuthFlow().catch(console.error);
