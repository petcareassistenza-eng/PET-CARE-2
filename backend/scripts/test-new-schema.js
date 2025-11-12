#!/usr/bin/env node

/**
 * Test script for NEW SCHEMA alignment
 * 
 * This script creates test data using the new schema format:
 * - from/to (Timestamp) instead of start/end or slotStart/slotEnd
 * - weeklySchedule with string keys (mon, tue, wed, ...)
 * - exceptions as array
 * 
 * Usage: node scripts/test-new-schema.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function createTestDataNewSchema() {
  console.log('============================================');
  console.log('Creating test data with NEW SCHEMA');
  console.log('============================================\n');

  const testProId = 'test-pro-new-schema';
  
  try {
    // ========================================
    // 1. Create Calendar with NEW SCHEMA
    // ========================================
    console.log('1️⃣  Creating calendar with string keys (mon/tue/wed...)');
    
    const calendarData = {
      stepMin: 60,
      timezone: 'Europe/Rome',
      weeklySchedule: {
        mon: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        tue: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        wed: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        thu: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' }
        ],
        fri: [
          { start: '09:00', end: '17:00' }
        ],
        sat: [],  // Chiuso
        sun: []   // Chiuso
      },
      exceptions: [
        {
          date: '2025-12-25',
          slots: []  // Natale - chiuso
        },
        {
          date: '2025-12-26',
          slots: [{ start: '10:00', end: '14:00' }]  // Santo Stefano - orario ridotto
        }
      ]
    };
    
    await db.collection('calendars').doc(testProId).set(calendarData);
    console.log('✅ Calendar created with NEW SCHEMA\n');

    // ========================================
    // 2. Create Lock with NEW SCHEMA (from/to as Timestamp)
    // ========================================
    console.log('2️⃣  Creating lock with from/to (Timestamp)');
    
    const now = Date.now();
    const lockData = {
      from: admin.firestore.Timestamp.fromMillis(now + 3600000),  // +1 hour
      to: admin.firestore.Timestamp.fromMillis(now + 7200000),    // +2 hours
      ttl: admin.firestore.Timestamp.fromMillis(now + 300000),    // +5 minutes
      userId: 'test-user-001',
      reason: 'booking-checkout',
      createdAt: admin.firestore.Timestamp.now()
    };
    
    const lockRef = await db
      .collection('calendars')
      .doc(testProId)
      .collection('locks')
      .add(lockData);
    
    console.log(`✅ Lock created: ${lockRef.id}`);
    console.log(`   from: ${lockData.from.toDate().toISOString()}`);
    console.log(`   to: ${lockData.to.toDate().toISOString()}`);
    console.log(`   ttl: ${lockData.ttl.toDate().toISOString()}\n`);

    // ========================================
    // 3. Create Booking with NEW SCHEMA (from/to as Timestamp)
    // ========================================
    console.log('3️⃣  Creating booking with from/to (Timestamp)');
    
    const bookingData = {
      proId: testProId,
      userId: 'test-user-001',
      from: admin.firestore.Timestamp.fromMillis(now + 86400000),   // Tomorrow
      to: admin.firestore.Timestamp.fromMillis(now + 90000000),     // Tomorrow + 1 hour
      status: 'confirmed',
      serviceId: 'test-service-001',
      createdAt: admin.firestore.Timestamp.now()
    };
    
    const bookingRef = await db.collection('bookings').add(bookingData);
    
    console.log(`✅ Booking created: ${bookingRef.id}`);
    console.log(`   from: ${bookingData.from.toDate().toISOString()}`);
    console.log(`   to: ${bookingData.to.toDate().toISOString()}\n`);

    // ========================================
    // 4. Test Availability API
    // ========================================
    console.log('4️⃣  Testing availability API');
    console.log('   Run this command to test:');
    console.log(`   curl "http://localhost:8080/api/pros/${testProId}/availability?date=2025-11-20" | jq\n`);

    // ========================================
    // Summary
    // ========================================
    console.log('============================================');
    console.log('✅ Test data created with NEW SCHEMA!');
    console.log('============================================\n');
    console.log('Summary:');
    console.log(`  PRO ID: ${testProId}`);
    console.log(`  Lock ID: ${lockRef.id}`);
    console.log(`  Booking ID: ${bookingRef.id}\n`);
    console.log('Calendar features:');
    console.log('  ✅ weeklySchedule uses string keys (mon/tue/wed/...)');
    console.log('  ✅ exceptions is an array');
    console.log('  ✅ locks use from/to (Timestamp)');
    console.log('  ✅ bookings use from/to (Timestamp)');
    console.log('  ✅ ttl is Timestamp\n');
    console.log('Next steps:');
    console.log('  1. Start backend: cd backend && npm run dev');
    console.log('  2. Test availability: ./test-availability.sh');
    console.log('  3. Check lock cleanup (wait 15 minutes)\n');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

// Run
createTestDataNewSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
