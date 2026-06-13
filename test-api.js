#!/usr/bin/env node

/**
 * API Test Script
 * Test the Bolna Call Tracker API endpoints
 */

const API_BASE = 'http://localhost:5000/api';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(type, message) {
  const prefix = {
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    info: `${colors.blue}ℹ️${colors.reset}`,
    warn: `${colors.yellow}⚠️${colors.reset}`
  };
  console.log(`${prefix[type]} ${message}`);
}

async function test(name, fn) {
  console.log(`\n${colors.blue}🧪 Testing: ${name}${colors.reset}`);
  try {
    const result = await fn();
    if (result.ok) {
      log('success', `${name} passed`);
      return result;
    } else {
      log('error', `${name} failed: ${result.statusText}`);
      return null;
    }
  } catch (error) {
    log('error', `${name} error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}Bolna Call Tracker - API Test Suite${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);

  // Test 1: Health Check
  await test('Health Check', async () => {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log(`   Status: ${data.status}`);
    console.log(`   MongoDB: ${data.mongoConnection === 'connected' ? '✅ Connected' : '⚠️ Disconnected'}`);
    return response;
  });

  // Test 2: Get Customers (Empty)
  await test('Get All Customers', async () => {
    const response = await fetch(`${API_BASE}/customers`);
    const data = await response.json();
    console.log(`   Total customers: ${data.data.length}`);
    return response;
  });

  // Test 3: Create Customer
  let customerId = null;
  const testCustomer = {
    name: 'Test Customer',
    phoneNumber: '+1234567890',
    email: 'test@example.com',
    language: 'en',
    notes: 'Test customer for API testing'
  };

  const createResponse = await test('Create Customer', async () => {
    const response = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCustomer)
    });

    if (response.ok) {
      const data = await response.json();
      customerId = data.data._id;
      console.log(`   Name: ${data.data.name}`);
      console.log(`   Phone: ${data.data.phoneNumber}`);
      console.log(`   ID: ${data.data._id}`);
    }
    return response;
  });

  // Test 4: Get Created Customer
  if (customerId) {
    await test('Get Customer Details', async () => {
      const response = await fetch(`${API_BASE}/customers/${customerId}`);
      const data = await response.json();
      console.log(`   Name: ${data.data.name}`);
      console.log(`   Status: ${data.data.status}`);
      return response;
    });
  }

  // Test 5: Update Customer
  if (customerId) {
    await test('Update Customer', async () => {
      const response = await fetch(`${API_BASE}/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Updated notes'
        })
      });
      return response;
    });
  }

  // Test 6: Get All Calls
  await test('Get All Calls', async () => {
    const response = await fetch(`${API_BASE}/calls`);
    const data = await response.json();
    console.log(`   Total calls: ${data.data.length}`);
    return response;
  });

  // Test 7: Get Call Statistics
  await test('Get Call Statistics', async () => {
    const response = await fetch(`${API_BASE}/calls/stats/summary`);
    const data = await response.json();
    console.log(`   Total: ${data.data.totalCalls}`);
    console.log(`   Completed: ${data.data.completedCalls}`);
    console.log(`   Failed: ${data.data.failedCalls}`);
    console.log(`   Success Rate: ${data.data.successRate}`);
    return response;
  });

  // Test 8: Trigger Call (Will fail without valid Bolna API key)
  if (customerId) {
    await test('Trigger Call', async () => {
      const response = await fetch(`${API_BASE}/calls/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          agentId: 'agent_test_123',
          purpose: 'test',
          language: 'en'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.log(`   Expected error (no valid Bolna key): ${data.error}`);
      }
      return response;
    });
  }

  // Summary
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.green}✅ API Tests Complete!${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log('\nNext steps:');
  console.log('1. Add your Bolna API Key to .env file');
  console.log('2. Create a Bolna Agent on the platform');
  console.log('3. Use the agent ID to trigger real calls');
  console.log('4. Open http://localhost:5000 to use the dashboard');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:5000/api/health', {
      timeout: 5000
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Main
(async () => {
  console.log('Checking server connection...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    log('error', 'Server is not running!');
    log('info', 'Start the server with: npm run dev');
    process.exit(1);
  }

  await runTests();
  process.exit(0);
})();
