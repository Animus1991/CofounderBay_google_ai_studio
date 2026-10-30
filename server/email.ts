/**
 * Email, provider-agnostic. Nothing is ever sent without a configured provider:
 * with none, a message is written to the log as `queued` and the app says
 * "logged — not sent" (the founder can still open it in their mail app).
 *
 * EMAIL_PROVIDER=smtp with SMTP_HOST, SMTP_PORT (587), SMTP_USER,
 * SMTP_PASSWORD, SMTP_FROM and SMTP_SECURE (true for port 465) sends through
 * any SMTP server (nodemailer, loaded only when used). Another provider is one
 * object with `name` and `send()` passed to `emailService()`.
 */
export type EmailMessage = { to: string; subject: string; text: string; replyTo?: string };
export type EmailProvider = { name: string; send: (message: EmailMessage) => Promise<string | undefined> };
export type EmailStatus = { provider: string | null; configured: boolean };

/** One address, nothing that could smuggle a second header line or recipient. */
export const EMAIL_RE = /^[^@\s,;<>"\r\n]{1,64}@[^@\s,;<>"\r\n]{1,190}\.[A-Za-z]{2,24}$/;

export function smtpProvider(env: NodeJS.ProcessEnv): EmailProvider | null {
  if ((env.EMAIL_PROVIDER || '').trim().toLowerCase() !== 'smtp' || !env.SMTP_HOST || !env.SMTP_FROM) return null;
  let transport: { sendMail: (message: Record<string, unknown>) => Promise<{ messageId?: string }> } | null = null;
  return {
    name: 'smtp',
    async send(message) {
      if (!transport) {
        const nodemailer = (await import('nodemailer')).default as unknown as {
          createTransport: (options: Record<string, unknown>) => { sendMail: (message: Record<string, unknown>) => Promise<{ messageId?: string }> };
        };
        const port = parseInt(env.SMTP_PORT || '587', 10);
        transport = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port,
          secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
          // Never read local files or fetch URLs while building a message.
          disableFileAccess: true,
          disableUrlAccess: true,
        });
      }
      const info = await transport.sendMail({ from: env.SMTP_FROM, to: message.to, subject: message.subject, text: message.text, replyTo: message.replyTo });
      return info.messageId;
    },
  };
}

export function emailService(provider: EmailProvider | null) {
  return {
    status: (): EmailStatus => ({ provider: provider?.name ?? null, configured: Boolean(provider) }),
    /** Never throws: the outcome is in `status` so the caller can log it. */
    async deliver(message: EmailMessage): Promise<{ status: 'sent' | 'queued' | 'failed'; provider: string | null; messageId?: string; detail?: string }> {
      if (!provider) return { status: 'queued', provider: null, detail: 'No email provider configured — logged, not sent.' };
      try {
        const messageId = await provider.send(message);
        return { status: 'sent', provider: provider.name, messageId };
      } catch (error) {
        console.warn('email send failed:', error instanceof Error ? error.message : error);
        return { status: 'failed', provider: provider.name, detail: 'The email provider rejected the message.' };
      }
    },
  };
}
