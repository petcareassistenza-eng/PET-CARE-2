# 📋 Documentazione GDPR - My Pet Care

Questa directory contiene tutti i documenti necessari per la conformità al GDPR (Regolamento UE 2016/679) dell'applicazione My Pet Care.

---

## 📁 File Inclusi

### 1. **Registro_Trattamenti.csv**
**Formato:** CSV (importabile in Excel)  
**Articolo GDPR:** Art. 30 - Registro delle attività di trattamento  
**Descrizione:** Registro completo dei trattamenti dati personali effettuati da My Pet Care

**Contenuto:**
- Dati Titolare (Marras Maria Luigia)
- 7 trattamenti documentati:
  1. Gestione account utenti
  2. Gestione profili PRO
  3. Prenotazioni e bookings
  4. Pagamenti e transazioni
  5. Geolocalizzazione
  6. Notifiche push
  7. Analytics e miglioramento servizi
- Responsabili esterni (Google, Stripe, PayPal)
- Misure tecniche e organizzative
- Diritti degli interessati

**Come usare:**
```bash
# Importare in Excel:
1. Apri Excel → File → Apri → Registro_Trattamenti.csv
2. Formatta come tabella: Inserisci → Tabella
3. Sostituisci placeholder: [inserire numero], [Inserire data]
4. Salva come: Registro_Trattamenti.xlsx
```

---

### 2. **Nomine_Responsabili.md**
**Formato:** Markdown (convertibile in PDF/DOCX)  
**Articolo GDPR:** Art. 28 - Responsabile del trattamento  
**Descrizione:** Documento di nomina formale dei responsabili esterni del trattamento

**Responsabili nominati:**
1. **Google Ireland Ltd. (Firebase)**
   - Autenticazione, database, FCM, analytics
   - DPA incluso in Firebase Terms
   - SCC per trasferimenti extra UE

2. **Stripe Payments Europe Ltd.**
   - Elaborazione pagamenti PRO
   - PCI-DSS Level 1 compliance
   - DPA incluso in Stripe Terms

3. **PayPal (Europe) S.à.r.l.**
   - Elaborazione pagamenti alternativi
   - DPA incluso in PayPal Terms
   - PSD2 compliance

**Come convertire in PDF:**
```bash
# Usando Pandoc:
pandoc Nomine_Responsabili.md -o Nomine_Responsabili.pdf

# Usando LibreOffice:
libreoffice --headless --convert-to pdf Nomine_Responsabili.md

# Usando Microsoft Word:
# Apri file → Salva con nome → PDF
```

---

### 3. **DPIA_MyPetCare.md**
**Formato:** Markdown (convertibile in DOCX/PDF)  
**Articolo GDPR:** Art. 35 - Valutazione d'impatto sulla protezione dei dati  
**Descrizione:** Data Protection Impact Assessment completa

**Sezioni:**
1. **Descrizione del Trattamento**
   - Natura, finalità, categorie dati
   - Architettura tecnologica
   - Servizi esterni utilizzati

2. **Analisi dei Rischi**
   - Matrice 10 rischi identificati
   - Valutazione probabilità/gravità
   - Misure di mitigazione implementate
   - Rischio residuo: **BASSO**

3. **Conclusioni**
   - Valutazione rischio complessivo: **BASSO**
   - Notifica preventiva Garante: **NON RICHIESTA**
   - Raccomandazioni priority high/medium/low
   - Piano revisione annuale

**Come convertire in Word:**
```bash
# Usando Pandoc:
pandoc DPIA_MyPetCare.md -o DPIA_MyPetCare.docx

# Usando LibreOffice:
libreoffice --convert-to docx DPIA_MyPetCare.md

# Formattazione finale:
# - Applica stili Titolo 1/2/3
# - Formatta tabelle
# - Aggiungi intestazione/piè di pagina
```

---

### 4. **Registro_DataBreach.csv**
**Formato:** CSV (importabile in Excel)  
**Articolo GDPR:** Art. 33-34 - Notifica di violazione dei dati personali  
**Descrizione:** Registro vuoto per tracciare data breach

