import nodemailer from "nodemailer";
import { createTransporter } from "../services/emailService";

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (e) {
    console.error("sendEmail failed:", {
      error: e,
      usingHost: Boolean(process.env.SMTP_HOST),
      service: process.env.EMAIL_SERVICE || 'gmail',
    });
    throw e;
  }
}
