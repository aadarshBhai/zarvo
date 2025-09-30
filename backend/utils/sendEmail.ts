// Backward compatibility shim for legacy imports.
// Prefer importing from `services/emailService.ts` directly.
import { sendEmail as serviceSendEmail } from '../services/emailService';

export async function sendEmail(args: { to: string; subject: string; text: string }) {
  const { to, subject, text } = args;
  // Treat legacy `text` as both text and html (plain wrapped) for compatibility
  const safeHtml = `<pre style="font-family:inherit; white-space:pre-wrap;">${text}</pre>`;
  return serviceSendEmail(to, subject, safeHtml, text);
}
