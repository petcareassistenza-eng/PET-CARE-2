# 🎨 MyPetCare Branding Setup Guide

Guida completa per configurare branding (icone, splash screen, manifest web) in modo automatizzato.

---

## 📋 Prerequisiti

### File Richiesti (nella root del progetto)

```
flutter_app/
├── pet_care_icon_512_bordered.png     # 512x512px, PNG, bordo 10%
├── pet_care_icon_1024_bordered.png    # 1024x1024px, PNG, bordo 10%
├── my_pet_care_logo.webp              # 512x512px, WebP/PNG
└── setup_branding.sh                  # Script di setup
```

### Software Richiesto

- ✅ Flutter SDK (3.35.4+)
- ✅ ImageMagick (opzionale, per ridimensionamento automatico)
- ✅ Bash shell (Linux/macOS) o PowerShell (Windows)

**Installa ImageMagick (consigliato):**
```bash
# Ubuntu/Debian
sudo apt-get install imagemagick

# macOS
brew install imagemagick

# Verifica
convert --version
```

---

## 🚀 Uso Rapido

### Esecuzione Standard (con build web)

```bash
cd /home/user/flutter_app
./setup_branding.sh
```

**Output atteso:**
```
✅ Flutter trovato: Flutter 3.35.4
✅ File sorgente verificati
✅ Directory create
✅ Asset copiati in assets/
✅ Icone web copiate
✅ manifest.json aggiornato
▶ Flutter pub get...
▶ Generazione icone app (flutter_launcher_icons)...
✓ Successfully generated launcher icons
▶ Generazione splash screen (flutter_native_splash)...
✅ Native splash complete.
▶ Flutter build web --release...
✅ Build web completata
🎉 Branding completato con successo (Genspark Ready)
```

---

### Esecuzione Senza Build (più veloce)

```bash
./setup_branding.sh --skip-build
```

Usa questa opzione per:
- ⚡ Test rapidi delle modifiche asset
- 🔄 Iterazioni design multiple
- 📦 Build separata con comandi custom

---

## 📁 Struttura File Generati

### Asset Flutter

```
assets/
├── icons/
│   ├── pet_care_icon_512_bordered.png
│   └── pet_care_icon_1024_bordered.png
└── logo/
    ├── my_pet_care_logo.webp
    └── my_pet_care_logo.png  (convertito automaticamente)
```

### Icone Android

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png        (48x48)
├── mipmap-hdpi/ic_launcher.png        (72x72)
├── mipmap-xhdpi/ic_launcher.png       (96x96)
├── mipmap-xxhdpi/ic_launcher.png      (144x144)
├── mipmap-xxxhdpi/ic_launcher.png     (192x192)
├── drawable*/launch_background.xml    (4 varianti)
└── values*/styles.xml                 (6 file Android 12+)
```

### Icone iOS

```
ios/Runner/Assets.xcassets/
├── AppIcon.appiconset/                (20+ varianti)
└── LaunchImage.imageset/              (splash images)
```

### Web Assets

```
web/
├── favicon.png                        (32x32)
├── manifest.json                      (aggiornato)
└── icons/
    ├── Icon-192.png
    ├── Icon-512.png
    ├── Icon-maskable-192.png
    └── Icon-maskable-512.png
```

---

## 🎨 Specifiche Design

### Icone App

**Android Icon (512x512px):**
- Formato: PNG con trasparenza
- Bordo di sicurezza: 10% (safe area)
- Stile: Flat/Material Design
- Background: Trasparente o solido

**iOS Icon (1024x1024px):**
- Formato: PNG **SENZA trasparenza** (requisito Apple)
- Bordo di sicurezza: 10%
- Angoli: Gestiti automaticamente da iOS (non pre-arrotondare)
- Background: Solido (nessuna trasparenza)

### Splash Screen Logo

**Formato:**
- PNG o WebP
- Dimensioni: 512x512px (consigliato)
- Trasparenza: Supportata

**Colori Brand (MyPetCare):**
- Primary Light: `#1C8275`
- Primary Dark: `#145B52`

---

## 🔧 Configurazione Avanzata

### Personalizza pubspec.yaml

Modifica `pubspec.yaml` per cambiare configurazione:

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icons/pet_care_icon_512_bordered.png"
  image_path_ios: "assets/icons/pet_care_icon_1024_bordered.png"
  remove_alpha_ios: true
  min_sdk_android: 21

