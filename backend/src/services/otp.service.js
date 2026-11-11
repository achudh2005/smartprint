// ============================================================
// OTP Service – Generate, Hash, Verify one-time codes
// ============================================================
const crypto = require('crypto');
const argon2 = require('argon2');
const { prisma } = require('../database/client');
const { sendMail } = require('./email.service');
const logger = require('../utils/logger');

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PURPOSE = 'REGISTRATION';

// Pepper added to OTP before hashing so database-only leaks can't
// brute-force the 6-digit code even with the hash.
const OTP_PEPPER = process.env.OTP_PEPPER || 'smartprint_otp_pepper_please_set_in_env';

// Argon2 options (lighter than password hashing – OTPs are short-lived)
const ARGON2_OTP_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 16384,
  timeCost: 2,
  parallelism: 1,
};

/**
 * Generate a cryptographically-random 6-digit OTP string.
 */
function generateOtp() {
  // crypto.randomInt(min, max) – max is exclusive, so 0–999999
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

/**
 * Hash an OTP with pepper + argon2id before persisting.
 */
async function hashOtp(otp) {
  const peppered = `${otp}:${OTP_PEPPER}`;
  return argon2.hash(peppered, ARGON2_OTP_OPTIONS);
}

/**
 * Verify a submitted OTP against the stored hash.
 */
async function verifyOtpHash(submitted, storedHash) {
  const peppered = `${submitted}:${OTP_PEPPER}`;
  return argon2.verify(storedHash, peppered);
}

/**
 * Build the HTML email for OTP delivery.
 */
function buildOtpEmail(userName, otp) {
  const expiryMin = OTP_EXPIRY_MINUTES;
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Verify your SmartPrint account</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
      <!-- Header -->
      <tr><td style="background:#0e7490;padding:28px 36px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">SmartPrint</p>
        <p style="margin:4px 0 0;font-size:13px;color:#a5f3fc;">QR-Based Cloud Printing</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 36px 28px;">
        <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#18181b;">Verify your email address</p>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
          Hi ${userName},<br/>
          Use the code below to complete your SmartPrint account setup.
          This code expires in <strong>${expiryMin} minutes</strong>.
        </p>
        <!-- OTP Block -->
        <div style="background:#f0fdff;border:1.5px solid #a5f3fc;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#0e7490;letter-spacing:1.5px;text-transform:uppercase;">Your verification code</p>
          <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:12px;color:#09090b;font-variant-numeric:tabular-nums;">${otp}</p>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6;">
          Enter this code on the verification page. If you did not create a SmartPrint account, you can safely ignore this email.
        </p>
        <p style="margin:0;font-size:13px;color:#71717a;">
          For security: never share this code with anyone.
        </p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 36px;border-top:1px solid #f4f4f5;background:#fafafa;">
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          © ${new Date().getFullYear()} SmartPrint. This is an automated message — please do not reply.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Invalidate any previous unconsumed OTPs for this user+purpose,
 * create a new one, and send it via email.
 *
 * @param {{ id, name, email }} user
 * @param {string} [purpose='REGISTRATION']
 */
async function createAndSendOtp(user, purpose = OTP_PURPOSE) {
  // Mark all prior unconsumed OTPs as consumed (via setting attempts = maxAttempts)
  // so they can no longer be used. We don't delete them so audit trail is preserved.
  await prisma.emailOtp.updateMany({
    where: {
      userId: user.id,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { attempts: OTP_MAX_ATTEMPTS }, // locks them out without deletion
  });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailOtp.create({
    data: {
      userId: user.id,
      otpHash,
      purpose,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
    },
  });

  logger.info(`[OTP] Created OTP for user ${user.id} (purpose: ${purpose})`);

  const html = buildOtpEmail(user.name, otp);
  await sendMail({
    to: user.email,
    subject: `${otp} – Your SmartPrint verification code`,
    html,
  });

  logger.info(`[OTP] Verification email sent to ${user.email}`);
}

/**
 * Verify a submitted OTP for a user.
 * Returns { success: true } or throws an error with statusCode.
 *
 * @param {{ id, email }} user
 * @param {string}        submittedCode
 * @param {string}        [purpose='REGISTRATION']
 */
async function verifyOtp(user, submittedCode, purpose = OTP_PURPOSE) {
  const record = await prisma.emailOtp.findFirst({
    where: {
      userId: user.id,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    const err = new Error('No pending verification code found. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (record.expiresAt < new Date()) {
    const err = new Error('Your verification code has expired. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  if (record.attempts >= record.maxAttempts) {
    const err = new Error('Too many incorrect attempts. Please request a new verification code.');
    err.statusCode = 429;
    throw err;
  }

  const isValid = await verifyOtpHash(submittedCode, record.otpHash);

  if (!isValid) {
    // Increment attempts
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = record.maxAttempts - (record.attempts + 1);
    const err = new Error(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new verification code.'
    );
    err.statusCode = 400;
    throw err;
  }

  // Mark as consumed
  await prisma.emailOtp.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  logger.info(`[OTP] Verified successfully for user ${user.id} (purpose: ${purpose})`);
  return { success: true };
}

module.exports = { createAndSendOtp, verifyOtp };
