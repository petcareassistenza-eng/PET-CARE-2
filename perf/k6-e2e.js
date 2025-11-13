/**
 * k6 End-to-End Performance Test
 * 
 * Tests critical API endpoints under load to ensure:
 * - p95 response time < 800ms
 * - 99%+ success rate
 * - <1% error rate
 * 
 * Usage:
 *   BASE_URL=https://staging-api.example.com k6 run k6-e2e.js
 * 
 * Results:
 *   - Passes if all thresholds are met
 *   - Fails CI/CD pipeline if thresholds violated
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  // Scenario: Ramp-up load test
  stages: [
    { duration: '10s', target: 5 },   // Warm-up: ramp to 5 users
    { duration: '30s', target: 20 },  // Load test: ramp to 20 concurrent users
    { duration: '10s', target: 5 },   // Ramp-down: cool off to 5 users
    { duration: '10s', target: 0 },   // Stop: ramp down to 0
  ],

  // Performance thresholds (fail if not met)
  thresholds: {
    // Response time constraints
    'http_req_duration': ['p(95)<800'],      // 95th percentile < 800ms
    'http_req_duration{endpoint:pros}': ['p(95)<500'],  // PRO list fast
    'http_req_duration{endpoint:health}': ['p(95)<100'], // Health ultra-fast
    
    // Success rate constraints
    'checks': ['rate>0.99'],                 // 99%+ checks pass
    'errors': ['rate<0.01'],                 // <1% errors
    'http_req_failed': ['rate<0.01'],        // <1% failed requests
    
    // Request count tracking
    'http_reqs': ['count>100'],              // At least 100 requests total
  },

  // Test metadata
  tags: {
    test_type: 'e2e',
    environment: __ENV.STAGE || 'staging',
  },
}

// ============================================================================
// Custom Metrics
// ============================================================================

const responseTimeTrend = new Trend('response_time_custom')
const errorRate = new Rate('errors')
const cacheHitRate = new Rate('cache_hits')
const requestCounter = new Counter('total_requests')

// ============================================================================
// Test Configuration from Environment
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'

console.log(`🎯 Target URL: ${BASE_URL}`)
console.log(`🔥 Load test: 20 concurrent users for 1 minute`)
console.log(`✅ Thresholds: p95<800ms, >99% success, <1% errors`)

// ============================================================================
// Test Scenarios
// ============================================================================

/**
 * Main test function - executed by each virtual user
 */
export default function () {
  // Test Suite: Core API Endpoints
  const endpoints = [
    {
      name: 'health',
      url: `${BASE_URL}/healthz`,
      expectedStatus: 200,
      tags: { endpoint: 'health' },
    },
    {
      name: 'readiness',
      url: `${BASE_URL}/readiness`,
      expectedStatus: 200,
      tags: { endpoint: 'readiness' },
    },
    {
      name: 'version',
      url: `${BASE_URL}/version`,
      expectedStatus: 200,
      tags: { endpoint: 'version' },
    },
    {
      name: 'pros_list',
      url: `${BASE_URL}/api/pros?limit=10`,
      expectedStatus: 200,
      tags: { endpoint: 'pros' },
    },
    {
      name: 'pros_category',
      url: `${BASE_URL}/api/pros?category=veterinario&limit=10`,
      expectedStatus: 200,
      tags: { endpoint: 'pros' },
    },
    {
      name: 'pros_geosearch',
      url: `${BASE_URL}/api/pros?nearLat=45.4642&nearLng=9.1900&radiusKm=10&limit=10`,
      expectedStatus: 200,
      tags: { endpoint: 'pros' },
    },
  ]

  // Execute requests for all endpoints
  for (const endpoint of endpoints) {
    requestCounter.add(1)
    
    const response = http.get(endpoint.url, { tags: endpoint.tags })
    
    // Track response time
    responseTimeTrend.add(response.timings.duration, endpoint.tags)

    // Validation checks
    const checksPass = check(
      response,
      {
        [`${endpoint.name}: status ${endpoint.expectedStatus}`]: (r) =>
          r.status === endpoint.expectedStatus,
        [`${endpoint.name}: has ok=true`]: (r) => {
          try {
            return r.json('ok') === true
          } catch {
            return false
          }
        },
        [`${endpoint.name}: response time < 1000ms`]: (r) =>
          r.timings.duration < 1000,
      },
      endpoint.tags,
    )

    // Track errors
    if (!checksPass) {
      errorRate.add(1, endpoint.tags)
    } else {
      errorRate.add(0, endpoint.tags)
    }

    // Check for cache hit (304 Not Modified)
    if (response.status === 304) {
      cacheHitRate.add(1, endpoint.tags)
    } else {
      cacheHitRate.add(0, endpoint.tags)
    }

    // Brief pause between requests (realistic user behavior)
    sleep(0.5)
  }

  // Longer pause between full test iterations
  sleep(2)
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Setup - runs once before test starts
 */
export function setup() {
  console.log('🚀 Starting performance test...')
  
  // Verify API is reachable
  const healthCheck = http.get(`${BASE_URL}/healthz`)
  if (healthCheck.status !== 200) {
    console.error(`❌ Health check failed: ${healthCheck.status}`)
    throw new Error('API health check failed - aborting test')
  }
  
  console.log('✅ API health check passed')
  
  return { startTime: new Date().toISOString() }
}

/**
 * Teardown - runs once after test completes
 */
export function teardown(data) {
  console.log('🏁 Performance test completed')
  console.log(`Started: ${data.startTime}`)
  console.log(`Finished: ${new Date().toISOString()}`)
}

// ============================================================================
// Summary Handler
// ============================================================================

/**
 * Handle end-of-test summary
 */
export function handleSummary(data) {
  const passed = 
    data.metrics.checks.values.rate >= 0.99 &&
    data.metrics.errors.values.rate < 0.01 &&
    data.metrics.http_req_duration.values['p(95)'] < 800

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 PERFORMANCE TEST RESULTS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Requests: ${data.metrics.http_reqs.values.count}`)
  console.log(`Success Rate: ${(data.metrics.checks.values.rate * 100).toFixed(2)}%`)
  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`)
  console.log(`p95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`)
  console.log(`p99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`)
  console.log(`Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Return default text summary
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  }
}

// Helper: Generate text summary (simplified)
function textSummary(data, opts = {}) {
  const indent = opts.indent || ''
  const enableColors = opts.enableColors || false
  
  let output = ''
  output += `${indent}checks.........................: ${(data.metrics.checks.values.rate * 100).toFixed(2)}% ✓\n`
  output += `${indent}errors.........................: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`
  output += `${indent}http_req_duration..............: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms p(95)=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`
  output += `${indent}http_reqs......................: ${data.metrics.http_reqs.values.count}\n`
  
  return output
}
