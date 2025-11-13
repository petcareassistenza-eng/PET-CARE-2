# Stripe Webhook Testing Guide

Guida completa per testare il webhook Stripe in locale con Stripe CLI.

---

## 🚀 Setup Iniziale

### 1. Installa Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

**Windows:**
```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### 2. Login con Stripe

```bash
stripe login
```

Questo aprirà il browser per autorizzare Stripe CLI con il tuo account.

---

## 🎯 Comandi Rapidi (npm scripts)

### Avvia Listener (Forward Webhook in Locale)

```bash
npm run stripe:listen
```

**Output atteso:**
```
Ready! You are using Stripe API Version [2024-XX-XX]. Your webhook signing secret is whsec_xxxxxxxxxxxx
> POST http://localhost:8080/api/payments/webhook [200]
```

⚠️ **IMPORTANTE:** Copia il `webhook signing secret` (`whsec_xxx`) e aggiornalo in `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

---

### Trigger Eventi Stripe (Test End-to-End)

**Checkout Session Completata:**
```bash
npm run stripe:trigger:checkout
```

**Payment Intent Successo:**
```bash
npm run stripe:trigger:payment
```

**Rimborso:**
```bash
npm run stripe:trigger:refund
```

**Visualizza Eventi Recenti:**
```bash
npm run stripe:events
```

---

## 🧪 Test Workflow Completo

### Scenario 1: Test Locale del Webhook

**Terminale 1 - Backend Server:**
```bash
npm run dev
```

**Terminale 2 - Stripe Listener:**
```bash
npm run stripe:listen
```

**Terminale 3 - Trigger Evento:**
```bash
npm run stripe:trigger:checkout
```

**Output Backend Atteso:**
```
[Stripe Webhook] Event: checkout.session.completed
[Stripe Webhook] Processing booking payment...
✅ Booking status updated: confirmed
```

---

### Scenario 2: Test con Stripe Dashboard

1. **Avvia listener:**
   ```bash
   npm run stripe:listen
   ```

2. **Vai su Stripe Dashboard** → Developers → Events → Send test webhook

3. **Seleziona evento:** `checkout.session.completed`

4. **Verifica log backend** per confermare ricezione

---

## 🔍 Debugging Webhook

### Verifica Signature Stripe

Il webhook utilizza Stripe signature verification per sicurezza:

```typescript
// In webhooks/stripeWebhook.ts
const signature = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(
  (req as any).rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

**Errori comuni:**
- ❌ `Webhook signature verification failed` → Secret sbagliato o rawBody mancante
- ❌ `Timestamp too old` → Clock del sistema non sincronizzato

---

## 📊 Eventi Stripe Gestiti

| Evento | Descrizione | Handler |
|--------|-------------|---------|
| `checkout.session.completed` | Checkout completato con successo | `handleCheckoutCompleted()` |
| `payment_intent.succeeded` | Pagamento confermato | `handlePaymentSucceeded()` |
| `charge.refunded` | Rimborso emesso | `handleRefund()` |
| `customer.subscription.updated` | Subscription modificata | (Non implementato) |

---

## 🛡️ Test con Mock Data

Per test unitari senza Stripe CLI, usa il file `test/mocks/stripe.ts`:

```typescript
import { mockStripeEvent } from './mocks/stripe'

describe('Stripe Webhook', () => {
  it('should process checkout.session.completed', async () => {
    const event = mockStripeEvent('checkout.session.completed', {
      bookingId: 'booking_123',
      amount: 5000, // 50 EUR
    })
    
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'mock_signature')
      .send(event)
    
    expect(response.status).toBe(200)
  })
})
```

---

## 🔄 Trigger Eventi Custom

### Crea Checkout Session di Test

```bash
stripe checkout sessions create \
  --mode payment \
  --success-url "http://localhost:3000/success" \
  --cancel-url "http://localhost:3000/cancel" \
  --line-items '[
    {
      "price_data": {
        "currency": "eur",
        "product_data": {"name": "Grooming Basic"},
        "unit_amount": 5000
      },
      "quantity": 1
    }
  ]' \
  --metadata bookingId=booking_test_123
```

Questo crea una session reale che puoi completare visitando l'URL restituito.

---

## 📝 Best Practices

1. **Usa webhook signing secret separati** per development/staging/production
2. **Non hardcodare secret** → usa `.env` files
3. **Test idempotency** → Stripe può inviare lo stesso evento più volte
4. **Log tutti gli eventi** con Pino logger per troubleshooting
5. **Rispondi 200 OK velocemente** → processa eventi in background se necessario

---

## 🚨 Troubleshooting

### Webhook non riceve eventi

**Verifica:**
1. Backend è attivo su `localhost:8080`
2. Stripe listener è attivo (`npm run stripe:listen`)
3. Nessun firewall blocca traffico locale
4. Secret è corretto in `.env`

**Test manuale:**
```bash
curl -X POST http://localhost:8080/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{}'
```

Se risponde `400 Bad Request` → Webhook endpoint è attivo ma signature fail (normale).

---

## 📚 Riferimenti

- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Webhook Events](https://stripe.com/docs/api/events/types)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Signature Verification](https://stripe.com/docs/webhooks/signatures)

---

✅ **Setup completato!** Ora puoi testare tutti i flussi di pagamento in locale.
