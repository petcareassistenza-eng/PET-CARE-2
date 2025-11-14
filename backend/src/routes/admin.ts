// src/routes/admin.ts
import { Router } from 'express';
import { db } from '../firebase';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

// STATISTICHE GLOBALI
router.get('/stats', async (_req, res) => {
  try {
    const prosSnap = await db.collection('pros').get();
    const bookingsSnap = await db.collection('bookings').get();

    const activePros = prosSnap.docs.filter(
      (d) => d.data().subscriptionStatus === 'active'
    ).length;

    return res.json({
      totalPros: prosSnap.size,
      activePros,
      totalBookings: bookingsSnap.size
    });
  } catch (err) {
    console.error('Admin stats error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PRO PENDING
router.get('/pros/pending', async (_req, res) => {
  try {
    const snap = await db
      .collection('pros')
      .where('status', '==', 'pending')
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(items);
  } catch (err) {
    console.error('Admin pending PRO error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/pros/:id/approve', async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection('pros').doc(id).update({
      status: 'approved',
      approvedAt: new Date()
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin approve PRO error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// COUPONS
router.get('/coupons', async (_req, res) => {
  try {
    const snap = await db.collection('coupons').get();
    return res.json(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }))
    );
  } catch (err) {
    console.error('Admin list coupons error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, monthsFree, description } = req.body;
    if (!code || !monthsFree) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const doc = await db.collection('coupons').add({
      code: (code as string).toUpperCase(),
      type: 'FREE_MONTHS',
      monthsFree,
      description: description || null,
      active: true,
      createdAt: new Date()
    });

    return res.json({ id: doc.id });
  } catch (err) {
    console.error('Admin create coupon error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
