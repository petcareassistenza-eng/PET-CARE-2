#!/bin/bash
# Script per iniettare supporto PWA in tutti i file HTML
# Usage: bash scripts/inject_pwa_support.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_PAGES_DIR="${PROJECT_ROOT}/web_pages"

echo "📱 Injecting PWA support into HTML files..."

# PWA head content to inject
PWA_HEAD_CONTENT='
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Theme color -->
  <meta name="theme-color" content="#1C8275">
  <meta name="msapplication-TileColor" content="#1C8275">
  
  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png">
  <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128.png">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png">
  
  <!-- iOS meta tags -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="PetCare">
  
  <!-- Windows meta tags -->
  <meta name="msapplication-TileImage" content="/icons/icon-144.png">
'

# Service Worker registration script
SW_SCRIPT='
  <!-- Service Worker Registration -->
  <script>
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function() {
        navigator.serviceWorker.register("/service-worker.js")
          .then(function(registration) {
            console.log("✅ Service Worker registered:", registration.scope);
            
            // Check for updates
            registration.addEventListener("updatefound", function() {
              const newWorker = registration.installing;
              newWorker.addEventListener("statechange", function() {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("🔄 New Service Worker available. Refresh to update.");
                  // Optional: Show update notification to user
                }
              });
            });
          })
          .catch(function(error) {
            console.log("❌ Service Worker registration failed:", error);
          });
      });
      
      // Handle Service Worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", function() {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  </script>
'

# Function to inject PWA support
inject_pwa() {
  local file=$1
  local filename=$(basename "$file")
  
  # Check if already injected
  if grep -q "PWA Manifest" "$file"; then
    echo "⏭️  $filename already has PWA support, skipping..."
    return
  fi
  
  echo "📝 Injecting PWA support into $filename..."
  
  # Inject manifest and meta tags in <head>
  awk -v pwa="$PWA_HEAD_CONTENT" '
    /<\/head>/ {
      print pwa
    }
    {print}
  ' "$file" > "${file}.tmp1"
  
  # Inject Service Worker script before </body>
  awk -v sw="$SW_SCRIPT" '
    /<\/body>/ {
      print sw
    }
    {print}
  ' "${file}.tmp1" > "${file}.tmp2"
  
  mv "${file}.tmp2" "$file"
  rm -f "${file}.tmp1"
  
  echo "✅ $filename updated"
}

# Inject into all HTML files except cookie-consent.html
for html_file in "$WEB_PAGES_DIR"/*.html; do
  if [[ $(basename "$html_file") != "cookie-consent.html" ]]; then
    inject_pwa "$html_file"
  fi
done

echo ""
echo "✅ PWA injection completed!"
echo "📋 Files updated:"
ls -1 "$WEB_PAGES_DIR"/*.html | grep -v cookie-consent | xargs -n1 basename

echo ""
echo "📌 Next steps:"
echo "1. Create icon files in web_pages/icons/ directory"
echo "2. Test PWA installation: Chrome DevTools → Application → Manifest"
echo "3. Test Service Worker: Chrome DevTools → Application → Service Workers"
echo "4. Run Lighthouse audit for PWA score"

exit 0
