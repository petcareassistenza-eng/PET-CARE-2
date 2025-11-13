# 📚 My Pet Care - Documentazione

Questa directory contiene tutta la documentazione legale e materiali per gli store (Google Play Store e App Store).

---

## 📁 Struttura Directory

```
docs/
├── README.md                           # Questo file
├── legal/                             # Documentazione legale
│   ├── privacy_policy_it.md          # Privacy Policy in italiano (GDPR compliant)
│   ├── privacy_policy_en.md          # Privacy Policy in inglese
│   └── terms_it.md                   # Termini di Servizio in italiano
└── store/                             # Materiali per store
    ├── google_play_listing.md        # Scheda completa Google Play Store
    ├── app_store_listing.md          # Scheda completa App Store (iOS)
    └── screenshots.md                # Guida completa per creare screenshot
```

---

## 🔒 Documentazione Legale

### Privacy Policy (GDPR Compliant)
- **File IT:** `legal/privacy_policy_it.md`
- **File EN:** `legal/privacy_policy_en.md`
- **URL Produzione:** https://mypetcareapp.org/privacy
- **Conformità:** GDPR (Reg. UE 679/2016), normativa italiana
- **Ultimo aggiornamento:** [inserire data prima della pubblicazione]

**Elementi chiave:**
- Titolare del trattamento e contatti DPO
- Dati trattati (identificativi, prenotazioni, geolocalizzazione, pagamenti)
- Finalità e basi giuridiche (contratto, legittimo interesse, consenso)
- Conservazione e cancellazione dati
- Condivisione con terze parti (Stripe, PayPal, Firebase)
- Diritti utente (accesso, rettifica, cancellazione, portabilità)
- Trasferimenti extra UE (Standard Contractual Clauses)
- Misure di sicurezza

### Terms of Service
- **File IT:** `legal/terms_it.md`
- **URL Produzione:** https://mypetcareapp.org/terms
- **Legge applicabile:** Legge italiana
- **Foro competente:** Sassari

**Elementi chiave:**
- Oggetto della piattaforma (messa in contatto utenti/professionisti)
- Ruoli e responsabilità (professionisti autonomi)
- Gestione account e credenziali
- Pagamenti sicuri (Stripe/PayPal)
- Politiche cancellazioni e rimborsi
- Abbonamenti PRO
- Limitazione di responsabilità
- Modifiche ai termini

---

## 🛍️ Materiali Store

### Google Play Store
- **File:** `store/google_play_listing.md`
- **Contiene:**
  - Titolo e sottotitolo ottimizzati (ASO)
  - Descrizione breve (80 caratteri)
  - Descrizione completa (4000 caratteri)
  - Keywords e categoria
  - URL obbligatori (privacy, terms, support)
  - Specifiche asset grafici (icon, feature graphic, screenshot)
  - Checklist pre-pubblicazione

### App Store (iOS)
- **File:** `store/app_store_listing.md`
- **Contiene:**
  - Nome app e sottotitolo (30 caratteri)
  - Descrizione completa (4000 caratteri)
  - Keywords (100 caratteri totali)
  - Categorie (Lifestyle, Utilities)
  - URL obbligatori (privacy, EULA, support)
  - Specifiche screenshot (iPhone 6.5", 5.5", iPad Pro)
  - App Review Information (account demo, note per reviewer)
  - Checklist App Store Guidelines compliance

### Screenshot Guidelines
- **File:** `store/screenshots.md`
- **Contiene:**
  - Specifiche tecniche (dimensioni, formati, orientamenti)
  - Lista 6 screenshot da creare:
    1. Splash Screen + logo
    2. Home con lista PRO
    3. Scheda professionista + calendario
    4. Conferma prenotazione
    5. Paywall PRO
    6. Le mie prenotazioni + notifiche
  - Design guidelines (branding, annotazioni, best practices)
  - Tools consigliati (Mockuphone, Figma, Canva)
  - Comandi Flutter per cattura screenshot
  - Checklist finale e file naming conventions
  - Timeline creazione (4-6 ore stimate)

---

## 🔗 Link e Integrazioni

### In-App Links
**LoginScreen** (`lib/screens/login_screen.dart`):
- Privacy Policy link → https://mypetcareapp.org/privacy
- Terms of Service link → https://mypetcareapp.org/terms
- Implementato con `url_launcher` package

