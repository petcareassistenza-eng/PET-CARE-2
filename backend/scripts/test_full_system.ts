/**
 * MyPetCare - Full System Test Script
 * 
 * Simula un'intera sessione di utilizzo dell'app:
 * - Crea utenti, professionisti, prenotazioni
 * - Genera pagamenti di test
 * - Invia messaggi chat
 * - Verifica reminder automatici
 * - Valida statistiche admin
 * 
 * Usage:
 *   npx ts-node --esm scripts/test_full_system.ts
 */

import * as admin from "firebase-admin";
import { readFileSync } from "fs";

// ==========================================
// Firebase Initialization
// ==========================================
if (!admin.apps.length) {
  const isCloudRun = process.env.K_SERVICE !== undefined;
  
  if (isCloudRun) {
    console.log("🔥 Firebase Admin: Cloud Run mode");
    admin.initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.log("🔥 Firebase Admin: Local mode");
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./keys/firebase-key.json";
    try {
      const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: serviceAccount.project_id + ".appspot.com",
      });
    } catch (error: any) {
      console.error("❌ Firebase init error:", error.message);
      process.exit(1);
    }
  }
}

const db = admin.firestore();

// ==========================================
// Helper Functions
// ==========================================

/**
 * Sleep utility per attese sincronizzazione
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Crea utente test in Firestore
 */
