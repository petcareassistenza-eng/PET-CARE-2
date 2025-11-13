# VALUTAZIONE D'IMPATTO SULLA PROTEZIONE DEI DATI (DPIA)

**Data Protection Impact Assessment - DPIA**  
**Ai sensi dell'art. 35 del Regolamento UE 2016/679 (GDPR)**

---

## INFORMAZIONI GENERALI

**Titolo Trattamento:** My Pet Care - Applicazione mobile per servizi di cura animali domestici

**Titolare del Trattamento:**  
Marras Maria Luigia  
Via Florinas 6, 07100 Sassari (SS) - Italia  
Email: petcareassistenza@gmail.com

**Responsabile della DPIA:**  
Marras Maria Luigia

**Data compilazione:** [Inserire data]

**Data revisione prevista:** [Data + 12 mesi]

---

# SEZIONE 1: DESCRIZIONE DEL TRATTAMENTO

## 1.1 Natura del Trattamento

**My Pet Care** è un'applicazione mobile (Android e iOS) che consente ai proprietari di animali domestici di:
- Creare un profilo utente
- Cercare professionisti del settore pet care (veterinari, toelettatori, pet sitter)
- Prenotare servizi con sistema di slot disponibili
- Effettuare pagamenti tramite Stripe o PayPal
- Ricevere notifiche push per conferme e aggiornamenti

I professionisti (PRO) possono:
- Creare profilo professionale
- Gestire calendario disponibilità
- Ricevere prenotazioni
- Sottoscrivere abbonamenti mensili/annuali per accesso funzionalità avanzate

## 1.2 Finalità del Trattamento

1. **Gestione account utenti:** Registrazione, autenticazione, profilo personale
2. **Prenotazione servizi:** Gestione slot, conferme, cancellazioni
3. **Elaborazione pagamenti:** Abbonamenti PRO tramite Stripe/PayPal
4. **Comunicazioni:** Notifiche push su conferme prenotazioni, promemoria
5. **Geolocalizzazione:** Ricerca professionisti vicini (con consenso esplicito)
6. **Miglioramento servizi:** Analytics anonimizzate per ottimizzazione UX

## 1.3 Categorie di Dati Trattati

### Dati Identificativi
- Nome e cognome
- Email
- Numero di telefono (opzionale)
- Password (hash bcrypt, mai in chiaro)

### Dati Relativi agli Animali
- Nome animale
- Tipo (cane, gatto, altro)
- Età/data nascita
- Note sanitarie (opzionale)

### Dati di Prenotazione
- Data e ora prenotazione
- Servizio richiesto
- Note aggiuntive
- Storico prenotazioni

### Dati di Pagamento (Gestiti da Stripe/PayPal)
- Email
- Importo transazione
- ID transazione
- **NOTA:** Dati carte NON salvati nell'app (tokenization Stripe/PayPal)

### Dati di Geolocalizzazione
- Coordinate GPS (latitudine, longitudine)
- **NOTA:** Solo per ricerca professionisti, non persistiti

### Dati Tecnici
- Token FCM (notifiche push)
- Device type, OS version
- Analytics anonimi (eventi app, durata sessione)

## 1.4 Categorie di Interessati

1. **Proprietari di animali domestici** (utenti consumer)
2. **Professionisti del settore pet care** (veterinari, toelettatori, pet sitter)

**Numero stimato interessati:** 1.000-10.000 nel primo anno

## 1.5 Tecnologie e Architettura

### Frontend
- **Flutter 3.35.4** (Android, iOS, Web)
- **Firebase Auth** per autenticazione
- **Cloud Firestore** per database real-time

### Backend
- **Cloud Run** (Google Cloud Platform) per API REST
- **Node.js/TypeScript** per business logic
- **Firebase Admin SDK** per operazioni backend

### Servizi Esterni
- **Stripe Payments Europe Ltd.** - Pagamenti
- **PayPal (Europe) S.à.r.l.** - Pagamenti alternativi
- **Google Firebase** - Autenticazione, database, analytics
- **Google Maps API** - Geolocalizzazione (calcolo distanze)

