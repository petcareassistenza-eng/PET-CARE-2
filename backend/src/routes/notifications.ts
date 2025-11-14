// src/routes/notifications.ts
import { Router } from 'express';
import { db, adminMessaging } from '../firebase';

const router = Router();

// Funzione riusabile
export async function sendNotificationToUser(
  userId: string,
  payload: {
    type?: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }
) {
  const tokenDoc = await db.collection('userPushTokens').doc(userId).get();
  if (!tokenDoc.exists) {
    console.log(`No tokens for user ${userId}`);
    return;
  }

  const tokens = (tokenDoc.data()?.tokens as string[]) || [];
  if (!tokens.length) {
    console.log(`Empty tokens array for user ${userId}`);
    return;
  }

  await adminMessaging.sendMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: {
      ...(payload.data || {}),
      type: payload.type || 'generic'
    }
  });

  await db
    .collection('notifications')
    .doc(userId)
    .collection('items')
    .add({
      type: payload.type || 'generic',
      title: payload.title,
      body: payload.body,
      createdAt: new Date(),
      read: false,
      data: payload.data || {}
    });
}

// Route di test (da rimuovere in produzione)
router.post('/test', async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'Missing params' });
    }

    await sendNotificationToUser(userId, {
      type: 'test',
      title,
      body
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Notification test error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
