// src/routes/pros.ts
import { Router } from 'express';
import { db } from '../firebase';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Crea/Aggiorna PRO del current user (proId = uid)
router.post('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const {
      displayName,
      city,
      services,
      categories,
      description,
      phone
    } = req.body;

    await db
      .collection('pros')
      .doc(uid)
      .set(
        {
          uid,
          displayName,
          city,
          services,
          categories,
          description,
          phone,
          status: 'pending',
          subscriptionStatus: 'inactive',
          updatedAt: new Date()
        },
        { merge: true }
      );

    return res.json({ ok: true, proId: uid });
  } catch (err) {
    console.error('Create/update PRO error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lista PRO visibili nella mappa (solo approved + abbonati attivi)
router.get('/', async (_req, res) => {
  try {
    const snap = await db
      .collection('pros')
      .where('status', '==', 'approved')
      .where('subscriptionStatus', '==', 'active')
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(items);
  } catch (err) {
    console.error('List PRO error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const snap = await db.collection('pros').doc(req.params.id).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'PRO not found' });
    }
    return res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error('Get PRO error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
