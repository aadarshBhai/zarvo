"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
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
        const result = await (0, emailService_1.sendBookingConfirmation)(testBooking);
        if (result.success) {
            res.json({
                success: true,
                message: 'Test email sent successfully!',
                providerData: result.data || null
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending test email',
            error: error
        });
    }
});
// Email provider health check (SMTP/Nodemailer)
router.get('/smtp-health', async (_req, res) => {
    try {
        const hasHost = Boolean(process.env.SMTP_HOST || process.env.EMAIL_HOST);
        const hasUser = Boolean(process.env.SMTP_USER || process.env.EMAIL_USER);
        const hasPass = Boolean(process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD);
        if (!hasHost) {
            return res.status(500).json({ success: false, provider: 'smtp', error: 'SMTP_HOST (or EMAIL_HOST) is not set' });
        }
        if (!hasUser || !hasPass) {
            // Some SMTP servers can be anonymous but we expect auth normally
            return res.status(200).json({ success: true, provider: 'smtp', warning: 'SMTP credentials missing; ensure your server supports unauthenticated sending' });
        }
        return res.json({ success: true, provider: 'smtp' });
    }
    catch (error) {
        res.status(500).json({ success: false, provider: 'smtp', error });
    }
});
exports.default = router;
