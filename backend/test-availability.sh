#!/bin/bash

# Test script for availability endpoint
# Usage: ./test-availability.sh [BASE_URL]

BASE_URL="${1:-http://localhost:8080}"
PRO_ID="test-pro-001"
DATE="2025-11-20"

echo "========================================="
echo "MY PET CARE - Availability API Test"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "PRO ID: $PRO_ID"
echo "Date: $DATE"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Basic availability request
echo -e "${BLUE}Test 1: Basic availability request${NC}"
curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE" | jq .
echo ""

# Test 2: With custom duration
echo -e "${BLUE}Test 2: With custom duration (60 min)${NC}"
curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=$DATE&durationMin=60" | jq .
echo ""

# Test 3: Invalid date format
echo -e "${BLUE}Test 3: Invalid date format (should return 400)${NC}"
curl -s "$BASE_URL/api/pros/$PRO_ID/availability?date=2025-11" | jq .
echo ""

# Test 4: Non-existent PRO
echo -e "${BLUE}Test 4: Non-existent PRO (should return 404)${NC}"
curl -s "$BASE_URL/api/pros/nonexistent/availability?date=$DATE" | jq .
echo ""

# Test 5: Health check
echo -e "${BLUE}Test 5: Backend health check${NC}"
curl -s "$BASE_URL/health" | jq .
echo ""

echo -e "${GREEN}✅ Tests completed!${NC}"
