# ✅ GDPR Compliance Checklist – My Pet Care

Questo documento verifica la conformità dell'applicazione My Pet Care con il GDPR (Regolamento UE 2016/679) e la normativa italiana sulla privacy.

---

## 📋 Checklist Generale

### 1. Trasparenza e Informativa (Art. 13-14 GDPR)

- [x] **Privacy Policy pubblicata** in italiano e inglese
  - File: `docs/legal/privacy_policy_it.md`, `privacy_policy_en.md`
  - URL: https://mypetcareapp.org/privacy

- [x] **Privacy Policy accessibile da app**
  - LoginScreen: link "Privacy Policy" con `url_launcher`
  - Posizione: In fondo alla schermata di login

- [x] **Informativa completa contiene:**
  - [x] Identità e contatti del Titolare
  - [x] Finalità del trattamento
  - [x] Base giuridica (contratto, legittimo interesse, consenso)
  - [x] Categorie di dati trattati
  - [x] Destinatari dei dati (Stripe, PayPal, Firebase)
  - [x] Trasferimenti extra UE (SCC)
  - [x] Periodo di conservazione
  - [x] Diritti dell'interessato (accesso, rettifica, cancellazione, etc.)
  - [x] Diritto di reclamo al Garante Privacy

- [ ] **TODO: Aggiornare placeholder nei documenti**
  - [ ] Sostituire `[inserisci data]` con data effettiva
  - [ ] Sostituire `[tua società/studio]` con ragione sociale
  - [ ] Sostituire `[email]` con email DPO ufficiale
  - [ ] Sostituire `[pec se presente]` con PEC aziendale

---

### 2. Consenso Informato (Art. 7 GDPR)

#### Push Notifications (Consenso Richiesto)

- [x] **Richiesta permesso FCM implementata**
  - File: `lib/core/notifications.dart`
  - Funzione: `FirebaseMessaging.instance.requestPermission()`

- [ ] **TODO: Aggiungere spiegazione chiara prima della richiesta**
  ```dart
  // Consigliato: mostrare dialog esplicativo
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Notifiche Push'),
      content: const Text(
        'My Pet Care desidera inviarti notifiche per:\n\n'
        '• Conferme prenotazioni\n'
        '• Promemoria appuntamenti\n'
        '• Promozioni esclusive\n\n'
        'Puoi modificare questa scelta nelle impostazioni.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Rifiuta'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            setupNotifications(); // Richiesta permesso
          },
          child: const Text('Accetta'),
        ),
      ],
    ),
  );
  ```

#### Geolocalizzazione (Se Implementata)

- [ ] **TODO: Verificare se geolocalizzazione è usata**
  - Package: `geolocator` presente in `pubspec.yaml`
  - **Se usata:** Richiedere consenso esplicito con spiegazione

- [ ] **TODO: Implementare richiesta consenso geolocalizzazione**
  ```dart
  // Solo se necessaria per la funzionalità
  final consent = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Permesso Posizione'),
      content: const Text(
        'My Pet Care richiede accesso alla tua posizione per:\n\n'
        '• Trovare professionisti vicino a te\n'
        '• Calcolare distanze\n\n'
        'Puoi rifiutare e cercare manualmente.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Rifiuta')),
        ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Accetta')),
      ],
    ),
  );
  
  if (consent == true) {
    await Geolocator.requestPermission();
  }
  ```

#### Marketing e Newsletter (Opzionale)

- [ ] **TODO: Se implementato marketing via email**
  - Checkbox opzionale in fase di registrazione
  - Testo: "Desidero ricevere offerte e promozioni via email"
  - Default: NON spuntato (opt-in esplicito)

---

### 3. Diritti dell'Interessato (Art. 15-22 GDPR)

#### Diritto di Accesso (Art. 15)

- [ ] **TODO: Implementare "Esporta i miei dati"**
  - Posizione suggerita: Schermata Impostazioni/Profilo
  - Funzionalità: Export dati utente in formato JSON/PDF
  - Dati inclusi: Account, prenotazioni, preferenze

```dart
// Esempio implementazione
Future<void> exportUserData(String userId) async {
  final userData = await FirebaseFirestore.instance
      .collection('users')
      .doc(userId)
      .get();
  
  final bookings = await FirebaseFirestore.instance
      .collection('bookings')
      .where('user_id', isEqualTo: userId)
      .get();
  
  final exportData = {
    'user': userData.data(),
    'bookings': bookings.docs.map((d) => d.data()).toList(),
    'export_date': DateTime.now().toIso8601String(),
  };
  
  // Invia via email o permetti download
  // Implementare con pdf package o share_plus
}
```

