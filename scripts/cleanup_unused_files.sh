#!/bin/bash
# ============================================================
# 🧹 MyPetCareApp — Cleanup Script
# Versione: 1.0 (12/11/2025)
# Autore: Antonio Fusco
# Uso: bash scripts/cleanup_unused_files.sh
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🧹 MyPetCareApp - Project Cleanup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Project root detection
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}Project Root:${NC} ${PROJECT_ROOT}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Track cleanup statistics
TOTAL_CLEANED=0
START_SIZE=$(du -sh . 2>/dev/null | awk '{print $1}')

# --- 1️⃣ Flutter cache & build output ---
echo -e "\n${YELLOW}[1/8]${NC} Cleaning Flutter build cache..."

if [ -d "build" ]; then
  SIZE=$(du -sh build 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing build/ (${SIZE})${NC}"
  rm -rf build/
  ((TOTAL_CLEANED++))
fi

if [ -d ".dart_tool" ]; then
  SIZE=$(du -sh .dart_tool 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing .dart_tool/ (${SIZE})${NC}"
  rm -rf .dart_tool/
  ((TOTAL_CLEANED++))
fi

if [ -f ".flutter-plugins-dependencies" ]; then
  echo -e "${BLUE}  Removing .flutter-plugins-dependencies${NC}"
  rm -f .flutter-plugins-dependencies
fi

echo -e "${GREEN}✅ Flutter cache cleaned${NC}"

# --- 2️⃣ Node.js / Backend cleanup ---
echo -e "\n${YELLOW}[2/8]${NC} Cleaning backend Node.js artifacts..."

if [ -d "backend/node_modules" ]; then
  SIZE=$(du -sh backend/node_modules 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing backend/node_modules/ (${SIZE})${NC}"
  rm -rf backend/node_modules
  ((TOTAL_CLEANED++))
fi

if [ -d "backend/dist" ]; then
  SIZE=$(du -sh backend/dist 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing backend/dist/ (${SIZE})${NC}"
  rm -rf backend/dist
  ((TOTAL_CLEANED++))
fi

if [ -d "backend/.turbo" ]; then
  echo -e "${BLUE}  Removing backend/.turbo/${NC}"
  rm -rf backend/.turbo
fi

# Regenerate package-lock.json (optional, commented out to preserve existing)
# if [ -f "backend/package-lock.json" ]; then
#   echo -e "${BLUE}  Regenerating package-lock.json...${NC}"
#   (cd backend && npm install --package-lock-only)
# fi

echo -e "${GREEN}✅ Backend artifacts cleaned${NC}"

# --- 3️⃣ iOS build cache ---
echo -e "\n${YELLOW}[3/8]${NC} Cleaning iOS build artifacts..."

if [ -d "ios/DerivedData" ]; then
  SIZE=$(du -sh ios/DerivedData 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing ios/DerivedData/ (${SIZE})${NC}"
  rm -rf ios/DerivedData
  ((TOTAL_CLEANED++))
fi

if [ -d "ios/Pods" ]; then
  SIZE=$(du -sh ios/Pods 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing ios/Pods/ (${SIZE})${NC}"
  rm -rf ios/Pods
  ((TOTAL_CLEANED++))
fi

if [ -f "ios/Podfile.lock" ]; then
  echo -e "${BLUE}  Removing ios/Podfile.lock${NC}"
  rm -f ios/Podfile.lock
fi

if [ -d "ios/build" ]; then
  SIZE=$(du -sh ios/build 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing ios/build/ (${SIZE})${NC}"
  rm -rf ios/build
  ((TOTAL_CLEANED++))
fi

echo -e "${GREEN}✅ iOS artifacts cleaned${NC}"

# --- 4️⃣ Android build cache ---
echo -e "\n${YELLOW}[4/8]${NC} Cleaning Android build artifacts..."

if [ -d "android/.gradle" ]; then
  SIZE=$(du -sh android/.gradle 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing android/.gradle/ (${SIZE})${NC}"
  rm -rf android/.gradle
  ((TOTAL_CLEANED++))
fi

if [ -d "android/build" ]; then
  SIZE=$(du -sh android/build 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing android/build/ (${SIZE})${NC}"
  rm -rf android/build
  ((TOTAL_CLEANED++))
fi

if [ -d "android/app/build" ]; then
  SIZE=$(du -sh android/app/build 2>/dev/null | awk '{print $1}')
  echo -e "${BLUE}  Removing android/app/build/ (${SIZE})${NC}"
  rm -rf android/app/build
  ((TOTAL_CLEANED++))
fi

if [ -d "android/.idea" ]; then
  echo -e "${BLUE}  Removing android/.idea/${NC}"
  rm -rf android/.idea
fi

echo -e "${GREEN}✅ Android artifacts cleaned${NC}"

# --- 5️⃣ Log & temp files ---
echo -e "\n${YELLOW}[5/8]${NC} Removing temporary files and logs..."

LOG_COUNT=$(find . -type f -name "*.log" 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -gt 0 ]; then
  echo -e "${BLUE}  Removing ${LOG_COUNT} log files${NC}"
  find . -type f -name "*.log" -delete 2>/dev/null || true
  ((TOTAL_CLEANED++))
fi

TMP_COUNT=$(find . -type f -name "*.tmp" 2>/dev/null | wc -l)
if [ "$TMP_COUNT" -gt 0 ]; then
  echo -e "${BLUE}  Removing ${TMP_COUNT} temp files${NC}"
  find . -type f -name "*.tmp" -delete 2>/dev/null || true
  ((TOTAL_CLEANED++))
fi

BAK_COUNT=$(find . -type f -name "*~" 2>/dev/null | wc -l)
if [ "$BAK_COUNT" -gt 0 ]; then
  echo -e "${BLUE}  Removing ${BAK_COUNT} backup files${NC}"
  find . -type f -name "*~" -delete 2>/dev/null || true
  ((TOTAL_CLEANED++))
fi

DS_COUNT=$(find . -type f -name ".DS_Store" 2>/dev/null | wc -l)
if [ "$DS_COUNT" -gt 0 ]; then
  echo -e "${BLUE}  Removing ${DS_COUNT} .DS_Store files${NC}"
  find . -type f -name ".DS_Store" -delete 2>/dev/null || true
  ((TOTAL_CLEANED++))
fi

echo -e "${GREEN}✅ Temporary files cleaned${NC}"

# --- 6️⃣ Documentation cleanup ---
echo -e "\n${YELLOW}[6/8]${NC} Cleaning old documentation files..."

if [ -d "docs" ]; then
  OLD_DOCS=$(find docs -type f -name "*_OLD.md" -o -name "*_backup.md" 2>/dev/null | wc -l)
  if [ "$OLD_DOCS" -gt 0 ]; then
    echo -e "${BLUE}  Removing ${OLD_DOCS} old documentation files${NC}"
    find docs -type f -name "*_OLD.md" -delete 2>/dev/null || true
    find docs -type f -name "*_backup.md" -delete 2>/dev/null || true
    ((TOTAL_CLEANED++))
  fi
fi

echo -e "${GREEN}✅ Documentation cleaned${NC}"

# --- 7️⃣ Web cache cleanup ---
echo -e "\n${YELLOW}[7/8]${NC} Cleaning web artifacts..."

if [ -d "web" ]; then
  WEB_OLD=$(find web -type f \( -name "*.bak" -o -name "*.old" \) 2>/dev/null | wc -l)
  if [ "$WEB_OLD" -gt 0 ]; then
    echo -e "${BLUE}  Removing ${WEB_OLD} old web files${NC}"
    find web -type f -name "*.bak" -delete 2>/dev/null || true
    find web -type f -name "*.old" -delete 2>/dev/null || true
    ((TOTAL_CLEANED++))
  fi
fi

echo -e "${GREEN}✅ Web artifacts cleaned${NC}"

# --- 8️⃣ Flutter clean & dependency verification ---
echo -e "\n${YELLOW}[8/8]${NC} Running Flutter clean..."

if command -v flutter &> /dev/null; then
  flutter clean > /dev/null 2>&1
  echo -e "${GREEN}✅ Flutter clean completed${NC}"
else
  echo -e "${YELLOW}⚠️  Flutter not found, skipping flutter clean${NC}"
fi

# --- 9️⃣ Optional: npm cache verify ---
if [ -d "backend" ] && command -v npm &> /dev/null; then
  echo -e "\n${BLUE}Verifying npm cache...${NC}"
  (cd backend && npm cache verify > /dev/null 2>&1)
  echo -e "${GREEN}✅ npm cache verified${NC}"
fi

# --- Final statistics ---
END_SIZE=$(du -sh . 2>/dev/null | awk '{print $1}')

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Cleanup Completed Successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Items cleaned:${NC} ${TOTAL_CLEANED}"
echo -e "${GREEN}Project size before:${NC} ${START_SIZE}"
echo -e "${GREEN}Project size after:${NC} ${END_SIZE}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}💡 Next steps:${NC}"
echo -e "1. Run ${BLUE}flutter pub get${NC} to restore Flutter dependencies"
echo -e "2. Run ${BLUE}cd ios && pod install${NC} to restore iOS dependencies"
echo -e "3. Run ${BLUE}cd backend && npm install${NC} to restore backend dependencies"
echo -e "4. Run ${BLUE}cd android && ./gradlew clean${NC} to rebuild Android"

echo -e "\n${GREEN}✨ Cleanup completed at $(date)${NC}"

exit 0