flutter_native_splash:
  color: "#1C8275"
  color_dark: "#145B52"
  image: assets/logo/my_pet_care_logo.png
  branding: assets/icons/pet_care_icon_512_bordered.png
  android_12:
    image: assets/logo/my_pet_care_logo.png
    icon_background_color: "#1C8275"
    icon_background_color_dark: "#145B52"
  web: true
```

Poi riesegui:
```bash
./setup_branding.sh
```

---

## 🐛 Troubleshooting

### Errore: "Flutter non trovato"

**Soluzione:**
```bash
# Verifica Flutter nel PATH
which flutter

# Se manca, aggiungi al PATH (esempio)
export PATH="$PATH:/opt/flutter/bin"
```

---

### Errore: "Manca il file pet_care_icon_*.png"

**Soluzione:**
Verifica che i 3 file siano nella root del progetto:
```bash
ls -la pet_care_icon_*.png my_pet_care_logo.webp
```

Se mancano, copiali nella root prima di eseguire lo script.

---

### Warning: "ImageMagick non disponibile"

**Impatto:**
- Favicon.png sarà 512x512 invece di 32x32
- Icon-192.png sarà 512x512 invece di 192x192
- Nessun problema critico, solo dimensioni non ottimizzate

**Soluzione (opzionale):**
```bash
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick          # macOS
```

Poi riesegui lo script.

---

### flutter_native_splash: "Unsupported file format: webp"

**Causa:** `flutter_native_splash` non supporta WebP.

**Soluzione:** Lo script converte automaticamente WebP → PNG.

Se la conversione fallisce manualmente:
```bash
convert my_pet_care_logo.webp assets/logo/my_pet_care_logo.png
```

---

### Build Android Fallito

**Causa comune:** Problemi Gradle o package deprecati.

**Soluzione:**
1. Rimuovi `uni_links` da `pubspec.yaml` (deprecato)
2. Pulisci cache Android:
   ```bash
   rm -rf android/build android/app/build android/.gradle
   flutter pub get
   ```
3. Riprova build:
   ```bash
   flutter build apk --release
   ```

---

## 📊 Checklist Completa

### Pre-Generazione
- [ ] File `pet_care_icon_512_bordered.png` presente (512x512px)
- [ ] File `pet_care_icon_1024_bordered.png` presente (1024x1024px)
- [ ] File `my_pet_care_logo.webp` presente (512x512px)
- [ ] Flutter SDK installato e funzionante
- [ ] (Opzionale) ImageMagick installato

### Post-Generazione
- [ ] Icone Android generate (5 densità)
- [ ] Icone iOS generate (20+ varianti)
- [ ] Splash screen Android/iOS creati
- [ ] Web manifest.json aggiornato
- [ ] Web icons create (192px, 512px, maskable)
- [ ] Build web/apk completata con successo

### Verifica Visiva
- [ ] Icona app Android appare corretta in launcher
- [ ] Icona app iOS appare corretta (se build iOS)
- [ ] Splash screen mostra logo centrato
- [ ] Web app mostra icona corretta in browser
- [ ] PWA manifest.json valido (test con Lighthouse)

---

## 🔄 Workflow Iterativo

**Scenario: Modifiche al logo**

1. Sostituisci `my_pet_care_logo.webp` con nuova versione
2. Esegui setup veloce:
   ```bash
   ./setup_branding.sh --skip-build
   ```
3. Test immediato:
   ```bash
   flutter run
   ```
4. Build finale quando soddisfatto:
   ```bash
   flutter build web --release
   flutter build apk --release
   ```

---

## 📚 Riferimenti

- [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons)
- [flutter_native_splash](https://pub.dev/packages/flutter_native_splash)
- [Android Adaptive Icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- [iOS App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [PWA Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

## 💡 Tips & Best Practices

1. **Versionamento Asset:** Committa icone sorgente in Git per tracking
2. **Design System:** Mantieni source files (SVG/AI) per modifiche future
3. **Test Multi-Device:** Verifica icone su dispositivi reali (non solo emulatori)
4. **Automation:** Integra script in CI/CD per build automatizzate
5. **Backup:** Salva `generated/` prima di rigenerare (se modifiche custom)

---

✅ **Setup completato!** Icone e splash screen pronti per deploy.

**Prossimi step:**
- 🚀 Deploy su Google Play Store / App Store
- 🌐 Deploy web su Firebase Hosting / Cloud Run
- 📊 Monitor download/installazioni