#### Diritto di Rettifica (Art. 16)

- [ ] **TODO: Implementare modifica dati account**
  - Posizione suggerita: Schermata Profilo
  - Campi modificabili: Nome, email, telefono, preferenze

#### Diritto di Cancellazione (Art. 17 - "Diritto all'Oblio")

- [ ] **TODO: Implementare "Cancella Account"**
  - Posizione: Impostazioni → Zona pericolosa (red zone)
  - Conferma con password
  - Processo:
    1. Anonimizzare dati prenotazioni (sostituire nome con "Utente Cancellato")
    2. Eliminare dati personali da Firestore
    3. Eliminare account Firebase Auth
    4. Inviare email conferma cancellazione

```dart
// Esempio implementazione
Future<void> deleteAccount(String userId, String password) async {
  // 1. Conferma password
  final user = FirebaseAuth.instance.currentUser!;
  final credential = EmailAuthProvider.credential(
    email: user.email!,
    password: password,
  );
  await user.reauthenticateWithCredential(credential);
  
  // 2. Anonimizzare prenotazioni (mantieni per storico PRO)
  final bookings = await FirebaseFirestore.instance
      .collection('bookings')
      .where('user_id', isEqualTo: userId)
      .get();
  
  for (var doc in bookings.docs) {
    await doc.reference.update({
      'user_name': 'Utente Cancellato',
      'user_email': 'deleted@anonymous.local',
      'anonymized': true,
      'anonymized_at': FieldValue.serverTimestamp(),
    });
  }
  
  // 3. Elimina documento utente
  await FirebaseFirestore.instance
      .collection('users')
      .doc(userId)
      .delete();
  
  // 4. Elimina account Firebase Auth
  await user.delete();
  
  // 5. Invia email conferma (backend)
  // POST /api/user/deletion-confirmation
}
```

#### Diritto di Portabilità (Art. 20)

- [x] **Parzialmente coperto da "Esporta dati"**
  - Formato machine-readable (JSON)
  - Include tutti i dati forniti dall'utente

#### Diritto di Opposizione (Art. 21)

- [x] **Opposizione al trattamento marketing**
  - Gestito tramite cancellazione consenso notifiche push
  - Disabilitare nelle impostazioni device

- [ ] **TODO: Implementare opt-out marketing email (se implementato)**

---

### 4. Sicurezza dei Dati (Art. 32 GDPR)

#### Misure Tecniche

- [x] **Autenticazione Firebase**
  - Email/password con hash bcrypt
  - Sessioni token-based sicure

- [x] **Connessioni HTTPS**
  - API backend: HTTPS obbligatorio
  - Firestore: SSL/TLS integrato

- [x] **Crittografia dati in transito**
  - Firebase: TLS 1.2+
  - Stripe/PayPal: PCI-DSS compliant

- [ ] **TODO: Verificare crittografia dati at-rest**
  - Firestore: crittografia automatica (verificare configurazione)
  - Backup: verificare encryption backend

#### Misure Organizzative

- [ ] **TODO: Logging accessi e modifiche**
  - Implementare audit log per operazioni sensibili:
    - Accesso dati utente
    - Modifiche dati
    - Cancellazione account
    - Export dati

```dart
// Esempio audit log
Future<void> logAuditEvent(String userId, String action, Map<String, dynamic> details) async {
  await FirebaseFirestore.instance.collection('audit_logs').add({
    'user_id': userId,
    'action': action,
    'details': details,
    'timestamp': FieldValue.serverTimestamp(),
    'ip_address': '[da backend]',
    'user_agent': '[da backend]',
  });
}

// Chiamare in operazioni sensibili
await logAuditEvent(userId, 'DATA_EXPORT', {'format': 'JSON'});
await logAuditEvent(userId, 'ACCOUNT_DELETION', {'reason': 'user_request'});
```

- [ ] **TODO: Limitazione accessi backend**
  - Firebase Admin SDK: credenziali sicure
  - Firestore Security Rules: verificare rules production

```javascript
// Firestore Security Rules (esempio)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utenti possono leggere/modificare solo i propri dati
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Prenotazioni: lettura solo proprie, scrittura validata
    match /bookings/{bookingId} {
      allow read: if request.auth.uid == resource.data.user_id 
                  || request.auth.uid == resource.data.pro_id;
      allow create: if request.auth.uid != null;
      allow update: if request.auth.uid == resource.data.user_id
                    || request.auth.uid == resource.data.pro_id;
    }
    
    // Admin metrics: solo backend
    match /metrics/{doc} {
      allow read, write: if false; // Solo via Admin SDK
    }
  }
}
```