### Misure di Sicurezza
- **HTTPS/TLS 1.3** per tutte le comunicazioni
- **Firestore Security Rules** per controllo accessi
- **Backup giornalieri** criptati (AES-256)
- **Audit logging** operazioni sensibili
- **Cloud Run auto-scaling** con health checks

---

# SEZIONE 2: ANALISI DEI RISCHI

## 2.1 Metodologia di Valutazione

**Scala Probabilità:**
- **Bassa:** Evento poco probabile (< 10%)
- **Media:** Evento possibile (10-50%)
- **Alta:** Evento probabile (> 50%)

**Scala Gravità:**
- **Bassa:** Impatto limitato, disagi temporanei
- **Media:** Impatto significativo, possibili danni economici
- **Alta:** Impatto grave, danni rilevanti per diritti e libertà

**Rischio Residuo = Probabilità × Gravità (dopo mitigazione)**

---

## 2.2 Matrice dei Rischi

| # | Rischio Identificato | Probabilità | Gravità | Rischio Iniziale | Misura di Mitigazione | Rischio Residuo |
|---|---------------------|-------------|---------|------------------|----------------------|-----------------|
| **R1** | **Accesso non autorizzato ai dati utenti** | Bassa | Media | **Medio** | - Firebase Auth con email/password<br>- Password hash (bcrypt)<br>- Session tokens con TTL<br>- Firestore Security Rules (read/write limitati)<br>- Audit logging accessi | **Basso** |
| **R2** | **Perdita dati per guasto tecnico** | Bassa | Media | **Medio** | - Backup giornalieri automatici<br>- Backup criptati (AES-256)<br>- Retention 30 giorni<br>- Disaster recovery plan<br>- Cloud Run multi-zone deployment | **Basso** |
| **R3** | **Profilazione indebita utenti** | Bassa | Media | **Medio** | - Minimizzazione dati (solo necessari)<br>- Analytics anonimizzate (no IP)<br>- Consenso esplicito per geolocalizzazione<br>- Opt-out analytics disponibile<br>- No algoritmi decisionali automatizzati | **Basso** |
| **R4** | **Trasferimenti extra UE non sicuri** | Media | Bassa | **Medio** | - Standard Contractual Clauses (SCC) con tutti i fornitori<br>- DPA inclusi in Firebase/Stripe/PayPal Terms<br>- Crittografia end-to-end<br>- Monitoraggio conformità fornitori | **Basso** |
| **R5** | **Violazione dati pagamento (data breach)** | Bassa | Alta | **Alto** | - **Tokenization Stripe/PayPal** (no dati carte salvati)<br>- PCI-DSS Level 1 compliance (Stripe)<br>- Webhook signature verification<br>- HTTPS only per API payments<br>- Separazione dati pagamento da database principale | **Basso** |
| **R6** | **Uso improprio geolocalizzazione** | Bassa | Media | **Medio** | - Consenso esplicito richiesto<br>- Dati GPS non persistiti (solo tempo sessione)<br>- Permesso device granulare<br>- Opt-out disponibile sempre<br>- Solo per ricerca professionisti (no tracking) | **Basso** |
| **R7** | **Notifiche push invasive/spam** | Media | Bassa | **Basso** | - Consenso esplicito (permesso device)<br>- Frequenza limitata (no spam)<br>- Opt-out semplice (impostazioni device)<br>- Solo notifiche servizio (conferme prenotazioni)<br>- Marketing opt-in separato | **Molto Basso** |
| **R8** | **Mancato rispetto diritti interessati** | Bassa | Media | **Medio** | - **Funzione "Esporta Dati"** (JSON/PDF) - Art. 15<br>- **Funzione "Cancella Account"** con anonimizzazione - Art. 17<br>- Modifica dati profilo in-app - Art. 16<br>- Revoca consensi disponibile - Art. 21<br>- Email privacy: petcareassistenza@gmail.com | **Basso** |
| **R9** | **Conservazione dati eccessiva** | Media | Bassa | **Basso** | - Data retention policy definita (24 mesi post-chiusura account)<br>- Cleanup automatico dati scaduti<br>- Anonimizzazione prenotazioni (mantieni storico PRO)<br>- Review annuale dati conservati | **Molto Basso** |
| **R10** | **Furto/smarrimento dispositivo utente** | Media | Media | **Medio** | - Logout automatico dopo inattività<br>- Session token con TTL breve (7 giorni)<br>- Autenticazione richiesta per operazioni sensibili<br>- Blocco account remoto disponibile<br>- No dati sensibili in cache locale | **Basso** |

