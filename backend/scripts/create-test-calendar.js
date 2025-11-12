/**
 * Create test calendar data in Firestore
 * 
 * Usage: node scripts/create-test-calendar.js
 * 
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env variable
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function createTestCalendar() {
  const proId = 'test-pro-001';
  
  console.log('Creating test calendar for PRO:', proId);

  // Create calendar meta
  const metaRef = db.collection('calendars').doc(proId).collection('meta').doc('config');
  
  await metaRef.set({
    stepMin: 30,
    weeklySchedule: {
      '0': [], // Sunday - closed
      '1': [ // Monday
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ],
      '2': [ // Tuesday
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ],
      '3': [ // Wednesday
        { start: '09:00', end: '13:00' }
      ],
      '4': [ // Thursday
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ],
      '5': [ // Friday
        { start: '09:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ],
      '6': [ // Saturday
        { start: '10:00', end: '14:00' }
      ],
    },
    exceptions: {
      '2025-12-25': [], // Christmas - closed
      '2025-11-15': [ // Special hours
        { start: '10:00', end: '12:30' },
        { start: '16:00', end: '20:00' }
      ]
    }
  });

  console.log('✅ Calendar meta created');

  // Create a test lock (will expire in 10 minutes)
  const testLockTime = Date.now() + (10 * 60 * 1000);
  const lockRef = db.collection('calendars').doc(proId).collection('locks').doc('test-lock-001');
  
  await lockRef.set({
    slotStart: new Date('2025-11-20T10:00:00').getTime(),
    slotEnd: new Date('2025-11-20T10:30:00').getTime(),
    ttl: testLockTime,
    userId: 'test-user-001',
    bookingId: 'test-booking-001',
    createdAt: Date.now()
  });

  console.log('✅ Test lock created (expires in 10 minutes)');

  console.log('\nTest calendar data created successfully!');
  console.log('\nTest with:');
  console.log(`curl "http://localhost:8080/api/pros/${proId}/availability?date=2025-11-20" | jq .`);
  
  process.exit(0);
}

createTestCalendar().catch(error => {
  console.error('Error creating test calendar:', error);
  process.exit(1);
});
