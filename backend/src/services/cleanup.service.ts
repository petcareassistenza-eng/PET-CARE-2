import * as admin from 'firebase-admin';

import { logger } from '../logger.js';

const db = admin.firestore();

/**
 * Clean up expired locks across all PRO calendars
 * Run this periodically (e.g., every 5 minutes) via cron/scheduler
 * 
 * Alternative: Enable Firestore TTL policy on 'ttl' field for zero-maintenance
 */
export async function cleanupExpiredLocks(): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  const BATCH_LIMIT = 450; // Safe batch size (Firestore max is 500)
  
  let deletedTotal = 0;
  
  try {
    logger.info('Starting cleanup of expired locks');
    
    while (true) {
      // Use collectionGroup to get ALL locks from ALL PROs
      const snapshot = await db
        .collectionGroup('locks')
        .where('ttl', '<=', now)
        .orderBy('ttl', 'asc')
        .limit(BATCH_LIMIT)
        .get();
      
      if (snapshot.empty) {
        break;
      }
      
      // Delete in batch
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedTotal += snapshot.size;
      
      logger.info({ deleted: snapshot.size, total: deletedTotal }, 'Batch of locks deleted');
      
      // Small delay to avoid throttling
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    
    logger.info({ totalDeleted: deletedTotal }, 'Cleanup completed');
    return deletedTotal;
    
  } catch (error: any) {
    logger.error({ error: error.message }, 'Cleanup failed');
    throw error;
  }
}

/**
 * Clean up locks for a specific PRO
 */
export async function cleanupProLocks(proId: string): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  const BATCH_LIMIT = 450;
  
  let deletedTotal = 0;
  
  try {
    logger.info({ proId }, 'Starting cleanup of PRO locks');
    
    while (true) {
      const snapshot = await db
        .collection('calendars')
        .doc(proId)
        .collection('locks')
        .where('ttl', '<=', now)
        .limit(BATCH_LIMIT)
        .get();
      
      if (snapshot.empty) {
        break;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedTotal += snapshot.size;
      
      logger.info({ proId, deleted: snapshot.size, total: deletedTotal }, 'PRO locks batch deleted');
      
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    
    logger.info({ proId, totalDeleted: deletedTotal }, 'PRO cleanup completed');
    return deletedTotal;
    
  } catch (error: any) {
    logger.error({ proId, error: error.message }, 'PRO cleanup failed');
    throw error;
  }
}
