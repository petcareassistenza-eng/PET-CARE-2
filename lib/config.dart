class AppConfig {
  // URL backend e frontend in produzione
  static const String backendBaseUrl = 'https://api.mypetcareapp.org';
  static const String webBaseUrl = 'https://app.mypetcareapp.org';
  
  // Getter per compatibilità con codice esistente
  static String get effectiveBackendUrl => backendBaseUrl;
  static String get effectiveWebUrl => webBaseUrl;

  // ==========================================
  // STRIPE TEST CONFIGURATION
  // ==========================================
  // ⚠️ IMPORTANTE: Queste sono chiavi TEST - NON accettano pagamenti reali!
  // Per passare a LIVE: sostituisci con chiavi da Stripe Dashboard → API Keys (LIVE mode)
  
  // Publishable Key (pubblico, safe per client-side)
  static const String stripePublishableKey = 'pk_test_51SPft3Lc9uOEhD6QYYeRjm5GDHtW61arr1b2ykzHnap1kkzW8aM7FbFSYDXn6Rj5veLmWfXwh5PifBs3BOdnSSBe00eGgsupFk';
  
  // Price IDs - Da creare in Stripe Dashboard (modalità TEST)
  // Formato: price_xxxxxxxxxxxxx
  // Guida: Crea prodotti in TEST mode → copia Price IDs
  static const String stripeMonthlyPriceId = 'price_TEST_MONTHLY'; 
  static const String stripeYearlyPriceId  = 'price_TEST_YEARLY'; 

  // ==========================================
  // PAYPAL LIVE CONFIGURATION
  // ==========================================
  // App "pet care" - PayPal Dashboard (15/11/25)
  // Client ID pubblico per PayPal SDK
  static const String paypalClientId = 'ASbh4faD68qv20avK1hFP1Sy0K88EOKAC9IMkO7g6gxsZd4JB-Blo-fPb0B8VVDWFW1cjKRySE5IGTIL';
  
  // PayPal Hosted Button IDs (3 piani abbonamento)
  static const String paypalMonthlyButtonId = 'MY7X9HN01SAY8';     // €29.00/mese
  static const String paypalQuarterlyButtonId = 'RSD86UKYD47MW';   // €79.00/3 mesi
  static const String paypalYearlyButtonId = 'HV7X9HNXH34YN';      // €299.00/anno
  
  // Prezzi (per visualizzazione UI)
  static const double paypalMonthlyPrice = 29.00;
  static const double paypalQuarterlyPrice = 79.00;
  static const double paypalYearlyPrice = 299.00;

  // ==========================================
  // NOTE:
  // ==========================================
  // - stripePublishableKey è pubblico e può stare qui (inizia con pk_live_)
  // - Le chiavi segrete (sk_live_, whsec_, PayPal secret) NON vanno MAI messe qui
  // - Le chiavi segrete si configurano solo come variabili d'ambiente su Cloud Run
  // - Per testing: usare .env.development.example con chiavi TEST/SANDBOX
}