---

## 2.3 Riepilogo Valutazione

### Rischi Alti (Pre-Mitigazione)
- **R5:** Violazione dati pagamento
  - **Mitigato a BASSO** tramite tokenization Stripe/PayPal (no dati carte salvati)

### Rischi Medi (Pre-Mitigazione)
- **R1, R2, R3, R4, R6, R8, R10**
  - **Tutti mitigati a BASSO** tramite misure tecniche e organizzative

### Rischi Bassi (Pre-Mitigazione)
- **R7, R9**
  - **Mitigati a MOLTO BASSO**

---

# SEZIONE 3: CONCLUSIONI E RACCOMANDAZIONI

## 3.1 Valutazione Complessiva del Rischio

**Rischio Residuo Complessivo: BASSO**

Dopo l'implementazione delle misure di mitigazione sopra descritte, il trattamento di dati personali nell'applicazione My Pet Care comporta un **rischio basso** per i diritti e le libertà degli interessati.

**Motivazioni:**
1. ✅ **Minimizzazione dati:** Solo dati strettamente necessari raccolti
2. ✅ **Sicurezza elevata:** Crittografia, autenticazione, backup
3. ✅ **Trasparenza:** Privacy Policy chiara, consensi espliciti
4. ✅ **Controllo utente:** Diritti GDPR implementati (export, delete)
5. ✅ **Fornitori affidabili:** Stripe, PayPal, Google con SCC e DPA
6. ✅ **No dati sensibili:** Nessun dato sanitario, giudiziario, biometrico
7. ✅ **No decisioni automatizzate:** Nessun algoritmo di profilazione

## 3.2 Necessità di Notifica Preventiva al Garante

**❌ NON RICHIESTA**

Ai sensi dell'art. 36 GDPR, la consultazione preventiva con l'Autorità Garante è richiesta solo quando la DPIA evidenzia un **rischio elevato residuo**.

Nel caso di My Pet Care, **tutti i rischi sono stati mitigati a livello BASSO**, pertanto:
- ✅ Non è necessaria notifica preventiva al Garante Privacy
- ✅ È sufficiente mantenere la DPIA aggiornata
- ✅ In caso di data breach, applicare procedura notifica entro 72 ore (Art. 33 GDPR)

## 3.3 Obbligatorietà della DPIA

**Verifica criteri Art. 35 §3 GDPR:**

| Criterio | My Pet Care | Obbligo DPIA |
|----------|-------------|--------------|
| Valutazione sistematica e globale di aspetti personali (profilazione) | ❌ No | No |
| Trattamento su larga scala di categorie particolari di dati (Art. 9) | ❌ No dati sensibili | No |
| Sorveglianza sistematica su larga scala di zona accessibile al pubblico | ❌ No | No |

**Conclusione:** La DPIA per My Pet Care è **facoltativa ma raccomandata** come best practice.

## 3.4 Raccomandazioni per il Titolare

### Priority High (Pre-Production)
1. ✅ **Implementare funzione "Esporta Dati"** (Art. 15 GDPR)
2. ✅ **Implementare funzione "Cancella Account"** (Art. 17 GDPR)
3. ✅ **Sostituire placeholder** nei documenti privacy (email, date)
4. ✅ **Testare webhook Stripe/PayPal** per status updates

### Priority Medium (Post-Launch)
5. ✅ **Configurare data retention policy automatica**
6. ✅ **Implementare audit logging completo**
7. ✅ **Pianificare penetration testing annuale**
8. ✅ **Creare procedura data breach** (Art. 33-34 GDPR)

