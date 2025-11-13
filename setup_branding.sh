#!/bin/bash

# ============================================================================
# MyPetCare - Branding Setup (Genspark Ready)
# ============================================================================
# Esegue in ordine:
# 1️⃣ Copia gli asset logo/icon
# 2️⃣ Aggiorna manifest web
# 3️⃣ Esegue flutter pub get / launcher_icons / native_splash
# 4️⃣ Build web release (facoltativa con --skip-build)
# ============================================================================

set -e  # Exit on error

# --- Configurazione ---
SKIP_BUILD=false
if [[ "$1" == "--skip-build" ]]; then
  SKIP_BUILD=true
fi

ROOT=$(pwd)
ASSETS_ICONS="$ROOT/assets/icons"
ASSETS_LOGO="$ROOT/assets/logo"
WEB_DIR="$ROOT/web"
WEB_ICONS="$WEB_DIR/icons"

# --- Colori Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helper Functions ---
log_info() {
  echo -e "${CYAN}▶ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# 1. Verifica Flutter
# ============================================================================

if ! command -v flutter &> /dev/null; then
  log_error "Flutter non trovato. Aggiungi Flutter al PATH."
  exit 1
fi

log_success "Flutter trovato: $(flutter --version | head -1)"

# ============================================================================
# 2. Verifica File Sorgente
# ============================================================================

log_info "Verifica file asset sorgente..."

ICON_512="$ROOT/pet_care_icon_512_bordered.png"
ICON_1024="$ROOT/pet_care_icon_1024_bordered.png"
LOGO_WEBP="$ROOT/my_pet_care_logo.webp"

if [[ ! -f "$ICON_512" ]]; then
  log_error "Manca il file: $ICON_512"
  exit 1
fi

if [[ ! -f "$ICON_1024" ]]; then
  log_error "Manca il file: $ICON_1024"
  exit 1
fi

if [[ ! -f "$LOGO_WEBP" ]]; then
  log_error "Manca il file: $LOGO_WEBP"
  exit 1
fi

log_success "File sorgente verificati"

# ============================================================================
# 3. Crea Directory Asset
# ============================================================================

log_info "Creazione directory asset..."

mkdir -p "$ASSETS_ICONS"
mkdir -p "$ASSETS_LOGO"
mkdir -p "$WEB_ICONS"

log_success "Directory create"

# ============================================================================
# 4. Copia Asset
# ============================================================================

log_info "Copia asset nelle directory target..."

cp "$ICON_512" "$ASSETS_ICONS/pet_care_icon_512_bordered.png"
cp "$ICON_1024" "$ASSETS_ICONS/pet_care_icon_1024_bordered.png"
cp "$LOGO_WEBP" "$ASSETS_LOGO/my_pet_care_logo.webp"

# Converti logo WebP a PNG per flutter_native_splash
if command -v convert &> /dev/null; then
  log_info "Conversione logo da WebP a PNG..."
  convert "$LOGO_WEBP" "$ASSETS_LOGO/my_pet_care_logo.png"
  log_success "Logo convertito in PNG"
else
  log_warning "ImageMagick (convert) non trovato - salta conversione WebP"
fi

log_success "Asset copiati in assets/"

# ============================================================================
# 5. Copia Icone Web
# ============================================================================

log_info "Copia icone web..."

# Icon-512.png
cp "$ICON_512" "$WEB_ICONS/Icon-512.png"

# Favicon (copia 512 per ora, ridimensiona con ImageMagick se disponibile)
if command -v convert &> /dev/null; then
  convert "$ICON_512" -resize 32x32 "$WEB_DIR/favicon.png"
  convert "$ICON_512" -resize 192x192 "$WEB_ICONS/Icon-192.png"
  
  # Crea anche varianti maskable (con padding)
  convert "$ICON_512" -resize 192x192 -background transparent -gravity center -extent 192x192 "$WEB_ICONS/Icon-maskable-192.png"
  convert "$ICON_512" -resize 512x512 -background transparent -gravity center -extent 512x512 "$WEB_ICONS/Icon-maskable-512.png"
else
  log_warning "ImageMagick non disponibile - usa icona 512px per tutti"
  cp "$ICON_512" "$WEB_DIR/favicon.png"
  cp "$ICON_512" "$WEB_ICONS/Icon-192.png"
  cp "$ICON_512" "$WEB_ICONS/Icon-maskable-192.png"
  cp "$ICON_512" "$WEB_ICONS/Icon-maskable-512.png"
fi

log_success "Icone web copiate"

# ============================================================================
# 6. Aggiorna manifest.json
# ============================================================================

log_info "Aggiornamento web/manifest.json..."

cat > "$WEB_DIR/manifest.json" <<EOF
{
  "name": "My Pet Care",
  "short_name": "PetCare",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1C8275",
  "theme_color": "#1C8275",
  "description": "My Pet Care - Piattaforma di prenotazione servizi per animali domestici",
  "orientation": "portrait-primary",
  "prefer_related_applications": false,
  "icons": [
    {
      "src": "icons/Icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/Icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "icons/Icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icons/Icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
EOF

log_success "manifest.json aggiornato"

# ============================================================================
# 7. Flutter Setup
# ============================================================================

log_info "Flutter pub get..."
flutter pub get

log_info "Generazione icone app (flutter_launcher_icons)..."
flutter pub run flutter_launcher_icons

log_info "Generazione splash screen (flutter_native_splash)..."
flutter pub run flutter_native_splash:create

log_success "Asset branding generati con successo"

# ============================================================================
# 8. Build Web (Opzionale)
# ============================================================================

if [[ "$SKIP_BUILD" == "true" ]]; then
  log_warning "Build web saltata (--skip-build)"
else
  log_info "Flutter build web --release..."
  flutter build web --release
  log_success "Build web completata"
fi

# ============================================================================
# 9. Riepilogo Finale
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "🎉 Branding completato con successo (Genspark Ready)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Asset copiati in:"
echo "   • assets/icons/"
echo "   • assets/logo/"
echo "   • web/icons/"
echo ""
echo "✨ Generati:"
echo "   • Icone Android (5 densità)"
echo "   • Icone iOS (20+ varianti)"
echo "   • Splash screen Android/iOS"
echo "   • Icone web + manifest.json"
echo ""
echo "🚀 Prossimi step:"
echo "   1. Sostituisci asset placeholder con icone professionali"
echo "   2. Rigenera con: ./setup_branding.sh"
echo "   3. Build finale: flutter build apk/web/ios --release"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
