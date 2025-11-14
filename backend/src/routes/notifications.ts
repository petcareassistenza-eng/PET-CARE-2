/**
 * Notifications Routes
 * Gestisce invio notifiche FCM push + in-app Firestore
 */

import { Router } from 'express';
import { db, adminMessaging } from '../firebase';

const router = Router();

/**
 * Struttura Firestore:
 * - userPushTokens/{userId} => { tokens: string[], updatedAt: Timestamp }
 * - notifications/{userId}/items/{notificationId} => { type, title, body, createdAt, read, data }
 */

/**
 * Funzione principale per inviare notifiche a un utente
 * Invia sia push FCM che salva notifica in-app su Firestore
 * 
 * @param userId - ID utente destinatario
 * @param payload - Dati notifica (type, title, body, data)
 */
export async function sendNotificationToUser(
  userId: string,
  payload: {
    type?: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }
) {
  try {
    // 1. Recupera i token FCM dell'utente
    const tokenDoc = await db.collection('userPushTokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      console.log(`No push tokens found for user ${userId}`);
      return;
    }

    const tokens = (tokenDoc.data()?.tokens as string[]) || [];
    
    if (!tokens.length) {
      console.log(`Empty tokens array for user ${userId}`);
      return;
    }

    // 2. Invia notifica push FCM
    try {
      const response = await adminMessaging.sendMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...(payload.data || {}),
          type: payload.type || 'generic',
        },
        // Configurazione Android
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            sound: 'default',
          },
        },
        // Configurazione iOS
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      console.log(`FCM sent to user ${userId}:`, {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // Rimuovi token non validi
      if (response.failureCount > 0) {
        const validTokens = tokens.filter((token, index) => {
          return response.responses[index].success;
        });

        if (validTokens.length < tokens.length) {
          await db.collection('userPushTokens').doc(userId).update({
            tokens: validTokens,
            updatedAt: new Date(),
          });
          
          console.log(`Removed ${tokens.length - validTokens.length} invalid tokens for user ${userId}`);
        }
      }
    } catch (fcmError) {
      console.error(`FCM send error for user ${userId}:`, fcmError);
      // Non blocchiamo l'esecuzione, continuiamo con la notifica in-app
    }

    // 3. Salva notifica in-app su Firestore
    await db
      .collection('notifications')
      .doc(userId)
      .collection('items')
      .add({
        type: payload.type || 'generic',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        createdAt: new Date(),
        read: false,
      });

    console.log(`In-app notification saved for user ${userId}`);
    
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    throw error;
  }
}

/**
 * POST /api/notifications/test
 * Endpoint di test per inviare notifica manuale
 * 
 * Body:
 * - userId: string
 * - title: string
 * - body: string
 * - type?: string
 */
router.post('/test', async (req, res) => {
  try {
    const { userId, title, body, type } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'Missing required parameters: userId, title, body' });
    }

    await sendNotificationToUser(userId, {
      title,
      body,
      type: type || 'test',
    });

    return res.json({ 
      ok: true,
      message: 'Notification sent successfully',
    });
    
  } catch (error) {
    console.error('Test notification error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/notifications/register-token
 * Registra un nuovo token FCM per un utente
 * 
 * Body:
 * - userId: string
 * - token: string
 */
router.post('/register-token', async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({ error: 'Missing userId or token' });
    }

    const docRef = db.collection('userPushTokens').doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      const existingTokens = (doc.data()?.tokens as string[]) || [];
      
      // Evita duplicati
      if (!existingTokens.includes(token)) {
        await docRef.update({
          tokens: [...existingTokens, token],
          updatedAt: new Date(),
        });
      }
    } else {
      await docRef.set({
        tokens: [token],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return res.json({ ok: true });
    
  } catch (error) {
    console.error('Register token error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/notifications/:userId
 * Recupera notifiche in-app per un utente
 * 
 * Query params:
 * - limit?: number (default 20)
 * - onlyUnread?: boolean
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const onlyUnread = req.query.onlyUnread === 'true';

    let query = db
      .collection('notifications')
      .doc(userId)
      .collection('items')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (onlyUnread) {
      query = query.where('read', '==', false) as any;
    }

    const snapshot = await query.get();
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(notifications);
    
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/notifications/:userId/:notificationId/mark-read
 * Segna una notifica come letta
 */
router.post('/:userId/:notificationId/mark-read', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    await db
      .collection('notifications')
      .doc(userId)
      .collection('items')
      .doc(notificationId)
      .update({
        read: true,
        readAt: new Date(),
      });

    return res.json({ ok: true });
    
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
