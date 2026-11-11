// ============================================================
// Email Service – Gmail / SMTP / Resend provider adapter
// ============================================================
// Configuration:
//   Option A: Gmail / SMTP (Recommended for direct Gmail delivery)
//     GMAIL_USER          = your_address@gmail.com
//     GMAIL_APP_PASSWORD  = xxxx xxxx xxxx xxxx (Google App Password)
//     (or SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
//
//   Option B: Resend
//     EMAIL_PROVIDER      = resend
//     EMAIL_API_KEY       = re_xxxxxxxxxxxx
//     EMAIL_FROM          = noreply@yourverifieddomain.com
// ============================================================

const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const logger = require('../utils/logger');

let resendClient = null;
let smtpTransporter = null;

function getEmailProvider() {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  if (gmailUser && gmailPass) {
    return 'smtp';
  }

  const resendKey = process.env.EMAIL_API_KEY;
  if (resendKey && !resendKey.startsWith('re_xxxx') && resendKey !== 'placeholder') {
    return 'resend';
  }

  return 'none';
}

function getTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || (host.includes('gmail.com') ? 465 : 587);
  const secure = port === 465;
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return smtpTransporter;
}

function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.EMAIL_API_KEY;
  resendClient = new Resend(apiKey);
  return resendClient;
}

const FROM_ADDRESS = () => {
  const name = process.env.EMAIL_FROM_NAME || 'SmartPrint';
  const email = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_FROM || 'noreply@smartprint.app';
  return `"${name}" <${email}>`;
};

/**
 * Send an email via configured provider (Gmail/SMTP or Resend).
 */
async function sendMail({ to, subject, html, attachments }) {
  const provider = getEmailProvider();
  const recipientList = Array.isArray(to) ? to : [to];

  if (provider === 'smtp') {
    const transporter = getTransporter();
    const mailOptions = {
      from: FROM_ADDRESS(),
      to: recipientList.join(', '),
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || a.content_type || 'application/octet-stream',
      }));
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`[Email] Sent email via Gmail/SMTP to ${recipientList.join(', ')} (messageId: ${info.messageId})`);
      return info;
    } catch (err) {
      logger.error(`[Email] Gmail/SMTP delivery failed to ${recipientList.join(', ')}: ${err.message}`);
      throw new Error(`Failed to deliver email to Gmail: ${err.message}`);
    }
  }

  if (provider === 'resend') {
    const client = getResendClient();
    const payload = {
      from: FROM_ADDRESS(),
      to: recipientList,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        content_type: a.contentType || 'application/octet-stream',
      }));
    }

    try {
      const result = await client.emails.send(payload);
      if (result.error) {
        logger.error(`[Email] Resend API error: ${result.error.message || JSON.stringify(result.error)}`);
        throw new Error(`Failed to send email via Resend: ${result.error.message}`);
      }
      logger.info(`[Email] Sent email via Resend to ${recipientList.join(', ')} (id: ${result.data?.id})`);
      return result.data;
    } catch (err) {
      logger.error(`[Email] Failed to send email via Resend: ${err.message}`);
      throw err;
    }
  }

  // If no email provider configured
  const errorMsg = 'Email service is not configured. Please set GMAIL_USER & GMAIL_APP_PASSWORD in backend .env to send real verification emails to Gmail.';
  logger.error(`[Email] ${errorMsg}`);
  const err = new Error(errorMsg);
  err.code = 'EMAIL_NOT_CONFIGURED';
  err.statusCode = 503;
  throw err;
}

module.exports = { sendMail, getEmailProvider };
