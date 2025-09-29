import { Router } from 'express';
import { sendBookingConfirmation } from '../services/emailService';

const router = Router();

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const testBooking = {
      bookingNumber: 'TEST-001',
      customerName: 'Test Customer',
      customerEmail: req.body.email || 'test@example.com',
      customerPhone: '+1234567890',
      doctor: {
        name: 'Dr. Test Doctor',
        location: 'Test Clinic, Test City',
        specialization: 'General Medicine',
        rating: 4.5
      },
      fee: 100,
      slotId: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };

    const result = await sendBookingConfirmation(testBooking);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully!',
        providerData: (result as any).data || null
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error sending test email',
      error: error 
    });
  }
});

// Email provider health check (MailerSend)
router.get('/smtp-health', async (_req, res) => {
  try {
    const hasApiKey = Boolean(process.env.MAILERSEND_API_KEY);
    if (!hasApiKey) {
      return res.status(500).json({ success: false, provider: 'mailersend', error: 'MAILERSEND_API_KEY is not set' });
    }
    return res.json({ success: true, provider: 'mailersend' });
  } catch (error) {
    res.status(500).json({ success: false, provider: 'mailersend', error });
  }
});

export default router;
