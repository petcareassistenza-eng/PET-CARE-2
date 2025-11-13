#!/bin/bash
# Script per iniettare Cookie Consent in tutti i file HTML
# Usage: bash scripts/inject_cookie_consent.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_PAGES_DIR="${PROJECT_ROOT}/web_pages"
COOKIE_CONSENT_FILE="${WEB_PAGES_DIR}/cookie-consent.html"

echo "🍪 Injecting Cookie Consent into HTML files..."

if [ ! -f "$COOKIE_CONSENT_FILE" ]; then
  echo "❌ Error: cookie-consent.html not found"
  exit 1
fi

# Function to inject cookie consent before </body> tag
inject_consent() {
  local file=$1
  local filename=$(basename "$file")
  
  # Check if already injected
  if grep -q "<!-- Google Consent Mode v2 -->" "$file"; then
    echo "⏭️  $filename already has cookie consent, skipping..."
    return
  fi
  
  echo "📝 Injecting into $filename..."
  
  # Create temp file with cookie consent injected before </body>
  awk '
    /<\/body>/ {
      system("cat '"$COOKIE_CONSENT_FILE"'")
      print ""
    }
    {print}
  ' "$file" > "${file}.tmp"
  
  mv "${file}.tmp" "$file"
  echo "✅ $filename updated"
}

# Inject into all HTML files except cookie-consent.html
for html_file in "$WEB_PAGES_DIR"/*.html; do
  if [[ $(basename "$html_file") != "cookie-consent.html" ]]; then
    inject_consent "$html_file"
  fi
done

echo ""
echo "✅ Cookie Consent injection completed!"
echo "📋 Files updated:"
ls -1 "$WEB_PAGES_DIR"/*.html | grep -v cookie-consent | xargs -n1 basename

exit 0
