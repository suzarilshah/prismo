/**
 * Email Service Module
 * 
 * This module provides a unified interface for sending emails.
 * You can easily swap out the email provider by implementing the EmailProvider interface.
 * 
 * Supported providers (implement as needed):
 * - Resend (recommended for Next.js)
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Postmark
 * - Nodemailer (for SMTP)
 * 
 * To integrate an email service:
 * 1. Install the provider SDK: npm install resend / npm install @sendgrid/mail
 * 2. Add your API key to .env: RESEND_API_KEY=xxx or SENDGRID_API_KEY=xxx
 * 3. Uncomment the provider implementation below
 * 4. Update the getEmailProvider() function to return your provider
 */

// Types
export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<EmailResult>;
  sendBatch(payloads: EmailPayload[]): Promise<EmailResult[]>;
}

// Default email configuration
const DEFAULT_FROM = process.env.EMAIL_FROM || "Prismo Finance <noreply@prismofinance.com>";

// ============================================
// CONSOLE PROVIDER (Development)
// Logs emails to console instead of sending
// ============================================
class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<EmailResult> {
    console.log("📧 [Email - Dev Mode]", {
      to: payload.to,
      subject: payload.subject,
      from: payload.from || DEFAULT_FROM,
    });
    console.log("📧 [Email Body]", payload.html.substring(0, 500) + "...");
    
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  async sendBatch(payloads: EmailPayload[]): Promise<EmailResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}

// ============================================
// RESEND PROVIDER (Uncomment to use)
// Install: npm install resend
// ============================================
/*
import { Resend } from "resend";

class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    this.client = new Resend(apiKey);
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: payload.from || DEFAULT_FROM,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send email" 
      };
    }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<EmailResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}
*/

// ============================================
// SENDGRID PROVIDER (Uncomment to use)
// Install: npm install @sendgrid/mail
// ============================================
/*
import sgMail from "@sendgrid/mail";

class SendGridEmailProvider implements EmailProvider {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");
    sgMail.setApiKey(apiKey);
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const [response] = await sgMail.send({
        from: payload.from || DEFAULT_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
      });

      return { 
        success: true, 
        messageId: response.headers["x-message-id"] 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send email" 
      };
    }
  }

  async sendBatch(payloads: EmailPayload[]): Promise<EmailResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}
*/

// ============================================
// PROVIDER FACTORY
// Update this function to use your preferred provider
// ============================================
function getEmailProvider(): EmailProvider {
  // Check for configured providers
  if (process.env.RESEND_API_KEY) {
    // return new ResendEmailProvider();
    console.log("⚠️ Resend API key found but provider not implemented. Using console logger.");
  }
  
  if (process.env.SENDGRID_API_KEY) {
    // return new SendGridEmailProvider();
    console.log("⚠️ SendGrid API key found but provider not implemented. Using console logger.");
  }

  // Default to console logging in development
  return new ConsoleEmailProvider();
}

// Singleton instance
let emailProvider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider = getEmailProvider();
  }
  return emailProvider;
}

// ============================================
// PUBLIC API
// ============================================

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const provider = getProvider();
  return provider.send({
    ...payload,
    from: payload.from || DEFAULT_FROM,
  });
}

export async function sendEmailBatch(payloads: EmailPayload[]): Promise<EmailResult[]> {
  const provider = getProvider();
  return provider.sendBatch(payloads.map(p => ({
    ...p,
    from: p.from || DEFAULT_FROM,
  })));
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export const emailTemplates = {
  financeGroupInvite: (params: {
    inviteeName?: string;
    inviterName: string;
    groupName: string;
    role: string;
    inviteLink: string;
    message?: string;
    expiresAt: Date;
  }) => ({
    subject: `${params.inviterName} invited you to join "${params.groupName}" on Prismo`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finance Group Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030303;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030303; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #222;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: 900; font-size: 18px;">P</span>
                </div>
                <span style="color: white; font-weight: 700; font-size: 24px;">Prismo</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: white; font-size: 24px; margin: 0 0 16px; font-weight: 600;">
                You've been invited!
              </h1>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${params.inviteeName ? `Hi ${params.inviteeName},<br><br>` : ""}
                <strong style="color: white;">${params.inviterName}</strong> has invited you to collaborate on their finance group <strong style="color: white;">"${params.groupName}"</strong> as a <strong style="color: #8b5cf6;">${params.role}</strong>.
              </p>
              
              ${params.message ? `
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 20px; margin: 0 0 24px; border-left: 3px solid #8b5cf6;">
                <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Message from ${params.inviterName}</p>
                <p style="color: white; font-size: 15px; margin: 0; line-height: 1.5;">"${params.message}"</p>
              </div>
              ` : ""}
              
              <a href="${params.inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 16px; margin: 0 0 24px;">
                Accept Invitation
              </a>
              
              <p style="color: #71717a; font-size: 14px; margin: 24px 0 0;">
                This invitation will expire on ${params.expiresAt.toLocaleDateString("en-MY", { dateStyle: "long" })}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #222; background-color: #0a0a0a;">
              <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.<br>
                © ${new Date().getFullYear()} Prismo Finance. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
${params.inviteeName ? `Hi ${params.inviteeName},\n\n` : ""}${params.inviterName} has invited you to collaborate on their finance group "${params.groupName}" as a ${params.role}.

${params.message ? `Message from ${params.inviterName}: "${params.message}"\n\n` : ""}
Accept the invitation: ${params.inviteLink}

This invitation expires on ${params.expiresAt.toLocaleDateString("en-MY", { dateStyle: "long" })}.

If you didn't expect this invitation, you can safely ignore this email.
    `,
  }),

  welcomeEmail: (params: {
    userName: string;
  }) => ({
    subject: "Welcome to Prismo Finance! 🎉",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Prismo</title>
</head>
<body style="margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030303;">
  <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #111; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
    <tr>
      <td style="padding: 40px; text-align: center;">
        <h1 style="color: white; font-size: 28px; margin: 0 0 16px;">Welcome, ${params.userName}! 🎉</h1>
        <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
          You're now part of the Prismo Finance community. Start managing your finances smarter today.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Welcome to Prismo Finance, ${params.userName}! You're now part of our community. Start managing your finances smarter today.`,
  }),
};
