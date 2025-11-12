/**
 * MyPetCare - Messages Router
 * Handles in-app chat between users and PROs
 */

import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const fcm = admin.messaging();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate deterministic conversation ID from two user IDs
 * Always returns IDs in sorted order for consistency
 */
function convoIdOf(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

/**
 * Verify user is participant in conversation
 */
function isParticipant(userId: string, convoId: string): boolean {
  return convoId.split('_').includes(userId);
}

// ============================================================================
// CREATE/GET THREAD
// ============================================================================
// Creates a new conversation thread or returns existing one

router.post('/thread', async (req: any, res: Response) => {
  try {
    const { userId, proId } = req.body;
    
    if (!userId || !proId) {
      return res.status(400).json({
        error: 'Missing required fields: userId, proId',
      });
    }
    
    // Generate conversation ID
    const id = convoIdOf(userId, proId);
    
    // Create or update thread document
    const threadRef = db.collection('threads').doc(id);
    await threadRef.set({
      id,
      users: [userId, proId].sort(),
      lastMessage: null,
      unreadCount: {
        [userId]: 0,
        [proId]: 0,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    console.log(`✅ Thread created/updated: ${id}`);
    
    res.json({
      id,
      users: [userId, proId].sort(),
    });
    
  } catch (error: any) {
    console.error('Error creating thread:', error);
    res.status(500).json({
      error: error.message || 'Failed to create thread',
    });
  }
});

// ============================================================================
// SEND MESSAGE
// ============================================================================
// Sends a message in a conversation and triggers FCM notification

router.post('/:convoId/send', async (req: any, res: Response) => {
  try {
    const { convoId } = req.params;
    const { from, to, text } = req.body;
    
    // Validation
    if (!from || !to || !text) {
      return res.status(400).json({
        error: 'Missing required fields: from, to, text',
      });
    }
    
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Message text must be non-empty string',
      });
    }
    
    // Verify conversation ID matches participants
    const expectedConvoId = convoIdOf(from, to);
    if (convoId !== expectedConvoId) {
      return res.status(400).json({
        error: 'Conversation ID does not match participants',
      });
    }
    
    // Create message document
    const threadRef = db.collection('threads').doc(convoId);
    const messageRef = threadRef.collection('messages').doc();
    
    const messageData = {
      from,
      to,
      text: text.trim(),
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await messageRef.set(messageData);
    
    // Update thread metadata
    await threadRef.set({
      lastMessage: {
        from,
        text: text.trim().substring(0, 100), // Truncate for preview
        at: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      [`unreadCount.${to}`]: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
    
    console.log(`✅ Message sent in thread ${convoId}: ${messageRef.id}`);
    
    // Send FCM notification to recipient
    try {
      const recipientDoc = await db.collection('users').doc(to).get();
      const fcmTokens: string[] = recipientDoc.data()?.fcmTokens || [];
      
      if (fcmTokens.length > 0) {
        // Get sender name for notification
        const senderDoc = await db.collection('users').doc(from).get();
        const senderName = senderDoc.data()?.name || 'Utente';
        
        await fcm.sendEachForMulticast({
          tokens: fcmTokens,
          notification: {
            title: `💬 ${senderName}`,
            body: text.trim().substring(0, 100),
          },
          data: {
            type: 'chat_message',
            convoId,
            from,
            messageId: messageRef.id,
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'chat_messages',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
        
        console.log(`   FCM notification sent to ${fcmTokens.length} devices`);
      }
    } catch (notificationError: any) {
      console.warn('⚠️  Failed to send FCM notification:', notificationError.message);
      // Don't fail the request if notification fails
    }
    
    res.json({
      ok: true,
      id: messageRef.id,
      convoId,
    });
    
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: error.message || 'Failed to send message',
    });
  }
});

// ============================================================================
// GET MESSAGES (WITH PAGINATION)
// ============================================================================
// Retrieves messages from a conversation with pagination support

router.get('/:convoId', async (req: any, res: Response) => {
  try {
    const { convoId } = req.params;
    const { limit = 50, before } = req.query;
    
    // Parse limit with validation
    const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100
    
    // Build query
    let query = db.collection('threads')
      .doc(convoId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limitNum);
    
    // Add pagination cursor if provided
    if (before) {
      const beforeTimestamp = parseInt(before as string);
      if (!isNaN(beforeTimestamp)) {
        query = query.startAfter(new Date(beforeTimestamp));
      }
    }
    
    // Execute query
    const snapshot = await query.get();
    
    // Map messages to response format
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        from: data.from,
        to: data.to,
        text: data.text,
        read: data.read || false,
        createdAt: data.createdAt?.toMillis?.() || null,
      };
    });
    
    // Get pagination cursor for next page
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc?.data()?.createdAt?.toMillis?.() || null;
    
    console.log(`✅ Retrieved ${items.length} messages from thread ${convoId}`);
    
    res.json({
      items,
      hasMore: items.length === limitNum,
      nextCursor,
    });
    
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch messages',
    });
  }
});

// ============================================================================
// MARK MESSAGES AS READ
// ============================================================================
// Marks all messages in a conversation as read for the current user

router.post('/:convoId/mark-read', async (req: any, res: Response) => {
  try {
    const { convoId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId',
      });
    }
    
    // Verify user is participant
    if (!isParticipant(userId, convoId)) {
      return res.status(403).json({
        error: 'User is not a participant in this conversation',
      });
    }
    
    // Get unread messages for this user
    const messagesSnapshot = await db.collection('threads')
      .doc(convoId)
      .collection('messages')
      .where('to', '==', userId)
      .where('read', '==', false)
      .get();
    
    if (messagesSnapshot.empty) {
      return res.json({
        ok: true,
        markedRead: 0,
      });
    }
    
    // Mark all as read in batches
    const batchSize = 500;
    let totalMarked = 0;
    
    for (let i = 0; i < messagesSnapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = messagesSnapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      await batch.commit();
      totalMarked += batchDocs.length;
    }
    
    // Reset unread count in thread
    await db.collection('threads').doc(convoId).update({
      [`unreadCount.${userId}`]: 0,
    });
    
    console.log(`✅ Marked ${totalMarked} messages as read in thread ${convoId}`);
    
    res.json({
      ok: true,
      markedRead: totalMarked,
    });
    
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark messages as read',
    });
  }
});

