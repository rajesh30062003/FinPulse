import nodemailer from 'nodemailer';
import { getDb, saveDatabase } from '../db.js';
import { IEmailLog } from '../types.js';

export class EmailService {
  private static getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    }
    return null;
  }

  static async sendMail(payload: {
    userId?: string;
    to: string;
    subject: string;
    previewText: string;
    htmlBody: string;
    triggerType: 'verification' | 'password_reset' | 'cc_bill_reminder' | 'fd_maturity_reminder' | 'monthly_summary';
    metadata?: Record<string, any>;
  }): Promise<IEmailLog> {
    const db = getDb();
    let status: 'sent' | 'simulated' = 'simulated';

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'FinPulse Security <alerts@finpulse.example>',
          to: payload.to,
          subject: payload.subject,
          html: payload.htmlBody
        });
        status = 'sent';
      } catch (err) {
        console.warn('Real SMTP delivery failed, recording email to sandbox mailbox:', err);
      }
    }

    const emailLog: IEmailLog = {
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: payload.userId,
      to: payload.to,
      subject: payload.subject,
      previewText: payload.previewText,
      htmlBody: payload.htmlBody,
      sentAt: new Date().toISOString(),
      status,
      triggerType: payload.triggerType,
      metadata: payload.metadata
    };

    db.emailLogs.unshift(emailLog);
    // Keep max 100 recent emails in sandbox
    if (db.emailLogs.length > 100) {
      db.emailLogs = db.emailLogs.slice(0, 100);
    }
    saveDatabase();

    return emailLog;
  }

  static async sendVerificationEmail(user: { id: string; email: string; name: string; token: string; otp: string }) {
    const verifyUrl = `/verify-email?token=${encodeURIComponent(user.token)}&email=${encodeURIComponent(user.email)}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 28px 32px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">FinPulse Security</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">Email Address Verification</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #334155; margin-top: 0;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            Thank you for creating your FinPulse Smart Money Management account. To secure your financial ledger and enable automated recovery, please verify your email address.
          </p>
          
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 1px;">Your Verification Code</div>
            <div style="font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 8px; margin-top: 8px; font-family: monospace;">${user.otp}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">Valid for 30 minutes</div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">
              Verify Email Address Instantly
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 0;">
            If you did not request this verification, please disregard this email. Your data remains protected with AES and JWT ledger encryption.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      userId: user.id,
      to: user.email,
      subject: 'Verify Your FinPulse Account - Code: ' + user.otp,
      previewText: `Your verification code is ${user.otp}. Complete verification to secure your financial portal.`,
      htmlBody,
      triggerType: 'verification',
      metadata: { otp: user.otp, token: user.token, actionUrl: verifyUrl }
    });
  }

  static async sendPasswordResetEmail(user: { id: string; email: string; name: string; token: string; otp: string }) {
    const resetUrl = `/reset-password?token=${encodeURIComponent(user.token)}&email=${encodeURIComponent(user.email)}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 28px 32px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">FinPulse Recovery</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #f87171;">Secure Password Reset Request</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #334155; margin-top: 0;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            We received an automated request to reset the password for your personal finance account. Use the one-time code below or click the button to set a new password.
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #ef4444; font-weight: 600; letter-spacing: 1px;">Reset Authorization Code</div>
            <div style="font-size: 36px; font-weight: 800; color: #991b1b; letter-spacing: 8px; margin-top: 8px; font-family: monospace;">${user.otp}</div>
            <div style="font-size: 12px; color: #b91c1c; margin-top: 6px;">Expires in 15 minutes</div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">
              Reset Password Now
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 0;">
            If you did not request a password recovery, please log in immediately and review your security preferences.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      userId: user.id,
      to: user.email,
      subject: 'FinPulse Password Reset Code: ' + user.otp,
      previewText: `Password reset request received. Use code ${user.otp} to update credentials.`,
      htmlBody,
      triggerType: 'password_reset',
      metadata: { otp: user.otp, token: user.token, actionUrl: resetUrl }
    });
  }

  static async sendCreditCardBillReminder(user: { id: string; email: string; name: string }, card: {
    cardName: string;
    lastFourDigits: string;
    outstandingPaise: number;
    dueDay: number;
    currency?: string;
  }) {
    const formattedAmount = (card.outstandingPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px 32px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Credit Card Payment Reminder</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #f59e0b;">Scheduled 25th Monthly Alert</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #334155;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            Your upcoming bill for <strong>${card.cardName} (•••• ${card.lastFourDigits})</strong> is pending settlement.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Current Outstanding:</td>
              <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 700; color: #dc2626; text-align: right;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; font-size: 13px; color: #64748b;">Payment Due Date:</td>
              <td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${card.dueDay}th of month</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #64748b;">
            Remember: Paying your credit card bill through FinPulse settles your card balance without counting as a duplicate monthly expense.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      userId: user.id,
      to: user.email,
      subject: `Bill Reminder: ${formattedAmount} due for ${card.cardName}`,
      previewText: `Reminder: ${formattedAmount} outstanding on ${card.cardName} due by the ${card.dueDay}th.`,
      htmlBody,
      triggerType: 'cc_bill_reminder'
    });
  }

  static async sendFDMaturityAlert(user: { id: string; email: string; name: string }, fd: {
    fdName: string;
    bankName: string;
    principalPaise: number;
    maturityAmountPaise: number;
    maturityDate: string;
    daysRemaining: number;
  }) {
    const formattedPrincipal = (fd.principalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    const formattedMaturity = (fd.maturityAmountPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px 32px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Fixed Deposit Maturity Approaching</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #3b82f6;">${fd.daysRemaining} Days Until Maturity</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #334155;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            Your Fixed Deposit <strong>${fd.fdName}</strong> with ${fd.bankName} is maturing on <strong>${new Date(fd.maturityDate).toLocaleDateString()}</strong>.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Principal Invested:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; text-align: right;">${formattedPrincipal}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">Maturity Payout Value:</td>
              <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #16a34a; text-align: right;">${formattedMaturity}</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #64748b;">
            Review whether you wish to reinvest upon maturity or transfer funds into your savings or liquid investment portfolio.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({
      userId: user.id,
      to: user.email,
      subject: `FD Maturity Alert: ${fd.fdName} (${formattedMaturity}) matures soon`,
      previewText: `Your FD of ${formattedPrincipal} reaches maturity on ${new Date(fd.maturityDate).toLocaleDateString()}.`,
      htmlBody,
      triggerType: 'fd_maturity_reminder'
    });
  }
}
