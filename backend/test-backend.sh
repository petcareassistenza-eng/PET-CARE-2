#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080"

echo -e "${BLUE}=== MY PET CARE BACKEND TESTS ===${NC}\n"

# 1. Health Check
echo -e "${BLUE}1. Testing Health Endpoint${NC}"
curl -s "$BASE_URL/health" | jq .
echo -e "\n"

# 2. Availability Endpoint (no calendar yet - should return 404)
echo -e "${BLUE}2. Testing Availability Endpoint (expecting 404)${NC}"
curl -s "$BASE_URL/api/pros/test-pro-001/availability?from=2025-11-20&to=2025-11-22" | jq .
echo -e "\n"

# 3. Admin Stats (needs auth - will fail without token)
echo -e "${BLUE}3. Testing Admin Stats (expecting 401)${NC}"
curl -s "$BASE_URL/api/admin/stats" | jq .
echo -e "\n"

echo -e "${GREEN}✅ Basic tests completed!${NC}"
echo -e "${BLUE}To test with real data:${NC}"
echo -e "  1. Set up Firestore calendar data"
echo -e "  2. Run: npm run dev"
echo -e "  3. Test availability with real proId"
