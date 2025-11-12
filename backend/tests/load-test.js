/**
 * Load Testing Script for MyPetCare Backend
 * 
 * Uses k6 (https://k6.io) for performance testing
 * 
 * Install:
 * brew install k6 (macOS)
 * sudo snap install k6 (Linux)
 * 
 * Run:
 * k6 run load-test.js
 * 
 * Test scenarios:
 * - Smoke test: 10 VUs for 1 minute
 * - Load test: 100 VUs for 5 minutes
 * - Stress test: Ramp up to 500 VUs
 * - Spike test: Sudden 1000 VUs burst
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.mypetcare.it';
const TEST_USER_TOKEN = __ENV.TEST_USER_TOKEN || 'YOUR_TEST_TOKEN_HERE';

// Test scenarios
export const options = {
  scenarios: {
    // 1. Smoke Test - Verify system works with minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // 2. Load Test - Normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      startTime: '1m', // Start after smoke test
    },
    
    // 3. Stress Test - Find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up
        { duration: '5m', target: 200 },  // Stress level
        { duration: '2m', target: 300 },  // Higher stress
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' },
      startTime: '10m', // Start after load test
    },
    
    // 4. Spike Test - Sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 }, // Sudden spike
        { duration: '1m', target: 1000 },  // Maintain spike
        { duration: '30s', target: 0 },    // Quick ramp down
      ],
      tags: { test_type: 'spike' },
      startTime: '20m', // Start after stress test
    },
  },
  
  thresholds: {
    // HTTP errors should be less than 1%
    'http_req_failed': ['rate<0.01'],
    
    // 95% of requests should be below 500ms
    'http_req_duration': ['p(95)<500'],
    
    // 99% of requests should be below 1s
    'http_req_duration{test_type:load}': ['p(99)<1000'],
    
    // Custom error rate threshold
    'errors': ['rate<0.1'],
  },
};

// Test data
const testData = {
  pros: [],
  users: [],
  bookings: [],
};

/**
 * Setup function - runs once before all tests
 */
export function setup() {
  console.log('🚀 Starting load tests...');
  console.log(`📍 Target: ${BASE_URL}`);
  
  // Fetch initial test data
  const prosRes = http.get(`${BASE_URL}/api/pros`, {
    headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
  });
  
  if (prosRes.status === 200) {
    const data = JSON.parse(prosRes.body);
    testData.pros = data.pros || [];
    console.log(`✅ Loaded ${testData.pros.length} PROs for testing`);
  }
  
  return testData;
}

/**
 * Main test function - runs for each VU iteration
 */
export default function(data) {
  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 2: Get configuration
  const configRes = http.get(`${BASE_URL}/api/config`);
  check(configRes, {
    'config status is 200': (r) => r.status === 200,
    'config has maintenance flag': (r) => r.json('maintenanceMode') !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 3: List PROs (authenticated)
  const prosRes = http.get(`${BASE_URL}/api/pros`, {
    headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
  });
  check(prosRes, {
    'pros list status is 200': (r) => r.status === 200,
    'pros list response time < 500ms': (r) => r.timings.duration < 500,
    'pros list returns array': (r) => Array.isArray(r.json('pros')),
  }) || errorRate.add(1);
  
  sleep(2);
  
  // Test 4: Admin stats (if authenticated as admin)
  const statsRes = http.get(`${BASE_URL}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
  });
  check(statsRes, {
    'admin stats status is 200 or 403': (r) => r.status === 200 || r.status === 403,
  });
  
  sleep(1);
  
  // Test 5: Suggestions endpoint
  if (data.pros.length > 0) {
    const testUserId = 'test-user-1';
    const suggestionsRes = http.get(`${BASE_URL}/suggestions/${testUserId}?limit=5`, {
      headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
    });
    check(suggestionsRes, {
      'suggestions status is 200 or 403': (r) => r.status === 200 || r.status === 403,
      'suggestions response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }
  
  sleep(2);
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('🏁 Load tests completed');
  console.log('📊 Check results above for performance metrics');
}

/**
 * Custom scenarios for specific endpoints
 */

// Payment stress test
export function paymentStressTest() {
  const payload = JSON.stringify({
    userId: 'test-user-1',
    planId: 'price_test',
    coupon: 'FREE-1M',
  });
  
  const res = http.post(`${BASE_URL}/payments/stripe/create-session`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    },
  });
  
  check(res, {
    'payment session creation status is 200': (r) => r.status === 200,
    'payment session has URL': (r) => r.json('url') !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
}

// Booking creation stress test
export function bookingStressTest() {
  const payload = JSON.stringify({
    proId: 'pro-test-1',
    date: '2025-12-15',
    startTime: '09:00',
    price: 35,
  });
  
  const res = http.post(`${BASE_URL}/bookings`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    },
  });
  
  check(res, {
    'booking creation status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });
  
  sleep(1);
}
