# 🌐 Guida Completa Configurazione DNS e Deployment - mypetcareapp.org

**Data**: 2025-11-12
**Dominio**: mypetcareapp.org
**Status**: ⏳ DA CONFIGURARE

---

## 📋 INDICE

1. [Pagine Web Create](#pagine-web-create)
2. [Configurazione DNS](#configurazione-dns)
3. [Deployment Web Pages](#deployment-web-pages)
4. [Configurazione Email](#configurazione-email)
5. [SSL/HTTPS Setup](#ssl-https-setup)
6. [Verifica Finale](#verifica-finale)
7. [Checklist Completa](#checklist-completa)

---

## 1. 📄 PAGINE WEB CREATE

Ho creato tutte le pagine HTML richieste dagli store:

### **Pagine Disponibili**

| Pagina | File | Dimensione | Status |
|--------|------|-----------|--------|
| **Homepage** | `web_pages/index.html` | 3.8 KB | ✅ Pronta |
| **Privacy Policy** | `web_pages/privacy.html` | 14.1 KB | ✅ Pronta |
| **Terms of Service** | `web_pages/terms.html` | 18.0 KB | ✅ Pronta |
| **Support** | `web_pages/support.html` | 14.8 KB | ✅ Pronta |

### **Caratteristiche Pagine**

✅ **Design Responsive**: Ottimizzate per mobile e desktop
✅ **SEO Friendly**: Meta tag e struttura HTML5 corretta
✅ **GDPR Compliant**: Privacy Policy conforme a GDPR italiano
✅ **Store Ready**: Formattazione e contenuti richiesti da Google Play/App Store
✅ **Brand Consistent**: Colori e stile MyPetCare (#1C8275 teal theme)

### **Contenuti Inclusi**

**Privacy Policy (`privacy.html`)**:
- 14 sezioni complete con tutti i requisiti GDPR
- Dati raccolti e base giuridica
- Responsabili del trattamento (Firebase, Stripe, PayPal)
- Trasferimenti internazionali (SCC)
- Misure di sicurezza
- Diritti utente (Art. 15-22 GDPR)
- Contatti Garante Privacy

**Terms of Service (`terms.html`)**:
- 16 sezioni complete
- Politica cancellazioni e rimborsi
- Piani abbonamento PRO
- Limitazioni responsabilità
- Risoluzione controversie
- Legge applicabile (italiana)

**Support (`support.html`)**:
- 10 FAQ essenziali
- Metodi di contatto
- Guide troubleshooting
- Segnalazione bug
- Feedback form

---

## 2. 🌐 CONFIGURAZIONE DNS

### **OPZIONE A: Cloudflare (RACCOMANDATO)**

**Vantaggi**:
- ✅ SSL automatico e gratuito
- ✅ CDN globale per performance
- ✅ Protezione DDoS
- ✅ DNS management facile

**Step 1: Registra Dominio su Cloudflare**
```
1. Vai su https://www.cloudflare.com/
2. Clicca "Sign Up" e crea account gratuito
3. Clicca "Add a Site" → Inserisci "mypetcareapp.org"
4. Seleziona piano "Free" (€0/mese)
5. Cloudflare scansionerà automaticamente i DNS esistenti
```

**Step 2: Configura DNS Records**
```
Vai su: Dashboard → DNS → Records

Aggiungi questi record:
```

| Type | Name | Content/Target | Proxy Status | TTL |
|------|------|----------------|--------------|-----|
| **A** | @ | `<YOUR_SERVER_IP>` | Proxied (🧡) | Auto |
| **A** | www | `<YOUR_SERVER_IP>` | Proxied (🧡) | Auto |
| **CNAME** | api | `<CLOUD_RUN_URL>` | Proxied (🧡) | Auto |
| **CNAME** | api-staging | `<STAGING_URL>` | Proxied (🧡) | Auto |
| **MX** | @ | `mx1.mailprovider.com` | DNS only (☁️) | Auto |
| **TXT** | @ | `v=spf1 include:_spf.mailprovider.com ~all` | DNS only (☁️) | Auto |

**Note**:
- `<YOUR_SERVER_IP>`: IP del tuo web server (es. Firebase Hosting, Netlify, VPS)
- `<CLOUD_RUN_URL>`: URL del backend Cloud Run (es. `mypetcare-api-xxx.run.app`)
- Proxy Status "Proxied 🧡": Attiva CDN e SSL automatico Cloudflare

**Step 3: Cambia Nameserver del Registrar**
```
1. Accedi al tuo registrar del dominio (GoDaddy, Namecheap, Google Domains, etc.)
2. Trova sezione "Nameservers" o "DNS Management"
3. Cambia nameservers con quelli forniti da Cloudflare:

Esempio nameserver Cloudflare:
- ns1.cloudflare.com
- ns2.cloudflare.com

4. Salva le modifiche
5. Attendi 24-48h per propagazione DNS (solitamente 1-2 ore)
```

**Step 4: Attiva SSL/TLS**
```
Dashboard Cloudflare → SSL/TLS → Overview:
- Seleziona: "Full (strict)" ← RACCOMANDATO per sicurezza massima
- Attendi 5-15 minuti per attivazione certificato
- Verifica: https://mypetcareapp.org (dovrebbe essere sicuro)
```

**Step 5: Configurazioni Aggiuntive Cloudflare**
```
1. Speed → Optimization:
   - Auto Minify: HTML, CSS, JS → ON
   - Brotli: ON
   
2. Caching → Configuration:
   - Caching Level: Standard
   - Browser Cache TTL: 4 hours
   
3. Security → Settings:
   - Security Level: Medium
   - Challenge Passage: 30 minutes
```

---

### **OPZIONE B: DNS Tradizionale (Provider Registrar)**

**Se preferisci gestire DNS direttamente dal registrar:**

**Step 1: Accedi al Pannello DNS del Registrar**
```
Esempio providers:
- GoDaddy: https://dcc.godaddy.com/
- Namecheap: https://ap.www.namecheap.com/
- Google Domains: https://domains.google.com/
```

**Step 2: Configura A Records**
```
Type: A
Host: @
Points to: <YOUR_SERVER_IP>
TTL: 3600 (1 hour)

Type: A
Host: www
Points to: <YOUR_SERVER_IP>
TTL: 3600
```

**Step 3: Configura CNAME Records**
```
Type: CNAME
Host: api
Points to: <CLOUD_RUN_URL>
TTL: 3600

Type: CNAME
Host: api-staging
Points to: <STAGING_URL>
TTL: 3600
```

**Step 4: SSL Configuration**
```
Dovrai configurare SSL separatamente:
- Let's Encrypt (gratuito, auto-renewal)
- Certificato a pagamento dal registrar
```

---

## 3. 📤 DEPLOYMENT WEB PAGES

### **OPZIONE A: Firebase Hosting (RACCOMANDATO)**

**Vantaggi**:
- ✅ Hosting gratuito e veloce
- ✅ SSL automatico
- ✅ CDN globale
- ✅ Integrato con Firebase (già lo usi!)

**Step 1: Installa Firebase CLI**
```bash
# Se non hai già Firebase CLI installato:
npm install -g firebase-tools

# Login
firebase login
```

**Step 2: Inizializza Firebase Hosting**
```bash
cd /home/user/flutter_app

# Inizializza Hosting
firebase init hosting

# Rispondi alle domande:
? What do you want to use as your public directory? web_pages
? Configure as a single-page app? No
? Set up automatic builds and deploys with GitHub? No
```

**Step 3: Configura firebase.json**
```json
{
  "hosting": {
    "public": "web_pages",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(html|js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          }
        ]
      }
    ]
  }
}
```

**Step 4: Deploy**
```bash
# Deploy a Firebase Hosting
firebase deploy --only hosting

# Output:
# ✔ Deploy complete!
# Project Console: https://console.firebase.google.com/project/pet-care-9790d
# Hosting URL: https://pet-care-9790d.web.app
```

**Step 5: Collega Dominio Personalizzato**
```
1. Vai su Firebase Console → Hosting
2. Clicca "Add custom domain"
3. Inserisci: mypetcareapp.org
4. Firebase ti fornirà record DNS da aggiungere:
   
   Type: A
   Host: @
   Value: 151.101.1.195 (esempio IP Firebase)
   
   Type: A
   Host: @
   Value: 151.101.65.195 (esempio IP Firebase)

5. Aggiungi questi record nel tuo provider DNS
6. Verifica dominio (click "Verify")
7. Attendi propagazione DNS (24-48h max, solitamente 1-2h)
8. Firebase configurerà automaticamente SSL
```

---

### **OPZIONE B: Netlify**

**Step 1: Crea Account Netlify**
```
https://www.netlify.com/ → Sign Up (gratuito)
```

**Step 2: Deploy tramite Drag & Drop**
```
1. Vai su Netlify Dashboard
2. Clicca "Add new site" → "Deploy manually"
3. Trascina la cartella /home/user/flutter_app/web_pages
4. Netlify caricherà e deployerà automaticamente
5. Ti assegnerà un URL tipo: https://random-name.netlify.app
```

**Step 3: Configura Dominio Personalizzato**
```
1. Site settings → Domain management → Add custom domain
2. Inserisci: mypetcareapp.org
3. Netlify ti fornirà nameserver o DNS records
4. Configurali nel tuo registrar
5. SSL automatico attivato da Netlify (Let's Encrypt)
```

---

### **OPZIONE C: GitHub Pages**

**Step 1: Crea Repository GitHub**
```bash
cd /home/user/flutter_app
git init
git add web_pages/
git commit -m "Add web pages"
git remote add origin https://github.com/YOUR_USERNAME/mypetcare-web.git
git push -u origin main
```

**Step 2: Attiva GitHub Pages**
```
1. Vai su GitHub → Repository → Settings
2. Scorri fino a "Pages"
3. Source: main branch
4. Folder: /web_pages o /root
5. Save
6. GitHub Pages URL: https://YOUR_USERNAME.github.io/mypetcare-web/
```

**Step 3: Configura Dominio Personalizzato**
```
1. Settings → Pages → Custom domain
2. Inserisci: mypetcareapp.org
3. Aggiungi CNAME record DNS:
   
   Type: CNAME
   Host: @
   Value: YOUR_USERNAME.github.io

4. Attendi verifica
5. Abilita "Enforce HTTPS"
```

---

## 4. 📧 CONFIGURAZIONE EMAIL

Per avere email funzionante `support@mypetcareapp.org`:

### **OPZIONE A: Google Workspace (RACCOMANDATO)**

**Costo**: ~€6/utente/mese

**Features**:
- ✅ Gmail professionale
- ✅ Spam filter avanzato
- ✅ 30 GB storage
- ✅ Support Google

**Setup**:
```
1. Vai su: https://workspace.google.com/
2. Iscriviti con dominio mypetcareapp.org
3. Google ti fornirà MX records:
   
   Priority 1: ASPMX.L.GOOGLE.COM
   Priority 5: ALT1.ASPMX.L.GOOGLE.COM
   Priority 5: ALT2.ASPMX.L.GOOGLE.COM

4. Aggiungi MX records al tuo DNS provider
5. Verifica dominio tramite TXT record
6. Crea utente: support@mypetcareapp.org
```

---

### **OPZIONE B: Zoho Mail (Gratuito fino a 5 utenti)**

**Costo**: GRATUITO fino a 5 utenti

**Features**:
- ✅ Email professionale gratuita
- ✅ 5 GB storage per utente
- ✅ No ads
- ✅ IMAP/POP3

**Setup**:
```
1. Vai su: https://www.zoho.com/mail/
2. Sign up → Domain email
3. Inserisci: mypetcareapp.org
4. Zoho ti fornirà MX records:
   
   Priority 10: mx.zoho.eu
   Priority 20: mx2.zoho.eu
   Priority 50: mx3.zoho.eu

5. Aggiungi al DNS provider
6. Verifica dominio (TXT record)
7. Crea mailbox: support@mypetcareapp.org
```

---

### **OPZIONE C: Forwarding a Gmail Personale (Temporaneo)**

**Se vuoi iniziare subito senza costi:**

**Setup con Cloudflare Email Routing** (Gratuito):
```
1. Dashboard Cloudflare → Email → Email Routing
2. Enable Email Routing
3. Aggiungi destinazione: tuo-gmail-personale@gmail.com
4. Crea rule:
   From: support@mypetcareapp.org
   To: tuo-gmail-personale@gmail.com
5. Cloudflare configura automaticamente MX records
```

**Invia email da Gmail con alias**:
```
1. Gmail → Settings → Accounts → Send mail as
2. Add another email: support@mypetcareapp.org
3. SMTP settings:
   - SMTP Server: smtp.gmail.com
   - Port: 587
   - Username: tuo-gmail-personale@gmail.com
   - Password: App-specific password

4. Verifica email
5. Ora puoi inviare da support@mypetcareapp.org tramite Gmail
```

---

## 5. 🔒 SSL/HTTPS SETUP

### **Se usi Cloudflare o Firebase Hosting**:
✅ **SSL automatico incluso** - non serve fare nulla!

### **Se usi server custom (VPS, server dedicato)**:

**Opzione: Let's Encrypt (Gratuito)**

**Con Certbot**:
```bash
# Installa Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Ottieni certificato
sudo certbot --nginx -d mypetcareapp.org -d www.mypetcareapp.org

# Auto-renewal (già configurato automaticamente)
sudo certbot renew --dry-run

# Certificati validi per 90 giorni, rinnovati automaticamente
```

---

## 6. ✅ VERIFICA FINALE

### **Checklist Verifica DNS**

Dopo aver configurato DNS, verifica con questi comandi:

```bash
# Verifica A record
dig mypetcareapp.org +short
# Output atteso: YOUR_SERVER_IP

# Verifica www
dig www.mypetcareapp.org +short
# Output atteso: YOUR_SERVER_IP

# Verifica api subdomain
dig api.mypetcareapp.org +short
# Output atteso: CLOUD_RUN_IP

# Verifica MX records (email)
dig mypetcareapp.org MX +short
# Output atteso: Priority e mail server

# Verifica SSL
curl -I https://mypetcareapp.org
# Output atteso: HTTP/2 200 OK (con HTTPS funzionante)
```

### **Checklist Pagine Web**

Verifica che tutte le pagine siano accessibili:

```bash
# Homepage
curl -I https://mypetcareapp.org/
# Status: 200 OK

# Privacy Policy
curl -I https://mypetcareapp.org/privacy
# Status: 200 OK

# Terms of Service
curl -I https://mypetcareapp.org/terms
# Status: 200 OK

# Support
curl -I https://mypetcareapp.org/support
# Status: 200 OK
```

### **Verifica Store Listings**

Testa i link dagli store:

1. **Google Play Console**:
   - Vai su Store Listing → Website
   - Clicca su "https://mypetcareapp.org" → Deve aprirsi
   - Clicca su Privacy Policy link → Deve aprirsi

2. **App Store Connect**:
   - Vai su App Information → URLs
   - Testa tutti i link (Privacy, Support, Marketing)

---

## 7. ✅ CHECKLIST COMPLETA

### **FASE 1: Pagine Web** ✅ COMPLETATO
- [x] ✅ Homepage (index.html) creata
- [x] ✅ Privacy Policy (privacy.html) creata
- [x] ✅ Terms of Service (terms.html) creata
- [x] ✅ Support (support.html) creata

### **FASE 2: DNS Configuration** ⏳ DA FARE
- [ ] ⏳ Dominio registrato o trasferito
- [ ] ⏳ DNS provider scelto (Cloudflare/Registrar)
- [ ] ⏳ A records configurati (@ e www)
- [ ] ⏳ CNAME records configurati (api, api-staging)
- [ ] ⏳ MX records configurati (email)
- [ ] ⏳ Propagazione DNS completata (24-48h)

### **FASE 3: Web Hosting** ⏳ DA FARE
- [ ] ⏳ Hosting provider scelto (Firebase/Netlify/GitHub Pages)
- [ ] ⏳ Pagine web caricate su hosting
- [ ] ⏳ Dominio personalizzato collegato
- [ ] ⏳ SSL/HTTPS attivato
- [ ] ⏳ Verifica: https://mypetcareapp.org funzionante

### **FASE 4: Email Setup** ⏳ DA FARE
- [ ] ⏳ Email provider scelto (Google Workspace/Zoho/Cloudflare)
- [ ] ⏳ MX records configurati
- [ ] ⏳ Mailbox support@mypetcareapp.org creata
- [ ] ⏳ Test invio/ricezione email
- [ ] ⏳ Configurazione SPF/DKIM (opzionale ma raccomandato)

### **FASE 5: Verifica Finale** ⏳ DA FARE
- [ ] ⏳ Tutti i link funzionano
- [ ] ⏳ SSL attivo su tutte le pagine
- [ ] ⏳ Email riceve e invia correttamente
- [ ] ⏳ Test da dispositivi mobile e desktop
- [ ] ⏳ Test da diversi browser
- [ ] ⏳ Performance check (PageSpeed Insights)

### **FASE 6: Store Update** ⏳ DA FARE
- [ ] ⏳ Google Play Console → Aggiorna URLs
- [ ] ⏳ App Store Connect → Aggiorna URLs
- [ ] ⏳ Test link da store listings
- [ ] ⏳ Upload AAB/IPA con nuovo dominio

---

## 📞 SUPPORTO

**Hai bisogno di aiuto?**

- 📧 Email: support@mypetcareapp.org (dopo configurazione)
- 📄 Documentazione: Questa guida
- 💬 Chiedi all'assistente AI

---

**Document Created**: 2025-11-12 17:30 UTC
**Last Updated**: 2025-11-12 17:30 UTC
