/**
 * Cleanup Test Data Script
 * 
 * Removes all test/performance data from Firestore
 * 
 * Targets:
 * - Users with email containing "@mypetcare.test"
 * - PROs with prefix "pro-perf-" or "pro-test-"
 * - Bookings with prefix "booking-perf-" or "booking-test-"
 * - Reviews with test prefixes
 * - Expired locks (TTL < now)
 * 
 * Run with:
 * npx ts-node scripts/cleanup-test-data.ts
 * 
 * Add --confirm flag to actually delete:
 * npx ts-node scripts/cleanup-test-data.ts --confirm
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

const DRY_RUN = !process.argv.includes('--confirm');

interface CleanupStats {
  usersDeleted: number;
  prosDeleted: number;
  bookingsDeleted: number;
  reviewsDeleted: number;
  locksDeleted: number;
  authUsersDeleted: number;
}

/**
 * Delete documents in batches
 */
async function deleteInBatches(
  snapshot: admin.firestore.QuerySnapshot,
  collectionName: string
): Promise<number> {
  let deletedCount = 0;
  const batchSize = 500;

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = snapshot.docs.slice(i, i + batchSize);

    for (const doc of batchDocs) {
      if (!DRY_RUN) {
        batch.delete(doc.ref);
      }
      deletedCount++;
    }

    if (!DRY_RUN) {
      await batch.commit();
    }

    console.log(`  ${DRY_RUN ? '[DRY RUN]' : '✅'} Deleted ${deletedCount}/${snapshot.size} ${collectionName}`);
  }

  return deletedCount;
}

/**
 * Clean up test user accounts
 */
async function cleanupUsers(): Promise<number> {
  console.log('\n📝 Cleaning up test users...');

  // Query users with test emails
  const usersSnapshot = await db.collection('users').get();
  
  const testUsers = usersSnapshot.docs.filter(doc => {
    const email = doc.data().email || '';
    return email.includes('@mypetcare.test') || 
           doc.id.startsWith('user-perf-') ||
           doc.id.startsWith('user-test-');
  });

  console.log(`  Found ${testUsers.length} test users`);

  // Delete Firestore documents
  let deletedCount = 0;
  const batchSize = 500;

  for (let i = 0; i < testUsers.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = testUsers.slice(i, i + batchSize);

    for (const doc of batchDocs) {
      if (!DRY_RUN) {
        batch.delete(doc.ref);
      }
      deletedCount++;
    }

    if (!DRY_RUN) {
      await batch.commit();
    }

    console.log(`  ${DRY_RUN ? '[DRY RUN]' : '✅'} Deleted ${deletedCount}/${testUsers.length} user documents`);
  }

  // Delete Firebase Auth users
  let authDeletedCount = 0;
  for (const doc of testUsers) {
    try {
      if (!DRY_RUN) {
        await auth.deleteUser(doc.id);
      }
      authDeletedCount++;

      if (authDeletedCount % 50 === 0) {
        console.log(`  ${DRY_RUN ? '[DRY RUN]' : '✅'} Deleted ${authDeletedCount}/${testUsers.length} auth users`);
      }
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error(`  ⚠️  Error deleting auth user ${doc.id}:`, error.message);
      }
    }
  }

  console.log(`✅ Cleaned up ${deletedCount} test users (${authDeletedCount} auth accounts)`);
  return deletedCount;
}

/**
 * Clean up test PRO accounts
 */
async function cleanupPros(): Promise<number> {
  console.log('\n📝 Cleaning up test PROs...');

  const prosSnapshot = await db.collection('pros')
    .where('email', '>=', '@mypetcare.test')
    .get();

  const testPros = prosSnapshot.docs.filter(doc => 
    doc.id.startsWith('pro-perf-') || doc.id.startsWith('pro-test-')
  );

  console.log(`  Found ${testPros.length} test PROs`);

  const deletedCount = await deleteInBatches(
    { docs: testPros, size: testPros.length } as admin.firestore.QuerySnapshot,
    'PROs'
  );

  // Delete Firebase Auth users
  for (const doc of testPros) {
    try {
      if (!DRY_RUN) {
        await auth.deleteUser(doc.id);
      }
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error(`  ⚠️  Error deleting auth PRO ${doc.id}:`, error.message);
      }
    }
  }

  console.log(`✅ Cleaned up ${deletedCount} test PROs`);
  return deletedCount;
}

