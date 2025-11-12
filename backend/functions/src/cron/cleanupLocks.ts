import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

/**
 * Scheduled Cloud Function to clean up expired locks
 * Runs every 15 minutes to remove locks where ttl < now
 * 
 * Deploy: firebase deploy --only functions:cleanupExpiredLocks
 */
export const cleanupExpiredLocks = functions.pubsub
  .schedule("every 15 minutes")
  .timeZone("Europe/Rome")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    console.log(`[cleanupExpiredLocks] Starting cleanup at ${now.toDate().toISOString()}`);
    
    try {
      const prosSnap = await db.collection("calendars").get();
      
      if (prosSnap.empty) {
        console.log("[cleanupExpiredLocks] No calendars found");
        return null;
      }

      const batch = db.bulkWriter();
      let deleted = 0;

      for (const proDoc of prosSnap.docs) {
        const locksRef = proDoc.ref.collection("locks");
        
        // Query expired locks where ttl < now (Timestamp comparison)
        const expired = await locksRef
          .where("ttl", "<", now)
          .limit(500)
          .get();
        
        expired.forEach(doc => {
          batch.delete(doc.ref);
          deleted++;
        });
      }

      // Commit all deletions
      await batch.close();
      
      console.log(
        `[cleanupExpiredLocks] Deleted ${deleted} expired locks at ${now.toDate().toISOString()}`
      );
      
      return { deleted, timestamp: now.toMillis() };
      
    } catch (error: any) {
      console.error("[cleanupExpiredLocks] Error:", error);
      throw error;
    }
  });
