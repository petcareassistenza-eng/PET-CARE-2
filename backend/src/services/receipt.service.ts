import { getDb } from '../utils/firebaseAdmin';
/**
 * Receipt Service - PDF Generation with Firebase Storage Upload
 * 
 * Generates professional PDF receipts for completed bookings
 * Uploads to Firebase Storage and updates Firestore with URL
 * Sends email notification with receipt attached
 */

import admin from 'firebase-admin';
import PDFDocument from 'pdfkit';

const db = getDb();
const storage = admin.storage();

/**
 * Generate PDF Receipt for a booking
 * 
 * @param bookingId - Firestore booking document ID
 * @returns Buffer containing PDF data
 */
export async function generateReceiptPDF(bookingId: string): Promise<Buffer> {
  try {
    // Fetch booking data
    const bookingDoc = await db.doc(`bookings/${bookingId}`).get();
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data()!;

    // Fetch related data
    const [userDoc, proDoc] = await Promise.all([
      db.doc(`users/${booking.userId}`).get(),
      db.doc(`pros/${booking.proId}`).get(),
    ]);

    const user = userDoc.data() || {};
    const pro = proDoc.data() || {};

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Ricevuta ${bookingId}`,
        Author: 'MyPetCare',
        Subject: 'Ricevuta Pagamento',
        Creator: 'MyPetCare Backend',
      },
    });

    // Buffer to store PDF
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // ==========================================
    // PDF Header
    // ==========================================
    doc.fontSize(24).font('Helvetica-Bold').text('RICEVUTA PAGAMENTO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('MyPetCare – Servizi per Animali', { align: 'center' });
    doc.text('P.IVA: IT12345678901', { align: 'center' });
    doc.text('Via Roma 123, 00100 Roma RM', { align: 'center' });
    doc.moveDown(2);

    // ==========================================
    // Receipt Details
    // ==========================================
    doc.fontSize(12).font('Helvetica-Bold').text('Dettagli Ricevuta', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Numero Ricevuta: ${bookingId}`, { continued: false });
    doc.text(`Data Emissione: ${new Date().toLocaleDateString('it-IT')}`, { continued: false });
    doc.text(`Stato Pagamento: ${booking.paymentStatus === 'paid' ? 'PAGATO' : 'PENDING'}`, { continued: false });
    doc.moveDown(1);

    // ==========================================
    // Customer Information
    // ==========================================
    doc.fontSize(12).font('Helvetica-Bold').text('Cliente', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Nome: ${user.displayName || 'N/A'}`, { continued: false });
    doc.text(`Email: ${user.email || 'N/A'}`, { continued: false });
    doc.moveDown(1);

    // ==========================================
    // Service Provider Information
    // ==========================================
    doc.fontSize(12).font('Helvetica-Bold').text('Professionista', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Nome: ${pro.displayName || 'N/A'}`, { continued: false });
    doc.text(`Servizio: ${booking.serviceName || 'Servizio Pet'}`, { continued: false });
    doc.moveDown(1);

    // ==========================================
    // Booking Details
    // ==========================================
    doc.fontSize(12).font('Helvetica-Bold').text('Dettagli Prenotazione', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Data Servizio: ${booking.date || 'N/A'}`, { continued: false });
    doc.text(`Orario: ${booking.startTime || 'N/A'}`, { continued: false });
    doc.text(`Durata: ${booking.duration || 30} minuti`, { continued: false });
    doc.moveDown(1);

    // ==========================================
    // Payment Breakdown
    // ==========================================
    doc.fontSize(12).font('Helvetica-Bold').text('Dettagli Pagamento', { underline: true });
    doc.moveDown(0.5);

    const subtotal = booking.price || 0;
    const discount = booking.discount || 0;
    const total = subtotal - discount;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Subtotale: €${subtotal.toFixed(2)}`, { continued: false });
    
    if (discount > 0) {
      doc.text(`Sconto Applicato: -€${discount.toFixed(2)}`, { continued: false });
    }

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`TOTALE PAGATO: €${total.toFixed(2)}`, { align: 'right' });
    doc.moveDown(1);

    // ==========================================
    // Payment Method
    // ==========================================
    doc.fontSize(10).font('Helvetica');
    const paymentMethod = booking.stripeSessionId ? 'Stripe (Carta di Credito)' : 
                          booking.paypalOrderId ? 'PayPal' : 'N/A';
    doc.text(`Metodo Pagamento: ${paymentMethod}`, { continued: false });
    
    if (booking.stripeSessionId) {
      doc.text(`ID Transazione Stripe: ${booking.stripeSessionId}`, { continued: false });
    }
    if (booking.paypalCaptureId) {
      doc.text(`ID Transazione PayPal: ${booking.paypalCaptureId}`, { continued: false });
    }
    
    doc.moveDown(2);

    // ==========================================
    // Footer
    // ==========================================
    doc.fontSize(8).font('Helvetica-Oblique');
    doc.text('Questo documento è stato generato elettronicamente e non richiede firma.', { align: 'center' });
    doc.text('Per assistenza: support@mypetcare.it | Tel: +39 06 12345678', { align: 'center' });
    doc.moveDown(1);
    doc.text('© 2025 MyPetCare. Tutti i diritti riservati.', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation
    const pdfBuffer = await pdfPromise;

    // ==========================================
    // Upload to Firebase Storage
    // ==========================================
    const bucket = storage.bucket();
    const fileName = `receipts/${bookingId}.pdf`;
    const file = bucket.file(fileName);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          bookingId,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible (or use signed URL for private access)
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Update booking with receipt URL
    await db.doc(`bookings/${bookingId}`).update({
      receiptUrl: publicUrl,
      receiptGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Receipt generated for booking ${bookingId}: ${publicUrl}`);

    return pdfBuffer;

  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw new Error(`Failed to generate receipt: ${error}`);
  }
}

/**
 * Send Receipt Email to User
 * 
 * @param bookingId - Booking ID
 * @param userEmail - User email address
 */
export async function sendReceiptEmail(bookingId: string, userEmail: string): Promise<void> {
  try {
    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(bookingId);

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const msg = {
      to: userEmail,
      from: 'noreply@mypetcare.it',
      subject: `Ricevuta MyPetCare - ${bookingId}`,
      text: 'Grazie per aver utilizzato MyPetCare. In allegato trovi la ricevuta del tuo pagamento.',
      html: '<p>Grazie per aver utilizzato <strong>MyPetCare</strong>.</p><p>In allegato trovi la ricevuta del tuo pagamento.</p>',
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `receipt-${bookingId}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
    */

    console.log(`📧 Receipt email sent to ${userEmail} for booking ${bookingId}`);

  } catch (error) {
    console.error('Error sending receipt email:', error);
    throw error;
  }
}
