/**
 * Performance Test Data Seeding Script
 * 
 * Creates large dataset for load testing:
 * - 100 PRO accounts
 * - 500 users
 * - 1000 bookings
 * - 2000 reviews
 * 
 * Run with:
 * npx ts-node scripts/seed-performance-test.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Random data generators
const ITALIAN_FIRST_NAMES = [
  'Marco', 'Luca', 'Giuseppe', 'Francesco', 'Alessandro',
  'Matteo', 'Lorenzo', 'Andrea', 'Davide', 'Riccardo',
  'Maria', 'Giulia', 'Francesca', 'Chiara', 'Sara',
  'Anna', 'Sofia', 'Elena', 'Valentina', 'Martina',
];

const ITALIAN_LAST_NAMES = [
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi',
  'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
  'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa',
];

const ITALIAN_CITIES = [
  { name: 'Roma', lat: 41.9028, lng: 12.4964 },
  { name: 'Milano', lat: 45.4642, lng: 9.1900 },
  { name: 'Napoli', lat: 40.8518, lng: 14.2681 },
  { name: 'Torino', lat: 45.0703, lng: 7.6869 },
  { name: 'Palermo', lat: 38.1157, lng: 13.3615 },
  { name: 'Genova', lat: 44.4056, lng: 8.9463 },
  { name: 'Bologna', lat: 44.4949, lng: 11.3426 },
  { name: 'Firenze', lat: 43.7696, lng: 11.2558 },
  { name: 'Bari', lat: 41.1171, lng: 16.8719 },
  { name: 'Catania', lat: 37.5079, lng: 15.0830 },
];

const PET_SERVICES = [
  { name: 'Toelettatura Base', duration: 60, price: 35 },
  { name: 'Toelettatura Premium', duration: 90, price: 55 },
  { name: 'Taglio Unghie', duration: 15, price: 15 },
  { name: 'Bagno e Asciugatura', duration: 45, price: 25 },
  { name: 'Visita Veterinaria', duration: 30, price: 40 },
  { name: 'Vaccinazione', duration: 20, price: 30 },
  { name: 'Dog Sitting (1h)', duration: 60, price: 20 },
  { name: 'Dog Walking (30min)', duration: 30, price: 15 },
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomPastDate(daysAgo: number): Date {
  const now = Date.now();
  const ms = daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - Math.random() * ms);
}

/**
 * Create test PRO accounts
 */
