# 🍎 iOS Deployment Guide - MyPetCareApp

**Version**: 1.0  
**Date**: 2025-11-12  
**Platform**: iOS (iPhone, iPad)  
**Tool**: Fastlane + App Store Connect API

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Build & Deploy](#build--deploy)
5. [Troubleshooting](#troubleshooting)
6. [CI/CD Integration](#cicd-integration)

---

## 🔧 Prerequisites

### **Required Software**

- ✅ **macOS** (Monterey 12.0+ recommended)
- ✅ **Xcode** 15.0+ (download from Mac App Store)
- ✅ **Flutter** 3.35.4 (already installed)
- ✅ **Ruby** 2.6+ (pre-installed on macOS)
- ✅ **Bundler**: `gem install bundler`
- ✅ **CocoaPods**: `gem install cocoapods`

### **Apple Developer Account**

- ✅ **Apple Developer Program** membership ($99/year)
  - Sign up: https://developer.apple.com/programs/
- ✅ **App Store Connect** access
  - Portal: https://appstoreconnect.apple.com/

### **App Store Connect API Key**

**Critical**: Required for automated deployments without 2FA prompts.

#### **Step-by-Step API Key Creation**:

1. Go to: https://appstoreconnect.apple.com/access/api
2. Click **Users and Access** → **Keys** tab
3. Click **"+"** button to generate a new key
4. **Name**: "Fastlane CI/CD Key"
5. **Access**: Select **"App Manager"** role
6. Click **"Generate"**
7. ⚠️ **CRITICAL**: Download the `.p8` file immediately (can only download once!)
8. Save the `.p8` file securely (1Password, secure vault, etc.)
9. Copy the **Key ID** (e.g., `ABCD123456`)
10. Copy the **Issuer ID** (UUID format, e.g., `11223344-5566-7788-99aa-bbccddeeff00`)

---

## 🚀 Initial Setup

### **1. Install Ruby Dependencies**

```bash
cd /home/user/flutter_app/ios

# Install Bundler (if not already installed)
gem install bundler

# Install Fastlane and dependencies
bundle install

# Verify Fastlane installation
bundle exec fastlane --version
```

**Expected output**: `fastlane 2.219.0` (or higher)

### **2. Install CocoaPods Dependencies**

```bash
# Install CocoaPods (if not already installed)
gem install cocoapods

# Install iOS dependencies
cd /home/user/flutter_app/ios
pod install

# Or use Bundler
bundle exec pod install
```

### **3. Configure Environment Variables**

```bash
cd /home/user/flutter_app/ios/fastlane

# Copy template to production environment file
cp .env.prod.template .env.prod

# Edit with your credentials
nano .env.prod  # or vim, or any text editor
```

**Fill in these CRITICAL values**:

```bash
# From App Store Connect API Key setup
ASC_KEY_ID=YOUR_KEY_ID_HERE           # e.g., ABCD123456
ASC_ISSUER_ID=YOUR_ISSUER_ID_HERE     # UUID format
ASC_KEY_CONTENT=YOUR_KEY_CONTENT_HERE # See below for generation

# From Apple Developer Account
IOS_BUNDLE_ID=com.mypetcareapp.ios    # Must match Xcode project
IOS_TEAM_ID=YOUR_TEAM_ID_HERE         # 10-character team ID
```

#### **Generate ASC_KEY_CONTENT**:

**Option A - Base64 Encoded** (Recommended for CI/CD):
```bash
# Generate base64 from .p8 file
cat AuthKey_XXXXX.p8 | base64 | tr -d '\n'

# Copy output to .env.prod
ASC_KEY_CONTENT=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...
```

**Option B - Raw Key Content**:
```bash
# Use escaped newlines
ASC_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n
```

### **4. Verify Configuration**

```bash
cd /home/user/flutter_app/ios

# List available Fastlane lanes
bundle exec fastlane lanes

# Expected output:
# ------ ios -------
# fastlane ios release         # Build & Upload to App Store
# fastlane ios beta            # Build & Upload to TestFlight
# fastlane ios screenshots     # Take screenshots
# fastlane ios test            # Run tests
```

---

## 🔨 Build & Deploy

### **🎯 Full Deployment Workflow** (One-Shot Command)

This command builds the Flutter app, generates IPA, and uploads to App Store Connect:

```bash
cd /home/user/flutter_app

# Complete build + upload to App Store Connect
ios/fastlane/scripts/deploy_ios.sh
```

Or manually:

```bash
# Step 1: Build Flutter IPA
flutter build ipa --release --no-tree-shake-icons

# Step 2: Install iOS dependencies
cd ios && bundle install && cd ..

# Step 3: Deploy via Fastlane
cd ios && bundle exec fastlane ios release --env prod
```

**What happens**:
1. ✅ Flutter builds optimized IPA (~60-80MB)
2. ✅ Fastlane installs CocoaPods dependencies
3. ✅ Xcode compiles and signs the app
4. ✅ IPA uploaded to App Store Connect
5. ✅ TestFlight beta becomes available
6. ✅ Ready for App Store submission

### **🧪 TestFlight Beta Deployment**

For beta testing only (faster, no App Store review):

```bash
cd /home/user/flutter_app/ios

bundle exec fastlane ios beta --env prod
```

**Timeline**:
- ⏱️ Upload: 5-10 minutes
- ⏱️ Processing: 10-30 minutes
- ✅ TestFlight ready: ~15-40 minutes total

### **📸 Generate App Store Screenshots**

```bash
cd /home/user/flutter_app/ios

# Automated screenshot capture
bundle exec fastlane ios screenshots

# Screenshots saved to: ios/fastlane/screenshots/
```

**Devices captured**:
- iPhone 15 Pro Max (6.7")
- iPhone 15 Pro (6.1")
- iPhone 15 (6.1")
- iPhone SE (4.7")
- iPad Pro 12.9"

**Languages**: Italian (it-IT), English (en-US)

---

## 🧪 Testing & Verification

### **1. Local Build Test**

```bash
cd /home/user/flutter_app

# Clean build
flutter clean
flutter pub get

# Build iOS (without deploying)
flutter build ios --release

# Expected: Build completes without errors
```

### **2. Fastlane Dry Run**

```bash
cd /home/user/flutter_app/ios

# Test Fastlane configuration (doesn't upload)
bundle exec fastlane ios test --env prod

# Expected: All tests pass
```

### **3. Verify App Store Connect Upload**

After deployment:

1. Go to: https://appstoreconnect.apple.com/
2. Navigate: **My Apps** → **MyPetCareApp**
3. Go to **TestFlight** tab
4. Check **iOS Builds** section
5. Status should be: **"Processing"** → **"Ready to Test"**

**Timeline**:
- Upload complete: Immediate
- Processing: 10-30 minutes
- Ready to test: ~40 minutes after upload

---

## 🔍 Troubleshooting

### **❌ Error: "No such file or directory - AuthKey_XXXXX.p8"**

**Problem**: App Store Connect API key file not found.

**Solution**:
```bash
# Option 1: Use base64 encoded content in .env.prod
ASC_KEY_CONTENT=$(cat AuthKey_XXXXX.p8 | base64 | tr -d '\n')

# Option 2: Place .p8 file in ios/fastlane/ directory
cp AuthKey_XXXXX.p8 /home/user/flutter_app/ios/fastlane/
```

### **❌ Error: "Could not find valid signing identity"**

**Problem**: Xcode can't find valid provisioning profile.

**Solution**:
```bash
# Open Xcode
open /home/user/flutter_app/ios/Runner.xcworkspace

# In Xcode:
# 1. Select "Runner" project
# 2. Go to "Signing & Capabilities" tab
# 3. Check "Automatically manage signing"
# 4. Select your Team ID
# 5. Xcode will download provisioning profile automatically
```

### **❌ Error: "CocoaPods not installed"**

**Problem**: CocoaPods missing or outdated.

**Solution**:
```bash
# Install CocoaPods
gem install cocoapods

# Update pod repo
pod repo update

# Reinstall dependencies
cd /home/user/flutter_app/ios
rm -rf Pods Podfile.lock
pod install
```

### **❌ Error: "Authentication failure with App Store Connect"**

**Problem**: Invalid API credentials.

**Solution**:
```bash
# Verify credentials in .env.prod
cat /home/user/flutter_app/ios/fastlane/.env.prod

# Check values match App Store Connect:
# 1. Key ID is correct (ABCD123456 format)
# 2. Issuer ID is correct (UUID format)
# 3. Key content is complete (starts with -----BEGIN PRIVATE KEY-----)

# Regenerate API key if necessary:
# https://appstoreconnect.apple.com/access/api → Keys → Generate new key
```

### **❌ Error: "Build failed with exit code 65"**

**Problem**: Xcode compilation error.

**Solution**:
```bash
# View detailed error logs
cd /home/user/flutter_app/ios
bundle exec fastlane ios release --env prod --verbose

# Common fixes:
# 1. Clean build
flutter clean
cd ios && rm -rf Pods Podfile.lock && pod install

# 2. Update Flutter packages
flutter pub get

# 3. Check Xcode project for errors
open Runner.xcworkspace
# Build → Clean Build Folder (Cmd+Shift+K)
# Build → Build (Cmd+B)
```

### **❌ Error: "Fastlane session expired"**

**Problem**: App Store Connect API key expired (max duration: 20 minutes).

**Solution**: This should not happen with API key authentication. If it does:
```bash
# Verify API key is being used (not Apple ID login)
grep ASC_KEY_ID /home/user/flutter_app/ios/fastlane/.env.prod

# Should output: ASC_KEY_ID=XXXXX

# If empty, add API key credentials to .env.prod
```

---

## 🤖 CI/CD Integration

### **GitHub Actions Workflow**

Create `.github/workflows/ios-release.yml`:

```yaml
name: iOS Release

on:
  push:
    branches: [ main ]
    paths:
      - 'lib/**'
      - 'ios/**'
      - 'pubspec.yaml'
  workflow_dispatch:

jobs:
  build-ios:
    runs-on: macos-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.35.4'
          channel: 'stable'
      
      - name: Install Flutter dependencies
        run: flutter pub get
      
      - name: Build Flutter IPA
        run: flutter build ipa --release --no-tree-shake-icons
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true
          working-directory: ios
      
      - name: Install Fastlane
        run: |
          cd ios
          bundle install
      
      - name: Deploy to App Store Connect
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_CONTENT: ${{ secrets.ASC_KEY_CONTENT }}
          IOS_BUNDLE_ID: com.mypetcareapp.ios
          IOS_TEAM_ID: ${{ secrets.IOS_TEAM_ID }}
          CI: true
        run: |
          cd ios
          bundle exec fastlane ios release --env prod
```

### **Required GitHub Secrets**

Add these in: **GitHub Repository → Settings → Secrets and variables → Actions**

```
ASC_KEY_ID          = ABCD123456
ASC_ISSUER_ID       = 11223344-5566-7788-99aa-bbccddeeff00
ASC_KEY_CONTENT     = -----BEGIN PRIVATE KEY-----\n...
IOS_TEAM_ID         = TEAM123456
```

**Generate ASC_KEY_CONTENT for GitHub**:
```bash
cat AuthKey_XXXXX.p8 | base64 | tr -d '\n'
# Copy output to GitHub Secret
```

---

## 📊 Deployment Checklist

### **Pre-Deployment**

- [ ] ✅ App Store Connect API key created and saved securely
- [ ] ✅ `ios/fastlane/.env.prod` configured with all credentials
- [ ] ✅ Xcode project opens without errors
- [ ] ✅ Provisioning profiles valid and not expired
- [ ] ✅ App version incremented in `pubspec.yaml`
- [ ] ✅ Build number incremented (auto-incremented by Fastlane)
- [ ] ✅ App icons and launch screens updated
- [ ] ✅ Privacy Policy URL accessible: `https://mypetcareapp.org/privacy`
- [ ] ✅ Terms of Service URL accessible: `https://mypetcareapp.org/terms`

### **During Deployment**

- [ ] ✅ `flutter build ipa` completes successfully
- [ ] ✅ `bundle exec fastlane ios release` uploads without errors
- [ ] ✅ App Store Connect shows "Processing" status
- [ ] ✅ No compilation warnings in Xcode logs

### **Post-Deployment**

- [ ] ✅ TestFlight build status: "Ready to Test"
- [ ] ✅ Internal testers notified automatically
- [ ] ✅ App tested on physical iOS device
- [ ] ✅ All core features working (login, booking, payments)
- [ ] ✅ Privacy/Terms links working in app
- [ ] ✅ Push notifications tested (if implemented)
- [ ] ✅ Submit for App Store review (manual in App Store Connect)

---

## 📚 Additional Resources

- **Fastlane Documentation**: https://docs.fastlane.tools/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Apple Developer**: https://developer.apple.com/
- **Flutter iOS Deployment**: https://flutter.dev/docs/deployment/ios
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

---

## 🆘 Support

**Issues during deployment?**

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review Fastlane logs: `ios/fastlane/fastlane.log`
3. Check App Store Connect status: https://developer.apple.com/system-status/
4. Contact support: support@mypetcareapp.org

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-12  
**Maintainer**: DevOps Team MyPetCareApp