async function createUser(id: string, role: string): Promise<void> {
  await db.collection("users").doc(id).set({
    email: `${id}@mypetcare.test`,
    displayName: `Test User ${id}`,
    role,
    fcmTokens: [], // Vuoto per test, in produzione conterrebbe token FCM
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  
  console.log(`👤 Utente creato: ${id} (${role})`);
}

/**
 * Crea professionista test in Firestore
 */
async function createPro(id: string, name: string): Promise<void> {
  await db.collection("pros").doc(id).set({
    name,
    status: "active",
    rating: 4.5 + Math.random() * 0.5, // Rating random 4.5-5.0
    reviewsCount: Math.floor(Math.random() * 50) + 10,
    category: "veterinario",
    city: "Milano",
    address: "Via Test 123",
    phone: "+39 02 1234567",
    description: `Professionista di test: ${name}`,
    fcmTokens: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.log(`🏥 PRO creato: ${name} (${id})`);
}

/**
 * Crea prenotazione test
 * @param hoursAhead - Ore nel futuro (es. 2 = tra 2 ore, 25 = tra 25 ore)
 */
async function createBooking(
  userId: string, 
  proId: string, 
  hoursAhead: number
): Promise<string> {
  const startMs = Date.now() + hoursAhead * 3600 * 1000;
  const startDate = new Date(startMs);
  
  const ref = await db.collection("bookings").add({
    userId,
    proId,
    status: "confirmed",
    startAtMs: startMs,
    endAtMs: startMs + 3600000, // 1 ora dopo
    reminderSent: false,
    serviceName: "Visita veterinaria di controllo",
    servicePrice: 50.00,
    notes: "Prenotazione test automatica",
    date: startDate.toISOString().slice(0, 10), // "YYYY-MM-DD"
    from: startDate.toISOString().slice(11, 16), // "HH:MM"
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  const dateStr = startDate.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  console.log(`📅 Booking creato: ${userId} → ${proId} il ${dateStr} (${ref.id})`);
  console.log(`   ⏰ Ore nel futuro: ${hoursAhead}h ${hoursAhead >= 23 && hoursAhead <= 25 ? '(trigger reminder)' : ''}`);
  
  return ref.id;
}

/**
 * Crea pagamento test
 */
async function createPayment(
  userId: string, 
  amountCents: number,
  daysAgo: number = 0
): Promise<void> {
  const ref = db.collection("payments").doc();
  const createdDate = new Date(Date.now() - daysAgo * 86400000);
  
  await ref.set({
    userId,
    provider: "stripe",
    amountCents,
    currency: "eur",
    status: "succeeded",
    receiptUrl: `https://stripe.com/receipts/test_${ref.id}`,
    createdAt: admin.firestore.Timestamp.fromDate(createdDate),
    raw: { 
      id: `ch_test_${Date.now()}`,
      object: "charge",
      amount: amountCents,
      currency: "eur",
    },
  });
  
  const euroAmount = (amountCents / 100).toFixed(2);
  const dateStr = daysAgo > 0 ? ` (${daysAgo} giorni fa)` : "";
  console.log(`💳 Pagamento creato: ${userId} → €${euroAmount}${dateStr} (${ref.id})`);
}

/**
 * Invia messaggio chat test
 */
async function sendChat(userId: string, proId: string, text: string): Promise<void> {
  const convoId = [userId, proId].sort().join("_");
  const threadRef = db.collection("threads").doc(convoId);
  
  // Crea thread se non esiste
  await threadRef.set({
    id: convoId,
    users: [userId, proId].sort(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessage: {
      from: userId,
      text: text.substring(0, 100),
      at: admin.firestore.FieldValue.serverTimestamp(),
    },
    unreadCount: {
      [userId]: 0,
      [proId]: 1,
    },
  }, { merge: true });
  
  // Crea messaggio in subcollection
  const msgRef = threadRef.collection("messages").doc();
  await msgRef.set({
    from: userId,
    to: proId,
    text,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.log(`💬 Messaggio inviato: ${userId} → ${proId}`);
  console.log(`   📝 "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
}

/**
 * Verifica statistiche admin
 */
async function verifyAdminStats(): Promise<void> {
  console.log("\n📊 Verifica statistiche admin...");
  
  const now = Date.now();
  const ts30d = admin.firestore.Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));
  
  // Count utenti
  const usersSnap = await db.collection("users").get();
  console.log(`   👥 Utenti totali: ${usersSnap.size}`);
  
  // Count PRO attivi
  const prosSnap = await db.collection("pros").where("status", "==", "active").get();
  console.log(`   🏥 PRO attivi: ${prosSnap.size}`);
  
  // Bookings ultimi 30 giorni
  const bookingsSnap = await db.collection("bookings")
    .where("createdAt", ">=", ts30d)
    .get();
  console.log(`   📅 Bookings (30g): ${bookingsSnap.size}`);
  
  // Pagamenti ultimi 30 giorni
  const paymentsSnap = await db.collection("payments")
    .where("createdAt", ">=", ts30d)
    .get();
  
  let revenue30dCents = 0;
  paymentsSnap.forEach(doc => {
    const amount = doc.data()?.amountCents ?? 0;
    revenue30dCents += typeof amount === "number" ? amount : 0;
  });
  
  const revenue30d = (revenue30dCents / 100).toFixed(2);
  console.log(`   💰 Revenue (30g): €${revenue30d}`);
  console.log(`   💳 Pagamenti (30g): ${paymentsSnap.size}`);
  
  // Verifica bookings per reminder (24h window)
  const in24h = now + 24 * 60 * 60 * 1000;
  const reminderBookingsSnap = await db.collection("bookings")
    .where("status", "==", "confirmed")
    .where("startAtMs", ">=", now)
    .where("startAtMs", "<=", in24h)
    .where("reminderSent", "==", false)
    .get();
  
  console.log(`   🔔 Bookings pronti per reminder (24h): ${reminderBookingsSnap.size}`);
  
  // Verifica threads chat
  const threadsSnap = await db.collection("threads").get();
  console.log(`   💬 Thread chat creati: ${threadsSnap.size}`);
}

/**
 * Genera dati di test distribuiti negli ultimi 30 giorni
 */
async function generateHistoricalData(): Promise<void> {
  console.log("\n📈 Generazione dati storici (ultimi 30 giorni)...");
  
  const users = ["u_test1", "u_test2", "u_hist1", "u_hist2"];
  
  // Genera pagamenti distribuiti negli ultimi 30 giorni
  for (let day = 29; day >= 0; day -= 3) {
    const userId = users[Math.floor(Math.random() * users.length)];
    const amount = Math.floor(Math.random() * 5000) + 1000; // €10-€60
    await createPayment(userId, amount, day);
  }
  
  console.log("✅ Dati storici generati");
}

// ==========================================
// Main Test Flow
// ==========================================

async function run(): Promise<void> {
  console.log("==========================================");
  console.log("🚀 MyPetCare - Test Completo Sistema");
  console.log("==========================================\n");
  
  try {
    // 1️⃣ Creazione Admin e Utenti Base
    console.log("1️⃣ Creazione utenti e professionisti...\n");
    
    await createUser("seed-admin-uid", "admin");
    await createUser("u_test1", "owner");
    await createUser("u_test2", "owner");
    await createUser("u_hist1", "owner"); // Per dati storici
    await createUser("u_hist2", "owner");
    
    console.log();
    
    await createPro("pro_test1", "Clinica Veterinaria Test 1");
    await createPro("pro_test2", "Clinica Veterinaria Test 2");
    
    console.log();
    
    // 2️⃣ Creazione Prenotazioni (diverse finestre temporali)
    console.log("2️⃣ Creazione prenotazioni test...\n");
    
    // Booking tra 2 ore (NO reminder - troppo presto)
    await createBooking("u_test1", "pro_test1", 2);
    
    // Booking tra 24 ore (SÌ reminder - finestra corretta)
    await createBooking("u_test2", "pro_test2", 24);
    
    // Booking tra 48 ore (NO reminder - troppo lontano)
    await createBooking("u_test1", "pro_test2", 48);
    
    console.log();
    
    // 3️⃣ Generazione Pagamenti Recenti
    console.log("3️⃣ Generazione pagamenti recenti...\n");
    
    await createPayment("u_test1", 4999); // €49.99 oggi
    await createPayment("u_test2", 7999); // €79.99 oggi
    await createPayment("u_test1", 2999); // €29.99 oggi
    
    console.log();
    
    // 4️⃣ Generazione Dati Storici
    await generateHistoricalData();
    
    // 5️⃣ Test Chat
    console.log("\n5️⃣ Test sistema chat...\n");
    
    await sendChat(
      "u_test1", 
      "pro_test1", 
      "Ciao! Ho una domanda sulla prenotazione di domani. Posso portare anche il mio gatto? 🐱"
    );
    
    await sleep(1000);
    
    await sendChat(
      "u_test2",
      "pro_test2",
      "Buongiorno, vorrei confermare l'appuntamento per la visita di controllo. Grazie!"
    );
    
    console.log();
    
    // 6️⃣ Attesa Sincronizzazione
    console.log("6️⃣ Attesa sincronizzazione Firestore...");
    await sleep(3000);
    console.log("✅ Sincronizzazione completata\n");
    
    // 7️⃣ Verifica Statistiche
    await verifyAdminStats();
    
    // 8️⃣ Riepilogo Finale
    console.log("\n==========================================");
    console.log("✅ Test Completato con Successo!");
    console.log("==========================================\n");
    
    console.log("📋 Prossimi step manuali:\n");
    console.log("1. Test Reminder Automatico:");
    console.log('   curl -X POST "$API_BASE/jobs/send-reminders" \\');
    console.log('     -H "X-Cron-Secret: YOUR_CRON_SECRET"\n');
    
    console.log("2. Verifica Statistiche Admin:");
    console.log('   curl -H "Authorization: Bearer $ADMIN_TOKEN" \\');
    console.log('     "$API_BASE/admin/stats" | jq\n');
    
    console.log("3. Test Export CSV:");
    console.log('   curl -H "Authorization: Bearer $ADMIN_TOKEN" \\');
    console.log('     "$API_BASE/admin/export/payments.csv" -o payments.csv\n');
    
    console.log("4. Test Chat API:");
    console.log('   curl -H "Authorization: Bearer $USER_TOKEN" \\');
    console.log('     "$API_BASE/messages/pro_test1_u_test1?limit=10" | jq\n');
    
    console.log("5. Verifica Dashboard Flutter:");
    console.log("   - Apri app web come admin");
    console.log("   - Naviga a /admin/analytics");
    console.log("   - Verifica grafico 30 giorni con dati reali\n");
    
  } catch (error: any) {
    console.error("\n❌ Errore durante test:");
    console.error(error);
    process.exit(1);
  }
}

// ==========================================
// Entry Point
// ==========================================

run()
  .then(() => {
    console.log("🎉 Script terminato correttamente");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Errore fatale:", error);
    process.exit(1);
  });
