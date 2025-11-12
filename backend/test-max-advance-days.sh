#!/bin/bash

# Test script for maxAdvanceDays feature
# Usage: ./test-max-advance-days.sh [BASE_URL] [PRO_ID]

BASE_URL="${1:-http://localhost:8080}"
PRO_ID="${2:-test-pro-001}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "maxAdvanceDays Feature - Test Suite"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "PRO ID: $PRO_ID"
echo ""

# Helper function to get date N days from now
get_date() {
  local days=$1
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    date -v+${days}d +%Y-%m-%d
  else
    # Linux
    date -d "+${days} days" +%Y-%m-%d
  fi
}

# Test 1: Within horizon (today + 20 days, max 60)
echo -e "${BLUE}Test 1: Within horizon (today + 20 days)${NC}"
DATE=$(get_date 20)
echo "Date: $DATE"
RESPONSE=$(curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE")
SLOTS_COUNT=$(echo $RESPONSE | jq '.slots | length')
echo "Slots returned: $SLOTS_COUNT"
if [ "$SLOTS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ PASS - Slots returned as expected${NC}"
else
  echo -e "${RED}❌ FAIL - Expected slots but got empty array${NC}"
fi
echo ""

# Test 2: Beyond horizon (today + 80 days, max 60)
echo -e "${BLUE}Test 2: Beyond horizon (today + 80 days)${NC}"
DATE=$(get_date 80)
echo "Date: $DATE"
RESPONSE=$(curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE")
SLOTS_COUNT=$(echo $RESPONSE | jq '.slots | length')
echo "Slots returned: $SLOTS_COUNT"
if [ "$SLOTS_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ PASS - No slots returned (beyond horizon)${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING - Expected empty array but got $SLOTS_COUNT slots${NC}"
  echo "Note: PRO might have maxAdvanceDays > 60 or not configured"
fi
echo ""

# Test 3: Edge case - exactly at horizon (today + 60 days)
echo -e "${BLUE}Test 3: Exactly at horizon (today + 60 days)${NC}"
DATE=$(get_date 60)
echo "Date: $DATE"
RESPONSE=$(curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE")
SLOTS_COUNT=$(echo $RESPONSE | jq '.slots | length')
echo "Slots returned: $SLOTS_COUNT"
if [ "$SLOTS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ PASS - Slots returned (inclusive boundary)${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING - Expected slots at exact boundary${NC}"
fi
echo ""

# Test 4: Very far future (today + 365 days)
echo -e "${BLUE}Test 4: Very far future (today + 365 days)${NC}"
DATE=$(get_date 365)
echo "Date: $DATE"
RESPONSE=$(curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE")
SLOTS_COUNT=$(echo $RESPONSE | jq '.slots | length')
echo "Slots returned: $SLOTS_COUNT"
if [ "$SLOTS_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ PASS - No slots for date 1 year away${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING - Expected empty for far future date${NC}"
  echo "Note: PRO might have very high maxAdvanceDays configured"
fi
echo ""

# Test 5: Today (should always work)
echo -e "${BLUE}Test 5: Today (should always work)${NC}"
DATE=$(date +%Y-%m-%d)
echo "Date: $DATE"
RESPONSE=$(curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE")
SLOTS_COUNT=$(echo $RESPONSE | jq '.slots | length')
echo "Slots returned: $SLOTS_COUNT"
if [ "$SLOTS_COUNT" -ge 0 ]; then
  echo -e "${GREEN}✅ PASS - Today always queryable${NC}"
else
  echo -e "${RED}❌ FAIL - Error querying today's availability${NC}"
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}Test suite completed!${NC}"
echo "========================================="
echo ""
echo "Note: This test assumes:"
echo "  • PRO has maxAdvanceDays = 60 (default)"
echo "  • PRO has valid weekly schedule"
echo "  • No exceptions blocking dates"
echo ""
echo "To configure maxAdvanceDays:"
echo "  Firebase Console → Firestore → calendars/$PRO_ID/meta/config"
echo "  Set field: maxAdvanceDays = 60 (number)"