### Priority Low (Continuous Improvement)
9. ✅ **Review annuale DPIA** (verifica nuovi rischi)
10. ✅ **Training privacy per team** (se ampliato)
11. ✅ **Monitoraggio conformità fornitori** (SCC, DPA)
12. ✅ **Certificazione ISO 27001** (opzionale, se crescita significativa)

---

## 3.5 Piano di Revisione

**Frequenza revisione DPIA:** Almeno annuale

**Trigger per revisione straordinaria:**
- Modifiche significative al trattamento
- Introduzione nuove tecnologie
- Trasferimenti extra UE verso nuovi paesi
- Data breach significativo
- Richieste Autorità Garante
- Cambiamenti normativi (nuove linee guida EDPB)

**Prossima revisione pianificata:** [Data + 12 mesi]

---

## 3.6 Consultazione degli Interessati

**Meccanismi di consultazione implementati:**
- Privacy Policy accessibile in-app (link in LoginScreen)
- Email privacy: petcareassistenza@gmail.com
- Consensi granulari (notifiche, geolocalizzazione)
- Diritti GDPR esercitabili via email

**Feedback utenti:** Da raccogliere nei primi 6 mesi post-lancio tramite:
- Sezione "Contattaci" in app
- Recensioni store (Google Play, App Store)
- Email privacy dedicata

---

# ALLEGATI

## A. Riferimenti Normativi

- **Regolamento UE 2016/679 (GDPR):** Art. 35 (DPIA), Art. 36 (Consultazione preventiva)
- **Linee Guida WP29/EDPB 248 rev.01:** Valutazione d'impatto sulla protezione dei dati
- **D.Lgs. 196/2003** come modificato dal D.Lgs. 101/2018
- **Provvedimento Garante 467/2018:** Elenco trattamenti soggetti a DPIA

## B. Documenti Correlati

1. **Registro dei Trattamenti** (Art. 30 GDPR) - `Registro_Trattamenti.csv`
2. **Nomine Responsabili Esterni** (Art. 28 GDPR) - `Nomine_Responsabili.md`
3. **Privacy Policy IT/EN** - `/docs/legal/privacy_policy_*.md`
4. **Terms of Service** - `/docs/legal/terms_it.md`
5. **Firestore Security Rules** - `/docs/production/firestore/firestore.rules`

## C. Certificazioni Fornitori

- **Google Firebase:** ISO 27001, SOC 2 Type II
- **Stripe:** PCI-DSS Level 1, ISO 27001, SOC 1/2 Type II
- **PayPal:** PCI-DSS, ISO 27001

---

# FIRMA E APPROVAZIONE

**Compilata da:**  
Marras Maria Luigia - Titolare del Trattamento

**Data:** [Inserire data]

**Firma Digitale:**

_______________________________

**Prossima revisione:** [Data + 12 mesi]

**Note:**
- Conservare per 10 anni (obbligo fiscale)
- Aggiornare in caso di modifiche significative
- Disponibile su richiesta Autorità Garante

---

## ISTRUZIONI PER LA CONVERSIONE

**Per convertire in formato Word (.docx):**

1. **Usando Pandoc (Linux/macOS):**
   ```bash
   pandoc DPIA_MyPetCare.md -o DPIA_MyPetCare.docx
   ```

2. **Usando LibreOffice Writer:**
   - File → Apri → Seleziona `DPIA_MyPetCare.md`
   - File → Salva con nome → Formato: Microsoft Word (.docx)

3. **Usando Microsoft Word:**
   - Apri file markdown
   - File → Salva con nome → Formato: Word Document (.docx)

4. **Formattazione finale:**
   - Applica stile "Titolo 1" alle sezioni principali (#)
   - Applica stile "Titolo 2" alle sottosezioni (##)
   - Formatta tabelle con bordi
   - Aggiungi intestazione/piè di pagina con logo aziendale

---

© 2025 My Pet Care - Marras Maria Luigia. Tutti i diritti riservati.

**Documento conforme al GDPR (Reg. UE 2016/679) - Art. 35**
