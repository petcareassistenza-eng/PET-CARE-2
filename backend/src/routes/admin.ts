/**
 * Admin Dashboard Routes
 * Gestisce statistiche, approvazione PRO, coupon
 * 
 * IMPORTANTE: Tutte le route richiedono ruolo admin
 */

import { Router } from 'express';
import { db } from '../firebase';
// import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// TODO: Decommentare quando middleware auth è pronto
// router.use(requireAuth, requireAdmin);

/**
 * Middleware temporaneo per verificare ruolo admin
 * SOSTITUIRE con requireAuth + requireAdmin production-ready
 */
const checkAdmin = (req: any, res: any, next: any) => {
  // TODO: Verificare req.user.role === 'admin' dopo implementazione auth
  // Per ora permettiamo accesso per testing
  console.warn('⚠️  Admin check bypassed - implementare requireAuth + requireAdmin');
  next();
};

router.use(checkAdmin);

// ========================================================================
// STATISTICHE GLOBALI
// ========================================================================

/**
 * GET /api/admin/stats
 * Recupera statistiche generali piattaforma
 * 
 * Response:
 * - totalPros: number
 * - activePros: number
 * - totalBookings: number
 */
router.get('/stats', async (_req, res) => {
  try {
    // Conta PRO totali
    const prosSnap = await db.collection('pros').get();
    
    // Conta prenotazioni totali
    const bookingsSnap = await db.collection('bookings').get();

    // Conta PRO con abbonamento attivo
    const activePros = prosSnap.docs.filter(
      (doc) => doc.data().subscriptionStatus === 'active'
    ).length;

    // Conta PRO approvati
    const approvedPros = prosSnap.docs.filter(
      (doc) => doc.data().status === 'approved'
    ).length;

    // Conta PRO in pending
    const pendingPros = prosSnap.docs.filter(
      (doc) => doc.data().status === 'pending'
    ).length;

    return res.json({
      totalPros: prosSnap.size,
      activePros,
      approvedPros,
      pendingPros,
      totalBookings: bookingsSnap.size,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ========================================================================
// GESTIONE PRO - APPROVAZIONE
// ========================================================================

/**
 * GET /api/admin/pros/pending
 * Lista PRO in attesa di approvazione
 * 
 * Response: Array di PRO con status='pending'
 */
router.get('/pros/pending', async (_req, res) => {
  try {
    const snapshot = await db
      .collection('pros')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(items);
    
  } catch (error) {
    console.error('Admin pros/pending error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/pros/all
 * Lista tutti i PRO con filtri opzionali
 * 
 * Query params:
 * - status?: 'pending' | 'approved' | 'rejected'
 * - subscriptionStatus?: 'active' | 'inactive' | 'trial' | 'past_due'
 * - limit?: number (default 50)
 */
router.get('/pros/all', async (req, res) => {
  try {
    const { status, subscriptionStatus, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;

    let query = db.collection('pros') as any;

    if (status) {
      query = query.where('status', '==', status);
    }

    if (subscriptionStatus) {
      query = query.where('subscriptionStatus', '==', subscriptionStatus);
    }

    query = query.orderBy('createdAt', 'desc').limit(limitNum);

    const snapshot = await query.get();

    const items = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(items);
    
  } catch (error) {
    console.error('Admin pros/all error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/pros/:id/approve
 * Approva un PRO (status -> 'approved')
 */
router.post('/pros/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('pros').doc(id).update({
      status: 'approved',
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`PRO ${id} approved by admin`);

    return res.json({ 
      ok: true,
      message: 'PRO approved successfully',
    });
    
  } catch (error) {
    console.error('Admin approve PRO error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/pros/:id/reject
 * Rifiuta un PRO (status -> 'rejected')
 * 
 * Body:
 * - reason?: string
 */
router.post('/pros/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db.collection('pros').doc(id).update({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason || null,
      updatedAt: new Date(),
    });

    console.log(`PRO ${id} rejected by admin`);

    return res.json({ 
      ok: true,
      message: 'PRO rejected',
    });
    
  } catch (error) {
    console.error('Admin reject PRO error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ========================================================================
// GESTIONE COUPON
// ========================================================================

/**
 * GET /api/admin/coupons
 * Lista tutti i coupon
 */
router.get('/coupons', async (_req, res) => {
  try {
    const snapshot = await db
      .collection('coupons')
      .orderBy('createdAt', 'desc')
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(items);
    
  } catch (error) {
    console.error('Admin coupons list error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/coupons
 * Crea un nuovo coupon (FREE-1M, FREE-3M, FREE-12M)
 * 
 * Body:
 * - code: string (es. "FREE-1M")
 * - monthsFree: number (es. 1, 3, 12)
 * - description?: string
 * - maxUses?: number (default null = illimitato)
 */
router.post('/coupons', async (req, res) => {
  try {
    const { code, monthsFree, description, maxUses } = req.body;

    if (!code || !monthsFree) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code, monthsFree' 
      });
    }

    // Verifica che il codice non esista già
    const existingCoupon = await db
      .collection('coupons')
      .where('code', '==', code.toUpperCase())
      .get();

    if (!existingCoupon.empty) {
      return res.status(409).json({ 
        error: 'Coupon code already exists' 
      });
    }

    // Crea coupon
    const docRef = await db.collection('coupons').add({
      code: code.toUpperCase(),
      type: 'FREE_MONTHS',
      monthsFree: parseInt(monthsFree),
      description: description || null,
      active: true,
      maxUses: maxUses ? parseInt(maxUses) : null,
      currentUses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Coupon ${code} created by admin`);

    return res.json({ 
      id: docRef.id,
      message: 'Coupon created successfully',
    });
    
  } catch (error) {
    console.error('Admin create coupon error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/coupons/:id/deactivate
 * Disattiva un coupon (active -> false)
 */
router.post('/coupons/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('coupons').doc(id).update({
      active: false,
      deactivatedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Coupon ${id} deactivated by admin`);

    return res.json({ 
      ok: true,
      message: 'Coupon deactivated',
    });
    
  } catch (error) {
    console.error('Admin deactivate coupon error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/coupons/:id/activate
 * Riattiva un coupon (active -> true)
 */
router.post('/coupons/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('coupons').doc(id).update({
      active: true,
      deactivatedAt: null,
      updatedAt: new Date(),
    });

    console.log(`Coupon ${id} activated by admin`);

    return res.json({ 
      ok: true,
      message: 'Coupon activated',
    });
    
  } catch (error) {
    console.error('Admin activate coupon error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ========================================================================
// STATISTICHE REVENUE (OPZIONALE)
// ========================================================================

/**
 * GET /api/admin/revenue
 * Statistiche revenue aggregate
 * 
 * Query params:
 * - period?: 'day' | 'week' | 'month' | 'year'
 */
router.get('/revenue', async (req, res) => {
  try {
    const { period } = req.query;

    // TODO: Implementare aggregazione revenue da bookings/transactions
    // Per ora ritorna placeholder

    return res.json({
      period: period || 'month',
      totalRevenue: 0,
      platformFee: 0,
      prosRevenue: 0,
      message: 'Revenue tracking to be implemented',
    });
    
  } catch (error) {
    console.error('Admin revenue error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
