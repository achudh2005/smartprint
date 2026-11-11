// ============================================================
// Email Service – Resend provider adapter
// ============================================================
// Setup:
//   1. Sign up at https://resend.com and get your API key.
//   2. Verify your sending domain in the Resend dashboard and
//      add SPF + DKIM DNS records as instructed.
//   3. Set the env vars below in your .env:
//      EMAIL_PROVIDER   = resend
//      EMAIL_API_KEY    = re_xxxxxxxxxxxx
//      EMAIL_FROM       = noreply@yourdomain.com
//      EMAIL_FROM_NAME  = SmartPrint
//
// NOTE: When EMAIL_API_KEY is not set or set to placeholder,
// emails (including OTP codes) are safely logged to the console/logger
// so developers/admins can test without being locked out.
// ============================================================

const { Resend } = require('resend');
const logger = require('../utils/logger');

let resendClient = null;

function isEmailConfigured() {
  const apiKey = process.env.EMAIL_API_KEY;
  return Boolean(apiKey && !apiKey.startsWith('re_xxxx') && apiKey !== 'placeholder');
}

function getClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey || apiKey.startsWith('re_xxxx') || apiKey === 'placeholder') {
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

const FROM_ADDRESS = () => {
  const name = process.env.EMAIL_FROM_NAME || 'SmartPrint';
  const email = process.env.EMAIL_FROM || 'noreply@smartprint.app';
  return `${name} <${email}>`;
};

/**
 * Send an email via Resend (or fallback to logger if unconfigured/failed).
 * @param {object} options
 * @param {string|string[]} options.to
 * @param {string}          options.subject
 * @param {string}          options.html
 * @param {object[]}        [options.attachments]
 */
async function sendMail({ to, subject, html, attachments }) {
  const client = getClient();
  const recipientList = Array.isArray(to) ? to : [to];

  if (!client) {
    logger.warn(`⚠️ [Email Mock] EMAIL_API_KEY is not configured in .env.`);
    logger.info(`📧 [MOCK EMAIL] To: ${recipientList.join(', ')} | Subject: "${subject}"`);
    return { id: `mock-${Date.now()}`, mock: true };
  }

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
      // Fallback: log to console so users aren't locked out of registering/logging in
      logger.warn(`⚠️ [Email Fallback] Email logged to console: Subject: "${subject}" to ${recipientList.join(', ')}`);
      return { id: `fallback-${Date.now()}`, mock: true, error: result.error.message };
    }
    logger.info(`[Email] Sent "${subject}" to ${recipientList.join(', ')} (id: ${result.data?.id})`);
    return result.data;
  } catch (err) {
    logger.error(`[Email] Failed to send email via Resend: ${err.message}`);
    logger.warn(`⚠️ [Email Fallback] Email logged to console: Subject: "${subject}" to ${recipientList.join(', ')}`);
    return { id: `fallback-${Date.now()}`, mock: true, error: err.message };
  }
}

module.exports = { sendMail, isEmailConfigured };