**pubspec.yaml metadata**:
```yaml
homepage: https://mypetcareapp.org
repository: https://github.com/[username]/my_pet_care
issue_tracker: https://github.com/[username]/my_pet_care/issues

# Legal URLs (nei commenti per riferimento)
# Privacy Policy: https://mypetcareapp.org/privacy
# Terms of Service: https://mypetcareapp.org/terms
# Support Email: [inserisci email supporto]
```

### Store URLs
Entrambi gli store (Google Play e App Store) richiedono:
- **Privacy Policy URL:** https://mypetcareapp.org/privacy
- **Terms of Service URL:** https://mypetcareapp.org/terms
- **Support URL:** https://mypetcareapp.org/support (da configurare)

---

## ✅ Checklist Release 1.0

### Documentazione Legale
- [x] Privacy Policy IT creato
- [x] Privacy Policy EN creato
- [x] Terms of Service IT creato
- [ ] Aggiornare [data] e [email] nei documenti legali
- [ ] Pubblicare documenti su https://mypetcareapp.org/privacy e /terms
- [ ] Verificare accessibilità URL da app

### Store Listing
- [x] Google Play listing completo
- [x] App Store listing completo
- [x] Screenshot guidelines create
- [ ] Creare 6 screenshot professionali (vedi screenshots.md)
- [ ] Applicare device frames e annotazioni
- [ ] Preparare feature graphic (1024×500 px per Play Store)
- [ ] Preparare app icon 512×512 (Play) e 1024×1024 (App Store)

### App Integration
- [x] Link Privacy/Terms in LoginScreen
- [x] URLs in pubspec.yaml metadata
- [ ] Testare apertura link Privacy/Terms da app
- [ ] Verificare `url_launcher` su Android e iOS
- [ ] Aggiungere Privacy/Terms in app drawer/settings (opzionale)

### GDPR Compliance
- [ ] Verificare richiesta consenso notifiche push con spiegazione chiara
- [ ] Implementare cookie consent (se web app)
- [ ] Verificare data retention policies nel backend
- [ ] Testare flow cancellazione account
- [ ] Verificare anonimizzazione dati cancellati

### Store Submission
- [ ] Google Play Console: completare listing
- [ ] App Store Connect: completare listing
- [ ] Caricare APK/AAB release signed (Android)
- [ ] Caricare IPA via Xcode/Transporter (iOS)
- [ ] Configurare in-app purchases (abbonamenti PRO)
- [ ] TestFlight beta testing (iOS)
- [ ] Pre-launch report (Google Play)
- [ ] Submit for review

---

## 📝 Note Pre-Pubblicazione

### Placeholder da Sostituire
Prima della pubblicazione, sostituire nei documenti legali:
- `[inserisci data]` → Data effettiva (es. "1 gennaio 2025")
- `[tua società/studio]` → Ragione sociale completa
- `[email]` → Email supporto/DPO ufficiale
- `[pec se presente]` → PEC aziendale
- `[email DPO o referente]` → Email responsabile privacy
- `[username]` → Username GitHub (in pubspec.yaml e README)

### URL da Configurare
- `https://mypetcareapp.org/privacy` → Hosting Privacy Policy
- `https://mypetcareapp.org/terms` → Hosting Terms of Service
- `https://mypetcareapp.org/support` → Pagina supporto/FAQ
- `https://mypetcareapp.org` → Website principale (landing page)

### Email da Configurare
- **Support Email:** Per assistenza utenti
- **DPO Email:** Per richieste GDPR (accesso dati, cancellazione, etc.)
- **App Review Contact:** Per comunicazioni store

---

## 🔍 Riferimenti Utili

### GDPR e Privacy
- **Garante Privacy Italiano:** https://www.garanteprivacy.it
- **GDPR Full Text:** https://gdpr-info.eu
- **Standard Contractual Clauses (SCC):** https://ec.europa.eu/info/law/law-topic/data-protection

### Store Guidelines
- **Google Play Policies:** https://play.google.com/about/developer-content-policy/
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Google Play Console:** https://play.google.com/console
- **App Store Connect:** https://appstoreconnect.apple.com

### ASO (App Store Optimization)
- **Google Play ASO Guide:** https://developer.android.com/distribute/best-practices/grow
- **App Store Product Page:** https://developer.apple.com/app-store/product-page/

---

## 📞 Contatti

**Project Repository:** https://github.com/[username]/my_pet_care

**Support Email:** [inserisci email supporto]

**Privacy/DPO Email:** [inserisci email DPO]

---

© 2025 My Pet Care. Tutti i diritti riservati.
