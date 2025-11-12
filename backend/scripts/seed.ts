/**
 * MyPetCare Database Seeding Script
 * Creates test data for development and testing
 * 
 * Usage:
 *   npm run seed
 *   or
 *   node -r esbuild-register scripts/seed.ts
 */

import admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin SDK
const serviceAccount = require(path.resolve(__dirname, '../../firebase-admin-sdk.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// ==========================================
// Seed Data Configuration
// ==========================================

const SEED_USERS = [
  {
    uid: 'owner-test-1',
    email: 'owner.test+1@mypetcare.it',
    password: 'Test!2345',
    displayName: 'Marco Rossi',
    role: 'owner',
    isPro: false,
  },
  {
    uid: 'pro-test-1',
    email: 'pro.test+1@mypetcare.it',
    password: 'Test!2345',
    displayName: 'Toelettatore Test',
    role: 'pro',
    isPro: true,
  },
  {
    uid: 'admin-test',
    email: 'admin.test@mypetcare.it',
    password: 'Test!2345',
    displayName: 'Admin MyPetCare',
    role: 'admin',
    admin: true,
    isPro: true,
  },
];

const SEED_PROS = [
  {
    id: 'pro-test-1',
    displayName: 'Toelettatore Test',
    bio: 'Toelettatore professionale con 10 anni di esperienza',
    specialties: ['Toelettatura', 'Bagno', 'Taglio unghie'],
    services: [
      { name: 'Visita base', minutes: 30, price: 35 },
      { name: 'Toelettatura small', minutes: 60, price: 50 },
      { name: 'Toelettatura medium', minutes: 90, price: 70 },
      { name: 'Bagno completo', minutes: 45, price: 40 },
    ],
    geo: {
      lat: 40.7274,
      lng: 8.5606,
      address: 'Sassari, Sardegna, Italia',
    },
    active: true,
    subscriptionStatus: 'active',
    rating: 4.8,
    reviewCount: 24,
    photoUrl: 'https://via.placeholder.com/400x400/4CAF50/FFFFFF?text=PRO',
  },
];

const SEED_CALENDARS = [
  {
    id: 'pro-test-1',
    slots: [
      {
        date: getTomorrowDate(),
        start: '09:00',
        end: '13:00',
        step: 30,
        capacity: 4,
      },
      {
        date: getTomorrowDate(),
        start: '14:00',
        end: '18:00',
        step: 30,
        capacity: 4,
      },
    ],
  },
];

const SEED_COUPONS = [
  {
    code: 'FREE-1M',
    description: '1 mese gratis',
    duration: 30,
    discountPercent: 100,
    active: true,
    maxUses: 100,
    usedCount: 0,
  },
  {
    code: 'FREE-3M',
    description: '3 mesi gratis',
    duration: 90,
    discountPercent: 100,
    active: true,
    maxUses: 50,
    usedCount: 0,
  },
  {
    code: 'FREE-12M',
    description: '12 mesi gratis',
    duration: 365,
    discountPercent: 100,
    active: true,
    maxUses: 20,
    usedCount: 0,
  },
];

const SEED_CONFIG = {
  maintenance: {
    maintenance: false,
    message: '',
    min_supported_build: 90,
    payments_disabled: false,
  },
};

// ==========================================
// Helper Functions
// ==========================================

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

async function createUser(userData: any) {
  try {
    // Check if user exists
    try {
      await auth.getUserByEmail(userData.email);
      console.log(`✅ User ${userData.email} already exists`);
      return;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create Firebase Auth user
    const user = await auth.createUser({
      uid: userData.uid,
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      emailVerified: true,
    });

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, {
      role: userData.role,
      admin: userData.admin || false,
      isPro: userData.isPro || false,
    });

    // Create Firestore user document
    await db.doc(`users/${user.uid}`).set({
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      isPro: userData.isPro || false,
      subscriptionStatus: userData.isPro ? 'active' : 'none',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Created user: ${userData.email} (${userData.role})`);
  } catch (error: any) {
    console.error(`❌ Error creating user ${userData.email}:`, error.message);
  }
}

async function seedPros() {
  for (const pro of SEED_PROS) {
    try {
      await db.doc(`pros/${pro.id}`).set({
        ...pro,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Created PRO profile: ${pro.displayName}`);
    } catch (error: any) {
      console.error(`❌ Error creating PRO ${pro.displayName}:`, error.message);
    }
  }
}

async function seedCalendars() {
  for (const calendar of SEED_CALENDARS) {
    try {
      await db.doc(`calendars/${calendar.id}`).set({
        slots: calendar.slots,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Created calendar for PRO: ${calendar.id}`);
    } catch (error: any) {
      console.error(`❌ Error creating calendar ${calendar.id}:`, error.message);
    }
  }
}

async function seedCoupons() {
  for (const coupon of SEED_COUPONS) {
    try {
      await db.doc(`coupons/${coupon.code}`).set({
        ...coupon,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Created coupon: ${coupon.code}`);
    } catch (error: any) {
      console.error(`❌ Error creating coupon ${coupon.code}:`, error.message);
    }
  }
}

async function seedConfig() {
  for (const [docId, data] of Object.entries(SEED_CONFIG)) {
    try {
      await db.doc(`config/${docId}`).set(data);
      console.log(`✅ Created config: ${docId}`);
    } catch (error: any) {
      console.error(`❌ Error creating config ${docId}:`, error.message);
    }
  }
}

// ==========================================
// Main Seeding Function
// ==========================================

async function runSeed() {
  console.log('==========================================');
  console.log('🌱 MyPetCare Database Seeding');
  console.log('==========================================\n');

  try {
    // 1. Create test users
    console.log('📝 Creating test users...');
    for (const userData of SEED_USERS) {
      await createUser(userData);
    }
    console.log('');

    // 2. Seed PRO profiles
    console.log('👨‍⚕️ Seeding PRO profiles...');
    await seedPros();
    console.log('');

    // 3. Seed calendars
    console.log('📅 Seeding calendars...');
    await seedCalendars();
    console.log('');

    // 4. Seed coupons
    console.log('🎟️ Seeding coupons...');
    await seedCoupons();
    console.log('');

    // 5. Seed configuration
    console.log('⚙️ Seeding configuration...');
    await seedConfig();
    console.log('');

    console.log('==========================================');
    console.log('✅ Database seeding completed successfully!');
    console.log('==========================================\n');

    console.log('🔑 Test Credentials:');
    console.log('');
    SEED_USERS.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seeding
runSeed();
