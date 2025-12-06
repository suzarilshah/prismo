/**
 * Comprehensive Test Suite for Prismo Appwrite Functions
 * 
 * Run with: node appwrite-functions/test-functions.js
 * 
 * Tests:
 * 1. neon-sync function - All endpoints
 * 2. daily-reminder-check function - Scheduled task simulation
 */

require('dotenv').config();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || 'prismo';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logTest(name, passed, details = '') {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`  ${status} ${name}`);
  if (details) {
    console.log(`    ${colors.dim}${details}${colors.reset}`);
  }
}

/**
 * Execute an Appwrite function
 */
async function executeFunction(functionId, path = '/', method = 'GET', body = null) {
  const url = `${APPWRITE_ENDPOINT}/functions/${functionId}/executions`;
  
  const payload = {
    path,
    method,
    async: false,
  };
  
  if (body) {
    payload.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    
    // Parse the response body
    let responseBody = null;
    try {
      responseBody = JSON.parse(result.responseBody || '{}');
    } catch {
      responseBody = result.responseBody;
    }
    
    return {
      success: result.status === 'completed',
      statusCode: result.responseStatusCode,
      body: responseBody,
      duration: result.duration,
      logs: result.logs,
      errors: result.errors,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test neon-sync function
 */
async function testNeonSyncFunction() {
  logSection('Testing: neon-sync Function');
  
  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      validate: (result) => result.body?.status === 'ok',
    },
    {
      name: 'Root Endpoint',
      path: '/',
      validate: (result) => result.body?.status === 'ok',
    },
    {
      name: 'Check Subscription Reminders',
      path: '/check-subscriptions',
      validate: (result) => result.body?.success === true && Array.isArray(result.body?.data),
    },
    {
      name: 'Check Commitment Reminders',
      path: '/check-commitments',
      validate: (result) => result.body?.success === true && Array.isArray(result.body?.data),
    },
    {
      name: 'Check Tax Reminders',
      path: '/check-tax-reminders',
      validate: (result) => result.body?.success === true,
    },
    {
      name: 'Sync Notifications',
      path: '/sync-notifications',
      validate: (result) => result.body?.success === true && result.body?.summary !== undefined,
    },
    {
      name: '404 for Unknown Path',
      path: '/unknown-endpoint',
      validate: (result) => result.body?.error === 'Not found',
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await executeFunction('neon-sync', test.path);
      const testPassed = result.success && test.validate(result);
      
      logTest(test.name, testPassed, 
        testPassed ? `Response: ${JSON.stringify(result.body).slice(0, 100)}...` : `Error: ${result.error || JSON.stringify(result.body)}`
      );
      
      if (testPassed) passed++;
      else failed++;
    } catch (error) {
      logTest(test.name, false, error.message);
      failed++;
    }
  }
  
  return { passed, failed };
}

/**
 * Test daily-reminder-check function
 */
async function testDailyReminderCheckFunction() {
  logSection('Testing: daily-reminder-check Function');
  
  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      validate: (result) => result.body?.status === 'ok' && result.body?.schedule !== undefined,
    },
    {
      name: 'Test Mode (Dry Run)',
      path: '/test',
      validate: (result) => result.body?.success === true && result.body?.mode === 'test',
    },
    {
      name: 'Main Execution',
      path: '/',
      validate: (result) => result.body?.success === true && result.body?.checks !== undefined,
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await executeFunction('daily-reminder-check', test.path);
      const testPassed = result.success && test.validate(result);
      
      logTest(test.name, testPassed,
        testPassed 
          ? `Duration: ${result.duration}ms | Response: ${JSON.stringify(result.body).slice(0, 100)}...`
          : `Error: ${result.error || JSON.stringify(result.body)}`
      );
      
      if (testPassed) passed++;
      else failed++;
    } catch (error) {
      logTest(test.name, false, error.message);
      failed++;
    }
  }
  
  return { passed, failed };
}

/**
 * Test scheduled trigger simulation
 */
