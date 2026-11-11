// ============================================================
// Email Service – Resend provider adapter
// ============================================================
// Setup:
//   1. Sign up at https://resend.com and get your API key.
//   2. Verify your sending domain in the Resend dashboard and
//      add SPF + DKIM DNS records as instructed (required for
//      reliable delivery; Resend will show you the exact records).
//   3. Set the env vars below in your .env / production secrets.
//
// ENV VARS:
//   EMAIL_PROVIDER   = resend            (only "resend" supported)
//   EMAIL_API_KEY    = re_xxxxxxxxxxxx   (Resend API key)
//   EMAIL_FROM       = noreply@yourdomain.com
//   EMAIL_FROM_NAME  = SmartPrint
// ============================================================

const { Resend } = require('resend');
const logger = require('../utils/logger');

let resendClient = null;

function getClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    const err = new Error(
      '[Email] EMAIL_API_KEY is not set. Set it in .env to enable email sending.'
    );
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
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
 * Send an email via Resend.
 * @param {object} options
 * @param {string|string[]} options.to   Recipient(s)
 * @param {string}          options.subject
 * @param {string}          options.html  HTML body
 * @param {object[]}        [options.attachments]  Resend attachment objects
 *                           Each: { filename, content (Buffer|base64), contentType }
 */
async function sendMail({ to, subject, html, attachments }) {
  const client = getClient();

  const payload = {
    from: FROM_ADDRESS(),
    to: Array.isArray(to) ? to : [to],
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
      const err = new Error(`[Email] Resend API error: ${result.error.message || JSON.stringify(result.error)}`);
      err.code = 'EMAIL_SEND_FAILED';
      logger.error(err.message);
      throw err;
    }
    logger.info(`[Email] Sent "${subject}" to ${Array.isArray(to) ? to.join(', ') : to} (id: ${result.data?.id})`);
    return result.data;
  } catch (err) {
    if (err.code === 'EMAIL_SEND_FAILED') throw err;
    const wrapped = new Error(`[Email] Failed to send email: ${err.message}`);
    wrapped.code = 'EMAIL_SEND_FAILED';
    wrapped.original = err;
    logger.error(wrapped.message, err);
    throw wrapped;
  }
}

module.exports = { sendMail };
