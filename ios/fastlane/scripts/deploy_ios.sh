#!/bin/bash
# ==============================================================================
# iOS Deployment Script - MyPetCareApp
# ==============================================================================
# Description: One-shot command for complete iOS build and deployment
# Usage: ./ios/fastlane/scripts/deploy_ios.sh [environment]
# Example: ./ios/fastlane/scripts/deploy_ios.sh prod
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IOS_DIR="${PROJECT_ROOT}/ios"
ENV_NAME="${1:-prod}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   MyPetCareApp - iOS Deployment Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Project Root:${NC} ${PROJECT_ROOT}"
echo -e "${GREEN}Environment:${NC} ${ENV_NAME}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# ==============================================================================
# Step 1: Pre-flight Checks
# ==============================================================================
echo -e "\n${YELLOW}[1/6]${NC} Running pre-flight checks..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}❌ Error: This script requires macOS${NC}"
  echo -e "${YELLOW}💡 iOS builds can only be performed on macOS with Xcode installed${NC}"
  exit 1
fi

# Check Flutter
if ! command -v flutter &> /dev/null; then
  echo -e "${RED}❌ Error: Flutter is not installed or not in PATH${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Flutter:${NC} $(flutter --version | head -1)"

# Check Ruby
if ! command -v ruby &> /dev/null; then
  echo -e "${RED}❌ Error: Ruby is not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Ruby:${NC} $(ruby --version)"

# Check Bundler
if ! command -v bundle &> /dev/null; then
  echo -e "${YELLOW}⚠️  Bundler not found. Installing...${NC}"
  gem install bundler
fi
echo -e "${GREEN}✅ Bundler:${NC} $(bundle --version)"

# Check environment file
ENV_FILE="${IOS_DIR}/fastlane/.env.${ENV_NAME}"
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Error: Environment file not found: ${ENV_FILE}${NC}"
  echo -e "${YELLOW}💡 Copy the template: cp ios/fastlane/.env.prod.template ${ENV_FILE}${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Environment file:${NC} ${ENV_FILE}"

# ==============================================================================
# Step 2: Flutter Clean & Dependency Install
# ==============================================================================
echo -e "\n${YELLOW}[2/6]${NC} Cleaning Flutter build cache..."
cd "$PROJECT_ROOT"
flutter clean
echo -e "${GREEN}✅ Flutter clean completed${NC}"

echo -e "\n${YELLOW}[2/6]${NC} Installing Flutter dependencies..."
flutter pub get
echo -e "${GREEN}✅ Flutter dependencies installed${NC}"

# ==============================================================================
# Step 3: Build Flutter IPA
# ==============================================================================
echo -e "\n${YELLOW}[3/6]${NC} Building Flutter IPA (Release mode)..."
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

flutter build ipa --release --no-tree-shake-icons

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Flutter build failed${NC}"
  exit 1
fi

IPA_PATH="${PROJECT_ROOT}/build/ios/ipa/*.ipa"
if ls $IPA_PATH 1> /dev/null 2>&1; then
  IPA_SIZE=$(du -h $IPA_PATH | cut -f1)
  echo -e "${GREEN}✅ IPA built successfully${NC}"
  echo -e "${GREEN}   Size:${NC} ${IPA_SIZE}"
  echo -e "${GREEN}   Path:${NC} ${IPA_PATH}"
else
  echo -e "${RED}❌ IPA file not found${NC}"
  exit 1
fi

# ==============================================================================
# Step 4: Install iOS Dependencies (Bundler + CocoaPods)
# ==============================================================================
echo -e "\n${YELLOW}[4/6]${NC} Installing iOS dependencies..."
cd "$IOS_DIR"

# Install Ruby gems
echo -e "${BLUE}Installing Bundler dependencies...${NC}"
bundle install

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Bundle install failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Bundler dependencies installed${NC}"

# Install CocoaPods
echo -e "${BLUE}Installing CocoaPods dependencies...${NC}"
bundle exec pod install

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ CocoaPods install failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ CocoaPods dependencies installed${NC}"

# ==============================================================================
# Step 5: Deploy via Fastlane
# ==============================================================================
echo -e "\n${YELLOW}[5/6]${NC} Deploying to App Store Connect via Fastlane..."
echo -e "${BLUE}This may take 10-20 minutes...${NC}"

bundle exec fastlane ios release --env "$ENV_NAME"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Fastlane deployment failed${NC}"
  echo -e "${YELLOW}💡 Check logs: ios/fastlane/fastlane.log${NC}"
  exit 1
fi

# ==============================================================================
# Step 6: Success & Next Steps
# ==============================================================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ iOS Deployment Completed Successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}📱 Next Steps:${NC}"
echo -e "1. Go to App Store Connect:"
echo -e "   ${BLUE}https://appstoreconnect.apple.com/${NC}"
echo -e ""
echo -e "2. Navigate to: My Apps → MyPetCareApp → TestFlight"
echo -e ""
echo -e "3. Wait for processing (10-30 minutes)"
echo -e "   Status: ${YELLOW}Processing${NC} → ${GREEN}Ready to Test${NC}"
echo -e ""
echo -e "4. Test the build on a physical device"
echo -e ""
echo -e "5. Submit for App Store review (manual step)"
echo -e "   Go to: App Store → iOS App → Version → Submit for Review"
echo -e ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${GREEN}✨ Deployment script completed at $(date)${NC}"

exit 0
