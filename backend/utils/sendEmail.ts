// DEPRECATED: Do not use Nodemailer. The project now sends emails via MailerSend API in `backend/services/emailService.ts`.
// This file is kept to avoid import errors from older code but will throw if called.
export async function sendEmail(_args: { to: string; subject: string; text: string }) {
  const msg = "Deprecated sendEmail(utils): use services/emailService.ts (sendEmail/sendPasswordResetEmail/etc.). Nodemailer is disabled.";
  console.error(msg);
  throw new Error(msg);
}
