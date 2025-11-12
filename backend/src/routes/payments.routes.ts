/**
 * Payment Routes - Stripe + PayPal + PDF Receipts
 * 
 * Endpoints:
 * - POST /payments/stripe/create-session - Create Stripe checkout
 * - POST /payments/paypal/create-order - Create PayPal order
 * - POST /payments/paypal/capture-order - Capture PayPal payment
 * - GET /payments/receipt/:bookingId - Download PDF receipt
 */

import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';
import Stripe from 'stripe';

import { requireAuth } from '../middleware/auth.middleware';
import { generateReceiptPDF } from '../services/receipt.service';

const router = Router();
const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// ==========================================
// Stripe Checkout Session Creation
// ==========================================

/**
 * Create Stripe Checkout Session
 * 
 * Body:
 * - userId: string (authenticated user)
 * - planId: string (Stripe Price ID)
 * - coupon?: string (coupon code)
 * - bookingId?: string (for one-time payments)
 * 
 * Returns: { url: string } (Stripe Checkout URL)
 */
router.post('/stripe/create-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, planId, coupon, bookingId } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({ error: 'Missing required fields: userId, planId' });
    }

    // Get user email
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data()!;
    const email = userData.email || req.user?.email;

    // Prepare session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: bookingId ? 'payment' : 'subscription',
      customer_email: email,
      line_items: [{ price: planId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        userId,
        ...(bookingId && { bookingId }),
      },
    };

    // Apply coupon if provided
    if (coupon) {
      // Validate coupon in Firestore
      const couponDoc = await db.doc(`coupons/${coupon}`).get();
      if (couponDoc.exists && couponDoc.data()?.active === true) {
        sessionConfig.discounts = [{ coupon }];
      }
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ 
      url: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create Stripe session',
      message: error.message,
    });
  }
});

// ==========================================
// PayPal Order Management
// ==========================================

/**
 * Create PayPal Order (one-time payment)
 * 
 * Body:
 * - userId: string
 * - amount: number (in EUR)
 * - bookingId?: string
 * 
 * Returns: { orderId: string, approvalUrl: string }
 */
router.post('/paypal/create-order', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, amount, bookingId } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: userId, amount' });
    }

    // PayPal SDK initialization (requires @paypal/checkout-server-sdk)
    const paypal = require('@paypal/checkout-server-sdk');
    
    // Configure PayPal client
    const environment = process.env.PAYPAL_MODE === 'live'
      ? new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_CLIENT_SECRET!
        )
      : new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_CLIENT_SECRET!
        );

    const client = new paypal.core.PayPalHttpClient(environment);

    // Create order request
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: amount.toFixed(2),
        },
        custom_id: bookingId || userId,
      }],
      application_context: {
        brand_name: 'MyPetCare',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL}/success`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      },
    });

    // Execute request
    const order = await client.execute(request);
    const orderId = order.result.id;

    // Find approval URL
    const approvalUrl = order.result.links.find((link: any) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new Error('PayPal approval URL not found');
    }

    // Store order ID in Firestore for tracking
    if (bookingId) {
      await db.doc(`bookings/${bookingId}`).update({
        paypalOrderId: orderId,
        paymentStatus: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ 
      orderId,
      approvalUrl,
    });

  } catch (error: any) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create PayPal order',
      message: error.message,
    });
  }
});

/**
 * Capture PayPal Order (confirm payment)
 * 
 * Body:
 * - orderId: string (PayPal Order ID)
 * - bookingId?: string
 * 
 * Returns: { success: true, captureId: string }
 */
router.post('/paypal/capture-order', requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderId, bookingId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing required field: orderId' });
    }

    const paypal = require('@paypal/checkout-server-sdk');
    
    // Configure PayPal client
    const environment = process.env.PAYPAL_MODE === 'live'
      ? new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_CLIENT_SECRET!
        )
      : new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_CLIENT_SECRET!
        );

    const client = new paypal.core.PayPalHttpClient(environment);

    // Capture order
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const capture = await client.execute(request);
    const captureId = capture.result.purchase_units[0].payments.captures[0].id;

    // Update booking status
    if (bookingId) {
      await db.doc(`bookings/${bookingId}`).update({
        paymentStatus: 'paid',
        paypalCaptureId: captureId,
        status: 'confirmed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Generate PDF receipt automatically
      await generateReceiptPDF(bookingId);
    }

    res.json({ 
      success: true,
      captureId,
      message: 'Payment captured successfully',
    });

  } catch (error: any) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ 
      error: 'Failed to capture PayPal payment',
      message: error.message,
    });
  }
});

// ==========================================
// PDF Receipt Generation & Download
// ==========================================

/**
 * Download PDF Receipt for a booking
 * 
 * Params:
 * - bookingId: string
 * 
 * Returns: PDF file stream
 */
router.get('/receipt/:bookingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    // Verify user owns this booking or is admin
    const bookingDoc = await db.doc(`bookings/${bookingId}`).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingDoc.data()!;
    const isOwner = booking.userId === req.user?.uid;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized access to receipt' });
    }

    // Check if payment is completed
    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed yet' });
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(bookingId);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${bookingId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Receipt generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate receipt',
      message: error.message,
    });
  }
});

export default router;
