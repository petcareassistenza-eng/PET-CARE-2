#!/bin/bash

###############################################################################
# API Smoke Test Script - My Pet Care Production
# 
# Tests all critical API endpoints to verify production deployment.
# Run this script after deploying to production or staging environment.
#
# Usage:
#   ./api_smoke_test.sh https://api.mypetcareapp.org
#   ./api_smoke_test.sh https://staging-api.mypetcareapp.org
#
# Requirements:
#   - curl
#   - jq (JSON processor)
#
# Install jq: sudo apt-get install jq (Linux) or brew install jq (macOS)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TEST_PRO_ID="${TEST_PRO_ID:-PRO_ID_DI_TEST}"
TEST_DATE="2025-11-20"
TEST_COUPON="FREE-3M"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
}

print_success() {
  echo -e "${GREEN}✅ PASS${NC} - $1"
  ((TESTS_PASSED++))
}

print_failure() {
  echo -e "${RED}❌ FAIL${NC} - $1"
  ((TESTS_FAILED++))
}

print_info() {
  echo -e "${BLUE}ℹ️  INFO${NC} - $1"
}

# Test function wrapper
run_test() {
  local test_name="$1"
  local command="$2"
  local expected_status="${3:-200}"
  
  print_test "$test_name"
  
  local response
  local http_status
  
  # Execute curl and capture response + status code
  response=$(eval "$command" 2>&1) || true
  http_status=$(echo "$response" | tail -n1)
  
  if [[ "$http_status" == "$expected_status" ]]; then
    print_success "$test_name (HTTP $http_status)"
    return 0
  else
    print_failure "$test_name (Expected: $expected_status, Got: $http_status)"
    echo "$response" | head -n -1  # Print response body (excluding status code)
    return 1
  fi
}

###############################################################################
# START TESTS
###############################################################################

print_header "🚀 My Pet Care API Smoke Test"
echo "Target: $BASE_URL"
echo "PRO ID: $TEST_PRO_ID"
echo "Date: $(date)"
echo ""

###############################################################################
# 1. Health Check Endpoints
###############################################################################

print_header "1️⃣  Health Check Endpoints"

print_test "GET /healthz"
response=$(curl -fsSL -w "\n%{http_code}" "$BASE_URL/healthz" 2>&1)
http_status=$(echo "$response" | tail -n1)
if [[ "$http_status" == "200" ]]; then
  print_success "Health check (HTTP $http_status)"
  ((TESTS_PASSED++))
else
  print_failure "Health check (HTTP $http_status)"
  ((TESTS_FAILED++))
fi

print_test "GET /version"
response=$(curl -fsSL -w "\n%{http_code}" "$BASE_URL/version" 2>&1)
http_status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)
if [[ "$http_status" == "200" ]]; then
  version=$(echo "$body" | jq -r '.version' 2>/dev/null || echo "unknown")
  print_success "Version check (HTTP $http_status) - Version: $version"
  ((TESTS_PASSED++))
else
  print_failure "Version check (HTTP $http_status)"
  ((TESTS_FAILED++))
fi

###############################################################################
# 2. Availability API
###############################################################################

print_header "2️⃣  Availability API"

print_test "GET /api/pros/$TEST_PRO_ID/availability"
response=$(curl -fsSL -w "\n%{http_code}" "$BASE_URL/api/pros/$TEST_PRO_ID/availability?date=$TEST_DATE&stepMin=30" 2>&1)
http_status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [[ "$http_status" == "200" ]]; then
  slots_count=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")
  print_success "Availability check (HTTP $http_status) - Slots: $slots_count"
  ((TESTS_PASSED++))
  
  # Save first slot for lock test
  FIRST_SLOT_START=$(echo "$body" | jq -r '.data[0].start' 2>/dev/null || echo "")
  FIRST_SLOT_END=$(echo "$body" | jq -r '.data[0].end' 2>/dev/null || echo "")
  print_info "First slot: $FIRST_SLOT_START → $FIRST_SLOT_END"
else
  print_failure "Availability check (HTTP $http_status)"
  ((TESTS_FAILED++))
fi

###############################################################################
# 3. Lock API
###############################################################################

print_header "3️⃣  Lock API (5-minute TTL)"

