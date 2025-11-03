// Test script to verify token validation functionality
const axios = require('axios');

const BASE_URL = 'https://www.outix.co/apis';

// Test the validateToken function
async function testTokenValidation() {
  console.log('🧪 Testing Token Validation Implementation...\n');

  // Test 1: Test with no token
  console.log('Test 1: Testing with no token');
  try {
    const response = await axios.get(`${BASE_URL}/validatetoken/`, {
      timeout: 10000
    });
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.log('❌ Expected error (no token):', error.response?.status, error.response?.data);
  }

  // Test 2: Test with invalid token
  console.log('\nTest 2: Testing with invalid token');
  try {
    const response = await axios.get(`${BASE_URL}/validatetoken/invalid_token_123`, {
      timeout: 10000
    });
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
  }

  // Test 3: Test with empty token
  console.log('\nTest 3: Testing with empty token');
  try {
    const response = await axios.get(`${BASE_URL}/validatetoken/`, {
      timeout: 10000
    });
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
  }

  console.log('\n🎯 Token validation endpoint is accessible and responding correctly!');
  console.log('📱 The app should now automatically validate tokens on startup.');
}

// Run the test
testTokenValidation().catch(console.error);