// ============================================================================
// GET USER THREADS
// ============================================================================
// Retrieves all conversation threads for a user

router.get('/user/:userId/threads', async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Query threads where user is participant
    const threadsSnapshot = await db.collection('threads')
      .where('users', 'array-contains', userId)
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();
    
    // Map threads to response format
    const threads = await Promise.all(
      threadsSnapshot.docs.map(async doc => {
        const data = doc.data();
        
        // Get other participant info
        const otherUserId = data.users.find((id: string) => id !== userId);
        let otherUserName = 'Utente';
        
        if (otherUserId) {
          try {
            const otherUserDoc = await db.collection('users').doc(otherUserId).get();
            otherUserName = otherUserDoc.data()?.name || 'Utente';
          } catch (e) {
            console.warn(`Could not fetch user ${otherUserId}`);
          }
        }
        
        return {
          id: doc.id,
          otherUserId,
          otherUserName,
          lastMessage: data.lastMessage || null,
          unreadCount: data.unreadCount?.[userId] || 0,
          updatedAt: data.updatedAt?.toMillis?.() || null,
        };
      })
    );
    
    console.log(`✅ Retrieved ${threads.length} threads for user ${userId}`);
    
    res.json({
      threads,
    });
    
  } catch (error: any) {
    console.error('Error fetching user threads:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch threads',
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'messages',
    timestamp: new Date().toISOString(),
  });
});

export default router;
