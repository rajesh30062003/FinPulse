import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SmtpDiagnosticStatus {
  configured: boolean;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  userMasked: string;
  from: string;
  fromName: string;
  verified: boolean;
  errorCode?: string;
  message: string;
  timestamp: string;
}

export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}******${local[local.length - 1]}@${domain}`;
}

export class EmailService {
  private static cachedTransporter: Transporter | null = null;

  /**
   * Builds or returns cached Nodemailer transporter configured for Brevo SMTP.
   * Uses port 2525 to bypass Render Free outbound port 25/465/587 blocking.
   */
  public static getTransporter(): Transporter | null {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!user || !pass) {
      return null;
    }

    if (this.cachedTransporter) {
      return this.cachedTransporter;
    }

    const rawHost = process.env.SMTP_HOST?.trim();
    const host = (!rawHost || rawHost.includes('gmail')) ? 'smtp-relay.brevo.com' : rawHost;
    const rawPort = parseInt(process.env.SMTP_PORT?.trim() || '2525', 10);
    const port = (isNaN(rawPort) || rawPort === 587 || rawPort === 465 || rawPort === 25) ? 2525 : rawPort;

    // Brevo on port 2525 uses STARTTLS with secure: false and requireTLS: true
    this.cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      requireTLS: true,
      auth: {
        user,
        pass
      },
      connectionTimeout: 15000, // 15 seconds timeout
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    return this.cachedTransporter;
  }

  /**
   * Resets cached transporter (useful if environment credentials are dynamically modified)
   */
  public static resetTransporter(): void {
    this.cachedTransporter = null;
  }

  /**
   * Diagnostic verification of Brevo SMTP connection.
   * Safe to call on startup or via admin diagnostics; never exposes SMTP key/passwords.
   */
  public static async verifyConnection(): Promise<SmtpDiagnosticStatus> {
    const rawHost = process.env.SMTP_HOST?.trim();
    const host = (!rawHost || rawHost.includes('gmail')) ? 'smtp-relay.brevo.com' : rawHost;
    const rawPort = parseInt(process.env.SMTP_PORT?.trim() || '2525', 10);
    const port = (isNaN(rawPort) || rawPort === 587 || rawPort === 465 || rawPort === 25) ? 2525 : rawPort;
    const user = process.env.SMTP_USER?.trim() || '';
    const fromName = process.env.EMAIL_FROM_NAME?.trim() || 'FinPulse';
    const from = process.env.EMAIL_FROM?.trim() || (user ? `${fromName} <${user}>` : `${fromName} <alerts@finpulse.example>`);

    if (!user || !process.env.SMTP_PASS?.trim()) {
      return {
        configured: false,
        provider: 'Brevo SMTP',
        host,
        port,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: false,
        errorCode: 'MISSING_CREDENTIALS',
        message: 'Brevo SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS (Brevo SMTP key) in environment variables.',
        timestamp: new Date().toISOString()
      };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      return {
        configured: false,
        provider: 'Brevo SMTP',
        host,
        port,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: false,
        errorCode: 'INIT_ERROR',
        message: 'Failed to initialize Nodemailer Brevo transporter',
        timestamp: new Date().toISOString()
      };
    }

    try {
      await transporter.verify();
      console.log(`[Brevo SMTP Diagnostics] Connection successfully verified with ${host}:${port} as ${maskEmail(user)}`);
      return {
        configured: true,
        provider: 'Brevo SMTP',
        host,
        port,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: true,
        message: `Brevo SMTP connection established and verified on ${host}:${port}`,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      const code = err?.code || 'UNKNOWN_SMTP_ERROR';
      const cleanMessage = EmailService.formatSmtpErrorMessage(err, host, port);
      console.log(`[Brevo SMTP Diagnostics] Verification status on ${host}:${port} (${code}): ${cleanMessage}`);

      return {
        configured: true,
        provider: 'Brevo SMTP',
        host,
        port,
        secure: false,
        requireTLS: true,
        userMasked: maskEmail(user),
        from,
        fromName,
        verified: false,
        errorCode: code,
        message: cleanMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Helper to format readable SMTP network and auth errors
   */
  private static formatSmtpErrorMessage(err: any, host: string, port: number): string {
    const code = err?.code || '';
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
      return `Connection timed out to ${host}:${port}. If running on Render Free, verify outbound traffic on port ${port} is reachable.`;
    }
    if (code === 'ECONNREFUSED') {
      return `Connection refused by ${host}:${port}. Ensure host and port are correct.`;
    }
    if (code === 'EAUTH' || err?.responseCode === 535) {
      return 'Brevo SMTP authentication failed (535). Please verify SMTP_USER (login) and SMTP_PASS (master SMTP key).';
    }
    if (err?.responseCode === 550 || err?.responseCode === 554) {
      return `Sender address rejected (${err?.responseCode}). Ensure EMAIL_FROM is an authorized sender in your Brevo account.`;
    }
    return err?.message || 'SMTP transmission failure';
  }

  /**
   * Core mail dispatcher. Throws explicit error if SMTP fails or credentials missing.
   * Zero simulation or fake fallback.
   */
  public static async sendMail(payload: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ messageId: string }> {
    const transporter = this.getTransporter();
    const maskedRecipient = maskEmail(payload.to);
    const host = process.env.SMTP_HOST?.trim() || 'smtp-relay.brevo.com';
    const port = parseInt(process.env.SMTP_PORT?.trim() || '2525', 10);

    if (!transporter) {
      console.log(`[Brevo SMTP Note] Delivery attempted to ${maskedRecipient} but SMTP_USER or SMTP_PASS is missing.`);
      throw new Error("We couldn't send your verification email. Brevo SMTP credentials (SMTP_USER/SMTP_PASS) are not configured.");
    }

    const user = process.env.SMTP_USER?.trim() || '';
    const fromName = process.env.EMAIL_FROM_NAME?.trim() || 'FinPulse';
    const fromAddress = process.env.EMAIL_FROM?.trim() || user;
    const from = `${fromName} <${fromAddress}>`;

    try {
      const info = await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      });

      console.log(`[Brevo SMTP Success] Email accepted for delivery to ${maskedRecipient} (Message ID: ${info.messageId})`);
      return { messageId: info.messageId };
    } catch (err: any) {
      const formatted = EmailService.formatSmtpErrorMessage(err, host, port);
      console.log(`[Brevo SMTP Note] Delivery attempted to ${maskedRecipient} [${err?.code || 'ERR'}]: ${formatted}`);
      // Throw exact descriptive error so API and user receive true diagnostic state
      throw new Error(`Email delivery failed: ${formatted}`);
    }
  }

  /**
   * Diagnostic test function to test actual email sending to a specified recipient.
   */
  public static async sendTestEmail(targetEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await this.sendMail({
        to: targetEmail,
        subject: 'FinPulse – Brevo SMTP Diagnostic Test',
        text: `This is a diagnostic test email dispatched from FinPulse via Brevo SMTP (smtp-relay.brevo.com:2525) at ${new Date().toISOString()}.\n\nIf you received this message, your Brevo SMTP connection is fully operational!`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #38bdf8; margin-top: 0;">FinPulse Brevo SMTP Operational</h2>
            <p style="color: #cbd5e1; font-size: 14px;">This is a diagnostic test message dispatched via Brevo SMTP relay on port 2525.</p>
            <div style="background: #1e293b; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #10b981;">
              Status: 250 OK (SMTP Handshake & TLS Accepted)
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `
      });
      return { success: true, messageId: res.messageId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends the official FinPulse 6-digit verification code.
   * Subject: "FinPulse – Your Email Verification Code"
   */
  public static async sendVerificationEmail(user: { email: string; name: string; otp: string }) {
    const subject = 'FinPulse – Your Email Verification Code';
    const textBody = `Hello ${user.name},\n\nYour FinPulse email verification code is: ${user.otp}\n\nThis verification code expires in 5 minutes.\n\nSecurity Notice: For your security, never share this one-time code with anyone. FinPulse representatives will never ask for your verification code.\n\nIf you did not request this verification code, please disregard this email. No account will be created or activated without entering this code.\n\nBest regards,\nThe FinPulse Security Team`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #1e293b;">
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 40px; text-align: center; border-bottom: 2px solid #2563eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #2563eb; color: #ffffff; font-weight: 900; font-size: 20px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                      FP
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">FinPulse</h1>
                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Cryptographic Financial Ledger</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Hello <strong>${escapeHtml(user.name)}</strong>,
              </p>
              <p style="margin: 0 0 28px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for choosing FinPulse to manage your financial portfolio. To secure your personal ledger and complete your registration, enter the six-digit verification code below:
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      Verification Code
                    </div>
                    <div style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #0f172a; padding: 4px 0;">
                      ${user.otp}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #dc2626; margin-top: 8px;">
                      ⏱ Expires in 5 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.5;">
                  <strong>Security Warning:</strong> FinPulse representatives will never ask you for this code. Do not share it with anyone.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not initiate this registration, please ignore this email. No financial data has been created and your email address remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} FinPulse Financial Management Engine. All rights reserved.
              </p>
              <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 11px;">
                Secured via Brevo SMTP Relay (Port 2525).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }

  /**
   * Sends password recovery authorization code.
   */
  public static async sendPasswordResetEmail(user: { email: string; name: string; otp: string }) {
    const subject = 'FinPulse – Your Password Reset Code';
    const textBody = `Hello ${user.name},\n\nWe received a request to reset your FinPulse password.\n\nYour 6-digit recovery code is: ${user.otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request a password reset, please ignore this email and verify your account security.\n\nBest regards,\nThe FinPulse Security Team`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: #0f172a; padding: 32px 40px; text-align: center; border-bottom: 2px solid #ef4444;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">FinPulse Security Recovery</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Password Recovery Authorization</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>${escapeHtml(user.name)}</strong>,<br>
                We received an authorized request to reset the password for your FinPulse account. Use the code below:
              </p>
              <div style="background: #fef2f2; border: 2px dashed #f87171; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #991b1b;">
                  ${user.otp}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 8px;">
                  ⏱ Code expires in 5 minutes
                </div>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not request this, please ensure your account credentials remain private.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }

  /**
   * Credit card scheduled bill reminder
   */
  public static async sendCreditCardBillReminder(user: { email: string; name: string }, card: {
    cardName: string;
    lastFourDigits: string;
    outstandingPaise: number;
    dueDay: number;
  }) {
    const formattedAmount = (card.outstandingPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    const subject = `FinPulse Bill Reminder: ${formattedAmount} due for ${card.cardName}`;
    const textBody = `Hello ${user.name},\n\nYour bill for ${card.cardName} (•••• ${card.lastFourDigits}) is pending settlement.\n\nCurrent Outstanding: ${formattedAmount}\nPayment Due Date: ${card.dueDay}th of month\n\nBest regards,\nFinPulse`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Credit Card Payment Reminder</h2>
        <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
        <p>Your upcoming bill for <strong>${escapeHtml(card.cardName)} (•••• ${card.lastFourDigits})</strong> is pending settlement.</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Outstanding Balance:</strong> <span style="color: #dc2626; font-size: 18px; font-weight: 700;">${formattedAmount}</span></p>
          <p style="margin: 0;"><strong>Payment Due Date:</strong> ${card.dueDay}th of the month</p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }

  /**
   * Fixed deposit scheduled maturity reminder
   */
  public static async sendFDMaturityAlert(user: { email: string; name: string }, fd: {
    fdName: string;
    bankName: string;
    principalPaise: number;
    maturityAmountPaise: number;
    maturityDate: string;
    daysRemaining: number;
  }) {
    const formattedMaturity = (fd.maturityAmountPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    const subject = `FinPulse Alert: Fixed Deposit ${fd.fdName} Matures Soon`;
    const textBody = `Hello ${user.name},\n\nYour Fixed Deposit "${fd.fdName}" with ${fd.bankName} is maturing on ${new Date(fd.maturityDate).toLocaleDateString()}.\n\nMaturity Value: ${formattedMaturity}\nDays Remaining: ${fd.daysRemaining}\n\nBest regards,\nFinPulse`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Fixed Deposit Maturity Approaching</h2>
        <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
        <p>Your Fixed Deposit <strong>${escapeHtml(fd.fdName)}</strong> with ${escapeHtml(fd.bankName)} reaches maturity on <strong>${new Date(fd.maturityDate).toLocaleDateString()}</strong> (${fd.daysRemaining} days remaining).</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Maturity Payout Value:</strong> <span style="color: #16a34a; font-size: 18px; font-weight: 700;">${formattedMaturity}</span></p>
        </div>
      </div>
    `;

    return this.sendMail({
      to: user.email,
      subject,
      text: textBody,
      html: htmlBody
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
