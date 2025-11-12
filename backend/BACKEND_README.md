# MY PET CARE - Backend

Backend Node.js/TypeScript su Cloud Run per gestione pagamenti, coupon e job schedulati.

## Setup Rapido

```bash
cd backend
npm install
npm run dev
```

## Struttura

```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── middleware/
│   │   ├── auth.ts           # Auth middleware
│   │   └── admin.ts          # Admin check
│   ├── routes/
│   │   ├── bookings.ts       # Booking endpoints
│   │   ├── coupons.ts        # Coupon endpoints
│   │   ├── admin.ts          # Admin endpoints
│   │   └── jobs.ts           # Scheduled jobs
│   ├── services/
│   │   ├── stripe.ts         # Stripe integration
│   │   ├── paypal.ts         # PayPal integration
│   │   └── sendgrid.ts       # Email service
│   └── utils/
│       └── helpers.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Deploy

```bash
# Build
gcloud builds submit --tag gcr.io/PROJECT_ID/mypetcare-backend

# Deploy
gcloud run deploy mypetcare-backend \
  --image gcr.io/PROJECT_ID/mypetcare-backend \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "
    STRIPE_KEY=sk_live_...,
    STRIPE_WEBHOOK_SECRET=whsec_...,
    APP_FEE_PCT=5,
    FIREBASE_PROJECT_ID=...,
    SENDGRID_API_KEY=...
  "
```

## Endpoints

### Bookings
- `POST /bookings` - Create booking (owner)
- `POST /bookings/:id/accept` - Accept booking (pro, requireProActive)

### Coupons
- `POST /coupons/validate` - Validate checkout coupon

### Admin
- `POST /admin/pro-coupons` - Create/update PRO coupon (requireAdmin)
- `POST /admin/pro-coupons/apply` - Apply coupon to PRO (requireAdmin)

### Jobs
- `POST /jobs/capture` - Capture payments T-24h
- `POST /jobs/subscription-sweeper` - Disable expired PROs

### Webhook
- `POST /stripe/webhook` - Handle Stripe events

## Environment Variables

```
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
STRIPE_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
APP_FEE_PCT=5
APP_URL=https://app.mypetcare.it
SENDGRID_API_KEY=SG....
EMAIL_FROM=no-reply@mypetcare.it
EMAIL_REPLY_TO=petcareassistenza@gmail.com
```

## Testing

```bash
npm test
```

Vedi index.ts completo nelle specifiche del progetto.