async function testScheduledTrigger() {
  logSection('Testing: Scheduled Trigger Simulation');
  
  // The scheduled trigger sets x-appwrite-trigger header
  // We can't fully simulate this, but we can test the function responds correctly
  
  const result = await executeFunction('daily-reminder-check', '/');
  
  const testPassed = result.success && result.body?.success === true;
  
  logTest('Scheduled Execution Simulation', testPassed,
    testPassed 
      ? `Checks: ${JSON.stringify(result.body?.checks)} | Notifications: ${JSON.stringify(result.body?.notifications)}`
      : `Error: ${result.error || JSON.stringify(result.body)}`
  );
  
  return { passed: testPassed ? 1 : 0, failed: testPassed ? 0 : 1 };
}

/**
 * Test environment variables
 */
async function testEnvironment() {
  logSection('Testing: Environment Configuration');
  
  const envVars = [
    { name: 'APPWRITE_ENDPOINT', value: APPWRITE_ENDPOINT, required: true },
    { name: 'APPWRITE_PROJECT_ID', value: APPWRITE_PROJECT_ID, required: true },
    { name: 'APPWRITE_API_KEY', value: APPWRITE_API_KEY ? '[SET]' : undefined, required: true },
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL ? '[SET]' : undefined, required: true },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const env of envVars) {
    const exists = env.value !== undefined;
    logTest(`${env.name}`, exists, exists ? env.value.slice(0, 50) + '...' : 'NOT SET');
    
    if (exists) passed++;
    else if (env.required) failed++;
  }
  
  return { passed, failed };
}

/**
 * Main test runner
 */
async function runTests() {
  console.clear();
  log('\n🧪 PRISMO APPWRITE FUNCTIONS TEST SUITE\n', 'cyan');
  log(`Endpoint: ${APPWRITE_ENDPOINT}`, 'dim');
  log(`Project: ${APPWRITE_PROJECT_ID}`, 'dim');
  log(`Time: ${new Date().toISOString()}`, 'dim');
  
  const results = {
    environment: { passed: 0, failed: 0 },
    neonSync: { passed: 0, failed: 0 },
    dailyReminder: { passed: 0, failed: 0 },
    scheduled: { passed: 0, failed: 0 },
  };
  
  // Test environment first
  results.environment = await testEnvironment();
  
  if (results.environment.failed > 0) {
    log('\n⚠️  Environment configuration incomplete. Fix before testing functions.', 'yellow');
    return;
  }
  
  // Test functions
  try {
    results.neonSync = await testNeonSyncFunction();
  } catch (error) {
    log(`\n⚠️  neon-sync tests failed: ${error.message}`, 'red');
    log('   Make sure the function is deployed first.', 'dim');
  }
  
  try {
    results.dailyReminder = await testDailyReminderCheckFunction();
  } catch (error) {
    log(`\n⚠️  daily-reminder-check tests failed: ${error.message}`, 'red');
    log('   Make sure the function is deployed first.', 'dim');
  }
  
  try {
    results.scheduled = await testScheduledTrigger();
  } catch (error) {
    log(`\n⚠️  Scheduled trigger test failed: ${error.message}`, 'red');
  }
  
  // Summary
  logSection('Test Summary');
  
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  
  console.log(`  Environment:      ${results.environment.passed} passed, ${results.environment.failed} failed`);
  console.log(`  neon-sync:        ${results.neonSync.passed} passed, ${results.neonSync.failed} failed`);
  console.log(`  daily-reminder:   ${results.dailyReminder.passed} passed, ${results.dailyReminder.failed} failed`);
  console.log(`  Scheduled:        ${results.scheduled.passed} passed, ${results.scheduled.failed} failed`);
  console.log('');
  
  if (totalFailed === 0) {
    log(`  ✅ ALL ${totalPassed} TESTS PASSED`, 'green');
  } else {
    log(`  ❌ ${totalFailed} TESTS FAILED (${totalPassed} passed)`, 'red');
  }
  
  console.log('\n');
  
  return totalFailed === 0;
}

// Run tests
runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