if [[ -n "$FIRST_SLOT_START" && -n "$FIRST_SLOT_END" ]]; then
  print_test "POST /api/pros/$TEST_PRO_ID/locks"
  
  lock_payload=$(cat <<EOF
{
  "date": "$TEST_DATE",
  "start": "$FIRST_SLOT_START",
  "end": "$FIRST_SLOT_END",
  "ttlSec": 300
}
EOF
)
  
  response=$(curl -fsSL -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$lock_payload" \
    "$BASE_URL/api/pros/$TEST_PRO_ID/locks" 2>&1)
  
  http_status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n -1)
  
  if [[ "$http_status" == "200" || "$http_status" == "201" ]]; then
    lock_id=$(echo "$body" | jq -r '.lockId' 2>/dev/null || echo "unknown")
    print_success "Lock creation (HTTP $http_status) - Lock ID: $lock_id"
    ((TESTS_PASSED++))
    LOCK_ID="$lock_id"
  else
    print_failure "Lock creation (HTTP $http_status)"
    echo "$body"
    ((TESTS_FAILED++))
  fi
else
  print_info "Skipping lock test (no available slots found)"
fi

###############################################################################
# 4. Booking API
###############################################################################

print_header "4️⃣  Booking API"

print_test "POST /api/bookings"

booking_payload=$(cat <<EOF
{
  "proId": "$TEST_PRO_ID",
  "date": "${FIRST_SLOT_START:-2025-11-20T09:00:00.000Z}",
  "serviceId": "visit",
  "notes": "Smoke test booking - $(date +%s)",
  "userName": "Test User",
  "userEmail": "test@mypetcareapp.org"
}
EOF
)

response=$(curl -fsSL -X POST -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$booking_payload" \
  "$BASE_URL/api/bookings" 2>&1)

http_status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [[ "$http_status" == "200" || "$http_status" == "201" ]]; then
  booking_id=$(echo "$body" | jq -r '.id' 2>/dev/null || echo "unknown")
  print_success "Booking creation (HTTP $http_status) - Booking ID: $booking_id"
  ((TESTS_PASSED++))
  BOOKING_ID="$booking_id"
else
  print_failure "Booking creation (HTTP $http_status)"
  echo "$body"
  ((TESTS_FAILED++))
fi

# Test GET booking (if created)
if [[ -n "$BOOKING_ID" ]]; then
  print_test "GET /api/bookings"
  response=$(curl -fsSL -w "\n%{http_code}" "$BASE_URL/api/bookings" 2>&1)
  http_status=$(echo "$response" | tail -n1)
  
  if [[ "$http_status" == "200" ]]; then
    print_success "Get bookings (HTTP $http_status)"
    ((TESTS_PASSED++))
  else
    print_failure "Get bookings (HTTP $http_status)"
    ((TESTS_FAILED++))
  fi
fi

###############################################################################
# 5. Coupon API
###############################################################################

print_header "5️⃣  Coupon API"

print_test "GET /api/coupons/$TEST_COUPON"
response=$(curl -fsSL -w "\n%{http_code}" "$BASE_URL/api/coupons/$TEST_COUPON" 2>&1)
http_status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [[ "$http_status" == "200" ]]; then
  discount=$(echo "$body" | jq -r '.discount' 2>/dev/null || echo "unknown")
  duration=$(echo "$body" | jq -r '.durationMonths' 2>/dev/null || echo "unknown")
  print_success "Coupon validation (HTTP $http_status) - Discount: $discount, Duration: $duration months"
  ((TESTS_PASSED++))
else
  print_failure "Coupon validation (HTTP $http_status)"
  ((TESTS_FAILED++))
fi

###############################################################################
# 6. PRO API (Optional - if public endpoint exists)
###############################################################################

print_header "6️⃣  PRO API"

print_test "GET /api/pros/$TEST_PRO_ID"
response=$(curl -fsSL -w "\n%{http_code}" "$BASE_URL/api/pros/$TEST_PRO_ID" 2>&1)
http_status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [[ "$http_status" == "200" ]]; then
  pro_name=$(echo "$body" | jq -r '.name' 2>/dev/null || echo "unknown")
  pro_status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "unknown")
  print_success "PRO details (HTTP $http_status) - Name: $pro_name, Status: $pro_status"
  ((TESTS_PASSED++))
else
  print_failure "PRO details (HTTP $http_status)"
  ((TESTS_FAILED++))
fi

###############################################################################
# RESULTS SUMMARY
###############################################################################

print_header "📊 Test Results Summary"

total_tests=$((TESTS_PASSED + TESTS_FAILED))
pass_rate=0
if [[ $total_tests -gt 0 ]]; then
  pass_rate=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED / $total_tests) * 100}")
fi

echo -e "Total Tests:  $total_tests"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo -e "Pass Rate:    ${pass_rate}%"

if [[ $TESTS_FAILED -eq 0 ]]; then
  echo -e "\n${GREEN}🎉 All tests passed! Production API is healthy.${NC}\n"
  exit 0
else
  echo -e "\n${RED}⚠️  Some tests failed. Please review the errors above.${NC}\n"
  exit 1
fi