---

### 5. Data Breach e Notifiche (Art. 33-34 GDPR)

- [ ] **TODO: Procedura Data Breach**
  - Documentare processo di notifica Garante Privacy (72 ore)
  - Template comunicazione agli interessati
  - Responsabile data breach: [email DPO]

- [ ] **TODO: Monitoraggio sicurezza**
  - Firebase Crashlytics: crash report
  - Backend logging: accessi anomali
  - Alert automatici: tentativi brute-force, accessi non autorizzati

---

### 6. Privacy by Design e by Default (Art. 25 GDPR)

#### Privacy by Design

- [x] **Minimizzazione dati**
  - Solo dati necessari raccolti (nome, email, prenotazioni)
  - Nessun dato sensibile sanitario

- [x] **Pseudonimizzazione**
  - User ID: Firebase UID (pseudonimo)
  - Pagamenti: gestiti da terze parti (Stripe/PayPal)

- [ ] **TODO: Limitazione conservazione**
  - Definire data retention policy:
    - Account inattivi: 2 anni → notifica → 6 mesi → cancellazione
    - Prenotazioni completate: 5 anni (obbligo fiscale IT) → anonimizzazione
    - Log audit: 1 anno → cancellazione

#### Privacy by Default

- [x] **Consensi opzionali di default**
  - Marketing: opt-in esplicito (se implementato)
  - Geolocalizzazione: richiesta solo quando necessaria

- [ ] **TODO: Settings privacy granulari**
  ```dart
  // Esempio Impostazioni Privacy
  class PrivacySettings {
    bool pushNotifications = true;      // Necessario per conferme
    bool marketingEmails = false;       // Default: NO
    bool locationTracking = false;      // Default: NO (richiedi quando serve)
    bool dataAnalytics = true;          // Analytics anonimizzate
  }
  ```

---

### 7. Terze Parti e Sub-Processori (Art. 28 GDPR)

#### Firebase (Google)

- [x] **Data Processing Agreement (DPA)**
  - Firebase: DPA automatico con Terms of Service
  - Standard Contractual Clauses (SCC): incluse
  - Servers: EU e US (SCC compliance)

- [ ] **TODO: Documentare Firebase DPA**
  - Link: https://firebase.google.com/support/privacy
  - Verificare: Data Processing and Security Terms

#### Stripe

- [x] **PCI-DSS Compliance**
  - Stripe: certificato PCI Level 1
  - My Pet Care: non memorizza dati carte (tokenization)

- [x] **DPA Stripe**
  - DPA automatico con Stripe Terms
  - SCC per trasferimenti extra UE
  - Link: https://stripe.com/privacy

#### PayPal

- [x] **DPA PayPal**
  - DPA automatico con PayPal Terms
  - SCC compliance
  - Link: https://www.paypal.com/privacy

- [ ] **TODO: Elenco Sub-Processori in Privacy Policy**
  - Aggiornare sezione "5. Condivisione" con link DPA terze parti

---

### 8. Trasferimenti Extra UE (Art. 44-50 GDPR)

- [x] **Standard Contractual Clauses (SCC)**
  - Firebase: SCC incluse (Google Cloud)
  - Stripe: SCC compliance
  - PayPal: SCC compliance

- [x] **Informativa trasferimenti**
  - Privacy Policy sezione 7: "Trasferimenti extra UE"
  - Meccanismi di protezione spiegati

---

### 9. Responsabile Protezione Dati (DPO) (Art. 37-39 GDPR)

- [ ] **TODO: Nominare DPO (Data Protection Officer)**
  - **Obbligo:** Se trattamento dati su larga scala
  - **Facoltativo ma raccomandato:** Per app pubbliche
  - **Alternativa:** Responsabile Privacy interno

- [ ] **TODO: Pubblicare contatti DPO**
  - Privacy Policy: email DPO
  - App: sezione Impostazioni → "Contatta DPO"

```dart
// Esempio contact DPO in app
ListTile(
  leading: const Icon(Icons.shield),
  title: const Text('Contatta il Responsabile Privacy'),
  subtitle: const Text('Per richieste GDPR (accesso, cancellazione, etc.)'),
  onTap: () => _launchUrl('mailto:dpo@mypetcareapp.org?subject=Richiesta GDPR'),
)
```

---

