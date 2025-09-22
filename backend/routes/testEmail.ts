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
        messageId: result.messageId 
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

export default router;