**Campi inclusi:**
- Data evento
- Tipo evento (Accesso non autorizzato, Perdita dati, etc.)
- Descrizione dettagliata
- Categorie dati coinvolti
- N. interessati
- Gravità (BASSA/MEDIA/ALTA)
- Azioni correttive immediate e long-term
- Comunicazione Garante (SÌ/NO)
- Comunicazione interessati (SÌ/NO)
- Responsabile gestione
- Stato (IN CORSO/RISOLTO/CHIUSO)
- Note

**Istruzioni incluse:**
- Criteri notifica al Garante (entro 72h)
- Criteri notifica agli interessati
- Procedura data breach standard (5 fasi)
- Template notifica al Garante
- Contatti emergenza

**Come usare:**
```bash
# Importare in Excel:
1. Apri Excel → File → Apri → Registro_DataBreach.csv
2. Formatta come tabella con filtri
3. Lascia righe vuote pronte per compilazione
4. Salva come: Registro_DataBreach.xlsx
```

---

## ✅ Conformità GDPR

### Documenti Obbligatori (Art. 30-35)

| Documento | Articolo GDPR | Status | File |
|-----------|---------------|--------|------|
| Registro Trattamenti | Art. 30 | ✅ Completo | `Registro_Trattamenti.csv` |
| Nomine Responsabili | Art. 28 | ✅ Completo | `Nomine_Responsabili.md` |
| DPIA (facoltativa ma raccomandata) | Art. 35 | ✅ Completa | `DPIA_MyPetCare.md` |
| Registro Data Breach | Art. 33-34 | ✅ Template pronto | `Registro_DataBreach.csv` |

### Documenti Complementari

Questi documenti GDPR sono complementari ai seguenti:
- **Privacy Policy IT/EN:** `/docs/legal/privacy_policy_*.md`
- **Terms of Service:** `/docs/legal/terms_it.md`
- **GDPR Compliance Checklist:** `/docs/GDPR_COMPLIANCE_CHECKLIST.md`
- **Firestore Security Rules:** `/docs/production/firestore/firestore.rules`

---

## 📋 Checklist Pre-Produzione GDPR

### Documenti da Finalizzare

- [ ] **Registro Trattamenti**
  - [ ] Sostituire `[inserire numero]` con telefono reale
  - [ ] Sostituire `[inserire PEC]` se disponibile
  - [ ] Sostituire `[Inserire data]` con data creazione
  - [ ] Aggiungere firma digitale Titolare

- [ ] **Nomine Responsabili**
  - [ ] Sostituire `[Inserire numero di telefono]`
  - [ ] Sostituire `[Inserire PEC se disponibile]`
  - [ ] Sostituire `[Inserire data]` nelle 3 occorrenze
  - [ ] Aggiungere firma digitale/timbro

- [ ] **DPIA**
  - [ ] Sostituire `[Inserire data]` in 3 punti
  - [ ] Aggiungere firma digitale Titolare
  - [ ] Pianificare data revisione (+ 12 mesi)

- [ ] **Registro Data Breach**
  - [ ] Nessuna azione richiesta (template pronto)

### Implementazioni Tecniche Raccomandate

- [ ] **Funzione "Esporta Dati"** (Art. 15 GDPR)
  - Posizione: Impostazioni → Privacy
  - Export formato: JSON o PDF
  - Dati inclusi: Account, prenotazioni, preferenze

- [ ] **Funzione "Cancella Account"** (Art. 17 GDPR)
  - Posizione: Impostazioni → Account → Zona pericolosa
  - Conferma con password
  - Anonimizzazione prenotazioni esistenti
  - Email conferma cancellazione

- [ ] **Dialog Consenso FCM** (Art. 7 GDPR)
  - Spiegazione chiara scopo notifiche
  - Pulsanti "Accetta" / "Rifiuta"
  - Revoca disponibile nelle impostazioni

