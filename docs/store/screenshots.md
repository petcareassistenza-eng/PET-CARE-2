# 📸 Screenshot Guidelines – My Pet Care

## 🎯 Obiettivo
Creare screenshot professionali che mostrino le funzionalità chiave dell'app per Google Play Store e App Store.

---

## 📐 Specifiche Tecniche

### Google Play Store
- **Formato:** PNG o JPG
- **Dimensioni raccomandate:** 1242×2688 px (iPhone 6.5" portrait)
- **Quantità:** Minimo 2, raccomandato 6-8
- **Orientamento:** Portrait (verticale)

### App Store (iOS)
- **iPhone 6.5" (Required):** 1242×2688 px
- **iPhone 5.5" (Optional):** 1242×2208 px
- **iPad Pro 12.9" (Optional):** 2048×2732 px
- **Formato:** PNG o JPG
- **Quantità:** Minimo 3, raccomandato 6-10

---

## 📱 Screenshot da Creare

### 1️⃣ Splash Screen + Logo
**Schermata:** App launch con logo My Pet Care

**Elementi chiave:**
- Logo app centrato
- Colori tema (verde #1C8275, amber #FFD140)
- Slogan: "Prenota servizi per il tuo animale"

**Screenshot device:** iPhone 6.5" portrait

**Note tecniche:**
```bash
# Cattura splash screen all'avvio app
flutter run -d chrome
# Apri DevTools, seleziona iPhone 12 Pro Max (1242×2688)
# Screenshot al primo frame
```

---

### 2️⃣ Home Screen – Lista Professionisti
**Schermata:** HomeScreen con lista PRO disponibili

**Elementi chiave:**
- AppBar con logo e titolo
- Card professionisti con:
  - Avatar/icona
  - Nome professionista
  - Categoria (veterinario, toelettatore, etc.)
  - Rating stelle
- Pulsanti "Prenota servizio" e "Le mie prenotazioni"
- Navigazione bottom bar

**Screenshot device:** iPhone 6.5" portrait

**Annotazioni da aggiungere:**
- Freccia su "Prenota servizio" con testo: "Prenota in 1 click"
- Badge su card PRO: "Professionisti verificati"

---

### 3️⃣ Scheda Professionista + Calendario
**Schermata:** BookingPage con profilo PRO e slot disponibili

**Elementi chiave:**
- Header professionista:
  - Avatar grande
  - Nome e qualifica
  - Rating e recensioni
  - Badge "PRO verificato"
- Service selector dropdown (toilettatura, visita, etc.)
- Calendario slot disponibili (griglia giorni)
- Orari selezionabili
- Prezzo servizio visibile

**Screenshot device:** iPhone 6.5" portrait

**Annotazioni:**
- Highlight su slot disponibile: "Slot in tempo reale"
- Badge su prezzi: "Pagamento sicuro"

---

### 4️⃣ Conferma Prenotazione
**Schermata:** Dialog conferma booking dopo selezione slot

**Elementi chiave:**
- Riepilogo prenotazione:
  - Data e ora
  - Servizio selezionato
  - PRO professionista
  - Prezzo totale
- Campo coupon code (opzionale)
- Pulsanti "Conferma" e "Annulla"
- Icona sicurezza pagamento (Stripe/PayPal)

**Screenshot device:** iPhone 6.5" portrait

**Annotazioni:**
- Badge "Pagamento sicuro Stripe/PayPal"
- Testo: "Usa codici promozionali FREE-1M"

---

### 5️⃣ Paywall PRO (Abbonamenti)
**Schermata:** PaywallScreen con piani abbonamento

**Elementi chiave:**
- Titolo: "Diventa PRO"
- Lista benefici PRO:
  - ✅ Calendario illimitato
  - ✅ Metriche avanzate
  - ✅ Notifiche prioritarie
  - ✅ Badge verificato
- Pricing plans:
  - Mensile €9.99
  - Trimestrale (sconto)
  - Annuale (sconto maggiore)
- Pulsanti Stripe e PayPal
- Link Terms e Privacy

**Screenshot device:** iPhone 6.5" portrait

**Annotazioni:**
- Badge "Prova 7 giorni gratis" (se implementato)
- Highlight su piano più conveniente

---

### 6️⃣ Le Mie Prenotazioni + Notifiche
**Schermata:** MyBookingsScreen con lista prenotazioni

**Elementi chiave:**
- AppBar "Le mie prenotazioni"
- ListView bookings con:
  - Icona servizio (🐾)
  - Nome servizio + PRO
  - Data e ora
  - Status badge (confirmed/cancelled/completed)
  - Pulsante "Annulla" (per confirmed)
- Snackbar notifica push visibile in overlay:
  - "Prenotazione confermata ✅"
  - "Nuova promozione disponibile 🎁"

**Screenshot device:** iPhone 6.5" portrait

**Annotazioni:**
- Freccia su notifica: "Notifiche in tempo reale"
- Badge su lista: "Gestisci facilmente"

---

## 🎨 Design Guidelines per Screenshot

### Branding Consistency
- **Colori tema:** Verde #1C8275, Amber #FFD140
- **Font:** Roboto (Material Design default)
- **Logo:** Sempre visibile in AppBar
- **Icone:** Material Icons standard

### Annotazioni e Callouts
- **Tool consigliato:** Figma, Canva, Photoshop
- **Elementi da aggiungere:**
  - Frecce direzionali (colore accent amber)
  - Testi descrittivi brevi (max 5 parole)
  - Badge funzionalità ("Sicuro", "Veloce", "Verificato")
  - Ombre e contorni per evidenziare elementi chiave

### Best Practices
✅ **DO:**
- Usa dati realistici (nomi, date, prezzi credibili)
- Mostra funzionalità uniche e differenzianti
- Aggiungi annotazioni chiare e leggibili
- Usa colori brand coerenti
- Crea versione "clean" (senza annotazioni) e "annotated" (con callouts)

❌ **DON'T:**
- Non mostrare errori o stati di loading
- Non usare placeholder text ("Lorem ipsum")
- Non includere informazioni personali reali
- Non usare screenshot sfocati o pixelati
- Non sovraccaricare con troppe annotazioni

---

## 🛠️ Tools per Creare Screenshot

### Device Frame
- **Mockuphone:** https://mockuphone.com
- **Smartmockups:** https://smartmockups.com
- **Device Frames (Figma):** Template gratuiti

### Annotazioni
- **Figma:** Design tool completo
- **Canva:** Template screenshot app store
- **Photoshop:** Editing avanzato

### Cattura da Flutter Web
```bash
# Avvia app in Chrome con device emulation
cd /home/user/flutter_app && flutter run -d chrome

# Nel browser (Chrome DevTools):
# 1. Apri DevTools (F12)
# 2. Seleziona "Toggle device toolbar"
# 3. Scegli "iPhone 12 Pro Max" (1242×2688)
# 4. Cattura screenshot (Ctrl+Shift+M)
```

### Cattura da Android Emulator
```bash
# Avvia emulator Pixel 6 Pro (1440×3120 - resize to 1242×2688)
flutter run -d emulator

# Cattura screenshot:
# - Toolbar emulator: Camera icon
# - Oppure: adb shell screencap -p /sdcard/screenshot.png
```

---

## 📋 Checklist Finale

### Google Play Store (6-8 screenshot)
- [ ] 1. Splash screen + logo
- [ ] 2. Home con lista PRO
- [ ] 3. Scheda professionista + calendario
- [ ] 4. Conferma prenotazione
- [ ] 5. Paywall PRO
- [ ] 6. Le mie prenotazioni + notifica
- [ ] 7. (Opzionale) Login screen
- [ ] 8. (Opzionale) Service selector detail

### App Store (6-10 screenshot)
- [ ] iPhone 6.5" (1242×2688): stessi 6 screenshot sopra
- [ ] iPhone 5.5" (1242×2208): resize/crop dei 6 screenshot
- [ ] iPad Pro 12.9" (opzionale): versione tablet layout

### Device Frames
- [ ] Applicati frame realistici (iPhone, Android)
- [ ] Background neutro o con branding leggero
- [ ] Ombre device per effetto 3D

### Annotazioni
- [ ] Callouts chiari e leggibili
- [ ] Colori brand (verde/amber)
- [ ] Testi brevi (max 5 parole per callout)
- [ ] Badge funzionalità chiave

### File Naming
```
screenshots/
├── google_play/
│   ├── 01_splash_screen_1242x2688.png
│   ├── 02_home_pros_1242x2688.png
│   ├── 03_booking_calendar_1242x2688.png
│   ├── 04_confirm_booking_1242x2688.png
│   ├── 05_paywall_pro_1242x2688.png
│   └── 06_my_bookings_notifications_1242x2688.png
└── app_store/
    ├── iphone_65/
    │   ├── 01_splash_screen_1242x2688.png
    │   └── ... (stessi nomi)
    └── iphone_55/
        ├── 01_splash_screen_1242x2208.png
        └── ... (stessi nomi)
```

---

## 📅 Timeline Creazione

**Fase 1: Cattura Screenshot Raw (1-2 ore)**
- Avviare app in device emulation
- Navigare a tutte le schermate chiave
- Catturare screenshot puliti (no annotazioni)

**Fase 2: Post-Processing (2-3 ore)**
- Applicare device frames
- Aggiungere annotazioni e callouts
- Ottimizzare colori e contrasto
- Export finali PNG/JPG

**Fase 3: Review e Upload (1 ora)**
- Verificare dimensioni e qualità
- Controllare naming conventions
- Upload su Play Console / App Store Connect

**Tempo totale stimato:** 4-6 ore

---

## 📊 A/B Testing (Post-Launch)

Dopo il lancio, considera di testare varianti:
- Screenshot con/senza annotazioni
- Ordine diverso (feature più richieste prima)
- Stili annotazioni (minimaliste vs dettagliate)
- Device frames (realistici vs flat)

**Tool A/B testing:**
- Google Play Store: Esperimenti grafici integrati
- App Store: Richiede upload manuale varianti

---

© 2025 My Pet Care. Tutti i diritti riservati.