/**
 * Clean up test bookings
 */
async function cleanupBookings(): Promise<number> {
  console.log('\n📝 Cleaning up test bookings...');

  const bookingsSnapshot = await db.collection('bookings').get();
  
  const testBookings = bookingsSnapshot.docs.filter(doc =>
    doc.id.startsWith('booking-perf-') || doc.id.startsWith('booking-test-')
  );

  console.log(`  Found ${testBookings.length} test bookings`);

  const deletedCount = await deleteInBatches(
    { docs: testBookings, size: testBookings.length } as admin.firestore.QuerySnapshot,
    'bookings'
  );

  console.log(`✅ Cleaned up ${deletedCount} test bookings`);
  return deletedCount;
}

/**
 * Clean up test reviews
 */
async function cleanupReviews(): Promise<number> {
  console.log('\n📝 Cleaning up test reviews...');

  const reviewsSnapshot = await db.collection('reviews').get();
  
  const testReviews = reviewsSnapshot.docs.filter(doc => {
    const data = doc.data();
    return data.userId?.includes('perf-') || 
           data.userId?.includes('test-') ||
           data.proId?.includes('perf-') ||
           data.proId?.includes('test-');
  });

  console.log(`  Found ${testReviews.length} test reviews`);

  const deletedCount = await deleteInBatches(
    { docs: testReviews, size: testReviews.length } as admin.firestore.QuerySnapshot,
    'reviews'
  );

  console.log(`✅ Cleaned up ${deletedCount} test reviews`);
  return deletedCount;
}

/**
 * Clean up expired locks
 */
async function cleanupExpiredLocks(): Promise<number> {
  console.log('\n📝 Cleaning up expired locks...');

  const now = admin.firestore.Timestamp.now();
  const locksSnapshot = await db.collectionGroup('locks')
    .where('ttl', '<', now)
    .get();

  console.log(`  Found ${locksSnapshot.size} expired locks`);

  const deletedCount = await deleteInBatches(locksSnapshot, 'locks');

  console.log(`✅ Cleaned up ${deletedCount} expired locks`);
  return deletedCount;
}

/**
 * Main cleanup function
 */
async function main() {
  console.log('🧹 Starting test data cleanup...\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No data will be deleted');
    console.log('⚠️  Run with --confirm flag to actually delete data\n');
  } else {
    console.log('🚨 LIVE MODE - Data will be permanently deleted\n');
  }

  const stats: CleanupStats = {
    usersDeleted: 0,
    prosDeleted: 0,
    bookingsDeleted: 0,
    reviewsDeleted: 0,
    locksDeleted: 0,
    authUsersDeleted: 0,
  };

  try {
    // Clean up users
    stats.usersDeleted = await cleanupUsers();

    // Clean up PROs
    stats.prosDeleted = await cleanupPros();

    // Clean up bookings
    stats.bookingsDeleted = await cleanupBookings();

    // Clean up reviews
    stats.reviewsDeleted = await cleanupReviews();

    // Clean up expired locks
    stats.locksDeleted = await cleanupExpiredLocks();

    console.log('\n✅ Cleanup completed!\n');
    console.log('📊 Summary:');
    console.log(`  - Users deleted: ${stats.usersDeleted}`);
    console.log(`  - PROs deleted: ${stats.prosDeleted}`);
    console.log(`  - Bookings deleted: ${stats.bookingsDeleted}`);
    console.log(`  - Reviews deleted: ${stats.reviewsDeleted}`);
    console.log(`  - Expired locks deleted: ${stats.locksDeleted}`);

    if (DRY_RUN) {
      console.log('\n💡 This was a DRY RUN. Run with --confirm to actually delete data.');
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run cleanup
main();
