import nodemailer from 'nodemailer';

// Nodemailer transporter configuration (SMTP)
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

const defaultFromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_FROM || smtpUser || 'noreply@zarvo.com';
const defaultFromName = process.env.MAIL_FROM_NAME || 'Zarvo Healthcare';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  try {
    if (!smtpHost) throw new Error('SMTP_HOST is not set');

    const info = await transporter.sendMail({
      from: `${defaultFromName} <${defaultFromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
    });

    console.log('✅ Email sent:', subject, '->', to, 'id:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('❌ sendEmail error:', error);
    return { success: false, error };
  }
}

export async function sendEmailWithAttachments(
  to: string,
  subject: string,
  html: string,
  attachments: { path: string; filename: string }[]
) {
  try {
    if (!smtpHost) throw new Error('SMTP_HOST is not set');

    const atts = attachments.map((a) => ({
      filename: a.filename,
      path: a.path,
    }));

    const info = await transporter.sendMail({
      from: `${defaultFromName} <${defaultFromEmail}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, ' '),
      attachments: atts as any,
    });

    console.log('✅ Email with attachments sent:', subject, '->', to, 'id:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('❌ sendEmailWithAttachments error:', error);
    return { success: false, error };
  }
}

// Send OTP email (for signup verification / resend)
export const sendOtpEmail = async (to: string, otp: string, purpose: string = 'Email Verification') => {
  try {
    const res = await sendEmail(
      to,
      `${purpose} - Your OTP Code`,
      `<p>Your verification code is <b>${otp}</b>. It expires in 15 minutes.</p>`
    );
    return res;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return { success: false, error };
  }
};

// Notify doctor/provider about a customer cancellation
export const notifyDoctorCancellation = async (booking: any, slot: any) => {
  try {
    const to = slot?.doctor?.email || slot?.doctor?.contactEmail;
    if (!to) {
      // No doctor email available, skip silently
      return { success: false, error: 'No doctor email available' };
    }

    const res = await sendEmail(
      to,
      `🛑 Patient Cancelled - Ticket #${booking.bookingNumber}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">Appointment Cancelled by Patient</h2>
          <p>Dear ${slot?.doctor?.name || 'Provider'},</p>
          <p>The following booking has been cancelled by the patient.</p>
          <div style="background:#f8f9fa; padding: 16px; border-radius: 8px; border:1px solid #eee;">
            <p><strong>Ticket:</strong> ${booking.bookingNumber}</p>
            <p><strong>Patient:</strong> ${booking.customerName} (${booking.customerEmail}, ${booking.customerPhone})</p>
            <p><strong>Status:</strong> ${booking.status}</p>
          </div>
          <p style="color:#555; font-size:14px;">You may wish to free up this slot for other patients if not already done.</p>
          <p>Regards,<br/>Zarvo</p>
        </div>
      `
    );
    return res;
  } catch (error) {
    console.error('❌ Error sending doctor cancellation email:', error);
    return { success: false, error };
  }
};

// Email template for booking confirmation
const createBookingEmailTemplate = (booking: any) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Booking Confirmation - Zarvo</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .ticket { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; }
            .ticket-header { text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 20px; }
            .ticket-number { font-size: 24px; font-weight: bold; color: #667eea; }
            .booking-details { display: grid; gap: 15px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .qr-section { text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .status-badge { 
                display: inline-block; 
                padding: 5px 15px; 
                border-radius: 20px; 
                font-weight: bold; 
                color: white;
                background: #28a745;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎫 Booking Confirmation</h1>
                <p>Your appointment has been successfully booked!</p>
            </div>
            
            <div class="content">
                <div class="ticket">
                    <div class="ticket-header">
                        <div class="ticket-number">Ticket #${booking.bookingNumber}</div>
                        <div class="status-badge">CONFIRMED</div>
                    </div>
                    
                    <div class="booking-details">
                        <div class="detail-row">
                            <span class="detail-label">Patient Name:</span>
                            <span class="detail-value">${booking.customerName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${booking.customerEmail}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Phone:</span>
                            <span class="detail-value">${booking.customerPhone}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Doctor:</span>
                            <span class="detail-value">${booking.doctor.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Department:</span>
                            <span class="detail-value">${booking.doctor.specialization || 'General'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date & Time:</span>
                            <span class="detail-value">${new Date(booking.slotId).toLocaleDateString()} at ${booking.slotId}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Location:</span>
                            <span class="detail-value">${booking.doctor.location}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Fee:</span>
                            <span class="detail-value">$${booking.fee}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Booking Date:</span>
                            <span class="detail-value">${new Date(booking.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="qr-section">
                        <p><strong>📱 Show this QR code at the clinic for quick check-in</strong></p>
                        <p style="color: #666; font-size: 14px;">QR Code will be generated and sent separately</p>
                    </div>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1976d2; margin-top: 0;">📋 Important Instructions:</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Please arrive 15 minutes before your scheduled appointment</li>
                        <li>Bring a valid ID and this confirmation email</li>
                        <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
                        <li>In case of emergency, call the clinic directly</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>Thank you for choosing Zarvo for your healthcare needs!</p>
                    <p>For any questions, please contact us at support@zarvo.com</p>
                    <p style="font-size: 12px; color: #999;">This is an automated confirmation email. Please do not reply.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send booking confirmation email
export const sendBookingConfirmation = async (booking: any) => {
  try {
    const res = await sendEmail(
      booking.customerEmail,
      `🎫 Booking Confirmation - Ticket #${booking.bookingNumber}`,
      createBookingEmailTemplate(booking)
    );
    return res;
  } catch (error) {
    console.error('❌ Error sending booking confirmation email:', error);
    return { success: false, error };
  }
};

// Send booking cancellation email
export const sendBookingCancellation = async (booking: any) => {
  try {
    const res = await sendEmail(
      booking.customerEmail,
      `❌ Booking Cancelled - Ticket #${booking.bookingNumber}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">Booking Cancelled</h2>
          <p>Dear ${booking.customerName},</p>
          <p>Your booking (Ticket #${booking.bookingNumber}) has been cancelled.</p>
          <p>If you have any questions, please contact us at support@zarvo.com</p>
          <p>Thank you for using Zarvo.</p>
        </div>
      `
    );
    return res;
  } catch (error) {
    console.error('❌ Error sending booking cancellation email:', error);
    return { success: false, error };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  try {
    const res = await sendEmail(
      to,
      'Password Reset',
      `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link valid for 1 hour.</p>`
    );
    return res;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error };
  }
};

export default {
  sendBookingConfirmation,
  sendBookingCancellation,
  notifyDoctorCancellation,
  sendPasswordResetEmail,
  sendOtpEmail,
};