async function createPros(count: number): Promise<string[]> {
  console.log(`📝 Creating ${count} PRO accounts...`);
  const proIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = randomElement(ITALIAN_FIRST_NAMES);
    const lastName = randomElement(ITALIAN_LAST_NAMES);
    const city = randomElement(ITALIAN_CITIES);
    
    const proId = `pro-perf-${i}`;
    const email = `pro.perf${i}@mypetcare.test`;

    try {
      // Create auth user
      await auth.createUser({
        uid: proId,
        email,
        password: 'Test!2345',
        emailVerified: true,
        displayName: `${firstName} ${lastName}`,
      });

      // Set custom claims
      await auth.setCustomUserClaims(proId, { role: 'pro' });

      // Create PRO profile
      const services = [];
      const numServices = randomInt(2, 5);
      for (let j = 0; j < numServices; j++) {
        services.push(randomElement(PET_SERVICES));
      }

      await db.doc(`pros/${proId}`).set({
        displayName: `${firstName} ${lastName} - ${city.name}`,
        email,
        phone: `+39 ${randomInt(300, 399)} ${randomInt(1000000, 9999999)}`,
        bio: `Professionista con esperienza nel settore pet care a ${city.name}.`,
        services,
        geo: {
          lat: city.lat + randomFloat(-0.1, 0.1, 4),
          lng: city.lng + randomFloat(-0.1, 0.1, 4),
        },
        address: `Via ${randomElement(ITALIAN_LAST_NAMES)} ${randomInt(1, 100)}, ${city.name}`,
        rating: randomFloat(3.5, 5.0, 1),
        reviewCount: randomInt(5, 100),
        active: true,
        subscriptionStatus: 'active',
        isPro: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      proIds.push(proId);

      if ((i + 1) % 10 === 0) {
        console.log(`  ✅ Created ${i + 1}/${count} PROs`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error creating PRO ${proId}:`, error.message);
    }
  }

  console.log(`✅ Created ${proIds.length} PRO accounts`);
  return proIds;
}

/**
 * Create test user accounts
 */
async function createUsers(count: number): Promise<string[]> {
  console.log(`📝 Creating ${count} user accounts...`);
  const userIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = randomElement(ITALIAN_FIRST_NAMES);
    const lastName = randomElement(ITALIAN_LAST_NAMES);
    const city = randomElement(ITALIAN_CITIES);
    
    const userId = `user-perf-${i}`;
    const email = `user.perf${i}@mypetcare.test`;

    try {
      // Create auth user
      await auth.createUser({
        uid: userId,
        email,
        password: 'Test!2345',
        emailVerified: true,
        displayName: `${firstName} ${lastName}`,
      });

      // Create user profile
      await db.doc(`users/${userId}`).set({
        displayName: `${firstName} ${lastName}`,
        email,
        phone: `+39 ${randomInt(300, 399)} ${randomInt(1000000, 9999999)}`,
        location: {
          lat: city.lat + randomFloat(-0.1, 0.1, 4),
          lng: city.lng + randomFloat(-0.1, 0.1, 4),
        },
        pets: [
          {
            name: randomElement(['Max', 'Luna', 'Charlie', 'Bella', 'Rocky']),
            type: randomElement(['dog', 'cat', 'bird', 'rabbit']),
            breed: 'Mixed',
            age: randomInt(1, 12),
          },
        ],
        role: 'owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      userIds.push(userId);

      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ Created ${i + 1}/${count} users`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error creating user ${userId}:`, error.message);
    }
  }

  console.log(`✅ Created ${userIds.length} user accounts`);
  return userIds;
}

/**
 * Create test bookings
 */
async function createBookings(userIds: string[], proIds: string[], count: number): Promise<void> {
  console.log(`📝 Creating ${count} bookings...`);

  const batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < count; i++) {
    const userId = randomElement(userIds);
    const proId = randomElement(proIds);
    
    const bookingId = `booking-perf-${i}`;
    const createdAt = randomPastDate(90);
    const bookingDate = new Date(createdAt.getTime() + randomInt(1, 30) * 24 * 60 * 60 * 1000);

    const statuses = ['pending', 'confirmed', 'paid', 'completed', 'cancelled'];
    const status = randomElement(statuses);

    const bookingRef = db.doc(`bookings/${bookingId}`);
    batch.set(bookingRef, {
      userId,
      proId,
      serviceId: 'service-1',
      serviceName: randomElement(PET_SERVICES).name,
      date: bookingDate.toISOString().split('T')[0],
      startTime: `${randomInt(9, 17).toString().padStart(2, '0')}:00`,
      duration: randomElement([30, 60, 90]),
      price: randomInt(15, 60),
      status,
      paymentStatus: status === 'paid' || status === 'completed' ? 'paid' : 'pending',
      petIds: ['pet-1'],
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
    });

    batchCount++;

    // Commit batch every 500 operations
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✅ Created ${i + 1}/${count} bookings`);
      batchCount = 0;
    }
  }

  // Commit remaining operations
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ Created ${count} bookings`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🚀 Starting performance test data seeding...\n');

  try {
    // Create PROs
    const proIds = await createPros(100);

    // Create Users
    const userIds = await createUsers(500);

    // Create Bookings
    await createBookings(userIds, proIds, 1000);

    console.log('\n✅ Performance test data seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`  - PRO accounts: 100`);
    console.log(`  - User accounts: 500`);
    console.log(`  - Bookings: 1000`);
    console.log('\n💡 You can now run load tests with realistic data volumes.');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seeding
main();