### 10. Record delle Attività di Trattamento (Art. 30 GDPR)

- [ ] **TODO: Documentare trattamenti dati**

**Esempio Record (da mantenere internamente):**

| Trattamento | Finalità | Base Giuridica | Categorie Dati | Destinatari | Conservazione |
|-------------|----------|----------------|----------------|-------------|---------------|
| Account utente | Gestione registrazione | Contratto (Art. 6.1.b) | Nome, email, password hash | Firebase Auth | Fino a cancellazione account |
| Prenotazioni | Erogazione servizio | Contratto (Art. 6.1.b) | Nome, email, pet info, data/ora | Firebase, PRO professionista | 5 anni (obbligo fiscale) |
| Notifiche Push | Comunicazioni servizio | Consenso (Art. 6.1.a) | Token FCM | Firebase Messaging | Fino a revoca consenso |
| Geolocalizzazione | Ricerca professionisti | Consenso (Art. 6.1.a) | Coordinate GPS | Nessuno (elaborazione locale) | Tempo di sessione |
| Pagamenti | Elaborazione pagamenti | Contratto (Art. 6.1.b) | Email, importo | Stripe, PayPal | Gestito da terze parti |
| Analytics | Miglioramento servizio | Legittimo interesse (Art. 6.1.f) | Dati anonimi uso app | Firebase Analytics | 14 mesi (config Firebase) |

---

## 📊 Riepilogo Stato Conformità

### ✅ Completato (Conformità Attuale)
- [x] Privacy Policy IT/EN pubblicata
- [x] Terms of Service IT pubblicato
- [x] Link Privacy/Terms in LoginScreen
- [x] Autenticazione sicura Firebase
- [x] HTTPS per tutte le comunicazioni
- [x] DPA con terze parti (Firebase, Stripe, PayPal)
- [x] SCC per trasferimenti extra UE
- [x] Minimizzazione dati
- [x] Richiesta permesso FCM

### 🚧 Da Implementare (Priority High)
- [ ] Spiegazione chiara prima richiesta permessi (FCM, location)
- [ ] Funzionalità "Esporta i miei dati" (Art. 15)
- [ ] Funzionalità "Cancella Account" (Art. 17)
- [ ] Firestore Security Rules production
- [ ] Audit logging operazioni sensibili
- [ ] Data retention policy e cleanup automatico
- [ ] Sostituire placeholder nei documenti legali

### 🔍 Da Verificare (Priority Medium)
- [ ] Uso effettivo geolocalizzazione (package presente ma uso da verificare)
- [ ] Implementazione marketing/newsletter (se presente)
- [ ] Backup encryption backend
- [ ] Procedura data breach documentata
- [ ] Nomina DPO o Responsabile Privacy

### 📝 Da Documentare (Priority Low)
- [ ] Record trattamenti (Art. 30) - documento interno
- [ ] Valutazione impatto privacy (DPIA) se necessaria
- [ ] Policy sicurezza backend
- [ ] Training privacy per team

---

## 🎯 Raccomandazioni Prioritarie

### Priority 1 (Pre-Release)
1. **Sostituire placeholder** nei documenti legali (data, email, società)
2. **Implementare dialog consenso FCM** con spiegazione chiara
3. **Pubblicare Privacy/Terms** su https://mypetcareapp.org/privacy e /terms
4. **Implementare "Cancella Account"** con anonimizzazione dati

### Priority 2 (Post-Release entro 30 giorni)
5. **Implementare "Esporta Dati"** per conformità Art. 15
6. **Configurare Firestore Security Rules** production
7. **Implementare audit logging** operazioni sensibili
8. **Definire data retention policy** e cleanup automatico

### Priority 3 (Miglioramenti Continuativi)
9. **Nominare DPO** o Responsabile Privacy
10. **Monitoraggio sicurezza** e alert automatici
11. **Training privacy** per team sviluppo
12. **Review annuale** conformità GDPR

---

## 📞 Risorse Utili

- **Garante Privacy Italiano:** https://www.garanteprivacy.it
- **GDPR Full Text:** https://gdpr-info.eu
- **Firebase Privacy:** https://firebase.google.com/support/privacy
- **Stripe Privacy:** https://stripe.com/privacy
- **PayPal Privacy:** https://www.paypal.com/privacy

---

**Data ultima verifica:** [Da compilare prima del release]

**Responsabile conformità:** [Nome e ruolo]

**Prossima review:** [Data +6 mesi]

---

© 2025 My Pet Care. Tutti i diritti riservati.