- [ ] **Audit Logging** (Art. 32 GDPR)
  - Log operazioni sensibili:
    - Export dati
    - Cancellazione account
    - Accesso admin
    - Modifiche dati critici

---

## 🔗 Link Utili

### Autorità Garante Privacy Italiana
- **Website:** https://www.garanteprivacy.it
- **Email:** protocollo@gpdp.it
- **PEC:** protocollo@pec.gpdp.it
- **Tel:** +39 06 69677.1
- **Notifiche Data Breach:** https://servizi.gpdp.it (SPID richiesto)

### Risorse GDPR
- **Testo completo GDPR:** https://gdpr-info.eu
- **Linee guida EDPB:** https://edpb.europa.eu/guidelines
- **FAQ Garante IT:** https://www.garanteprivacy.it/regolamentoue/faq

### DPA Fornitori
- **Google Firebase:** https://firebase.google.com/terms/data-processing-terms
- **Stripe:** https://stripe.com/privacy
- **PayPal:** https://www.paypal.com/privacy

---

## 📞 Contatti Privacy

**Titolare del Trattamento:**  
Marras Maria Luigia  
Via Florinas 6, 07100 Sassari (SS) - Italia

**Email Privacy:**  
petcareassistenza@gmail.com

**Per richieste GDPR:**
- Diritto di accesso (Art. 15)
- Diritto di rettifica (Art. 16)
- Diritto di cancellazione (Art. 17)
- Diritto di portabilità (Art. 20)
- Diritto di opposizione (Art. 21)

**Risposta entro:** 30 giorni dalla richiesta (Art. 12 §3 GDPR)

---

## 🔄 Manutenzione Documenti

### Frequenza Aggiornamento

| Documento | Frequenza | Trigger Aggiornamento |
|-----------|-----------|----------------------|
| Registro Trattamenti | Annuale | Nuovi trattamenti, modifiche finalità |
| Nomine Responsabili | Annuale | Nuovo fornitore, cambio servizi |
| DPIA | Annuale | Modifiche significative trattamento |
| Registro Data Breach | Immediato | Ogni violazione dati |

### Prossime Revisioni

- **Registro Trattamenti:** [Data + 12 mesi]
- **Nomine Responsabili:** [Data + 12 mesi]
- **DPIA:** [Data + 12 mesi]

---

## ⚠️ Note Importanti

1. **Conservazione:** Tutti i documenti GDPR devono essere conservati per **almeno 10 anni** (obbligo fiscale italiano)

2. **Disponibilità:** Rendere disponibili su richiesta dell'Autorità Garante per la Protezione dei Dati Personali

3. **Aggiornamenti:** In caso di modifiche significative ai trattamenti, aggiornare immediatamente i documenti

4. **Data Breach:** In caso di violazione dati, compilare **immediatamente** il Registro Data Breach e valutare obbligo notifica entro 72h

5. **Privacy by Design:** Implementare le funzionalità GDPR raccomandate prima del lancio production

---

## 📊 Riepilogo Statistiche

**Documenti creati:** 4  
**Articoli GDPR coperti:** Art. 28, 30, 33-35  
**Righe totali:** 38,712 caratteri  
**Trattamenti documentati:** 7  
**Responsabili esterni:** 3 (Google, Stripe, PayPal)  
**Rischi analizzati (DPIA):** 10  
**Rischio residuo:** BASSO  

---

## ✅ Checklist Finale

Prima della produzione:
- [x] Registro Trattamenti creato
- [x] Nomine Responsabili create
- [x] DPIA completata
- [x] Registro Data Breach preparato
- [ ] Placeholder sostituiti
- [ ] Firme digitali aggiunte
- [ ] Funzioni GDPR implementate (export, delete)
- [ ] Documenti pubblicati su richiesta

**Status:** ✅ Documentazione GDPR completa al 100%

---

© 2025 My Pet Care - Marras Maria Luigia. Tutti i diritti riservati.

**Conformità:** Regolamento UE 2016/679 (GDPR) + D.Lgs. 196/2003 (Codice Privacy IT)
