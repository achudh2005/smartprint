// ============================================================
// Auth Service – Registration, Login, Token Management
// Now with mandatory email verification via OTP
// ============================================================
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../database/client');
const logger = require('../utils/logger');
const otpService = require('./otp.service');
const { getEmailProvider } = require('./email.service');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST) || 65536,
  timeCost: parseInt(process.env.ARGON2_TIME_COST) || 3,
  parallelism: parseInt(process.env.ARGON2_PARALLELISM) || 4,
};

// ── Token Helpers ─────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'smartprint_jwt_fallback_secret_production_guard_9281749102';

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      publicId: user.publicId,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function generateRefreshToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

async function saveRefreshToken(userId, token) {
  const expiresAt = new Date();
  const days = parseInt((process.env.JWT_REFRESH_EXPIRES_IN || '30d').replace('d', ''));
  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
}

// Internal helper: issue tokens and return the standard login payload.
async function issueTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken);
  return { user, accessToken, refreshToken };
}

// ── Registration ──────────────────────────────────────────

async function register({ name, email, password }) {
  // Check for existing email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    const err = new Error('An account with this email address already exists. Please sign in.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
      emailVerified: true,
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  logger.info(`[Auth] New user registered directly: ${email} (ID: ${user.id})`);

  // Direct login & token generation — no OTP required
  return issueTokens(user);
}

// ── Verify OTP → issue tokens ──────────────────────────────

async function verifyEmailOtp({ email, otp }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  if (!user) {
    const err = new Error('Account not found. Please register first.');
    err.statusCode = 404;
    throw err;
  }

  if (user.status === 'SUSPENDED') {
    const err = new Error('Your account has been suspended. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  // Allow re-verification for already-verified accounts (idempotent — just log in)
  if (user.emailVerified) {
    logger.info(`[Auth] Email already verified for ${email}; issuing tokens.`);
    return issueTokens(user);
  }

  // Verify the OTP (throws on failure, tracks attempts)
  await otpService.verifyOtp(user, otp);

  // Mark email as verified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, lastLoginAt: new Date() },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  logger.info(`[Auth] Email verified for ${email} (ID: ${user.id})`);
  return issueTokens(updatedUser);
}

// ── Resend OTP ────────────────────────────────────────────

async function resendOtp({ email }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!user) {
    logger.warn(`[Auth] Resend OTP requested for non-existent email: ${email}`);
    return { sent: true };
  }

  if (user.emailVerified) {
    const err = new Error('This email address is already verified.');
    err.statusCode = 400;
    throw err;
  }

  await otpService.createAndSendOtp(user);
  logger.info(`[Auth] OTP resent to ${email}`);
  return { sent: true };
}

// ── Login ─────────────────────────────────────────────────

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'SUSPENDED') {
    const err = new Error('Your account has been suspended. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  if (user.status === 'INACTIVE') {
    const err = new Error('Your account is inactive. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const passwordValid = await argon2.verify(user.passwordHash, password);
  if (!passwordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }


  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { passwordHash, ...safeUser } = user;

  const accessToken = generateAccessToken(safeUser);
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken);

  logger.info(`User logged in: ${email} (ID: ${user.id})`);

  return { user: safeUser, accessToken, refreshToken };
}

// ── Refresh Token ─────────────────────────────────────────

async function refreshAccessToken(token) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, publicId: true, email: true, role: true, status: true },
      },
    },
  });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    const err = new Error('Invalid or expired refresh token.');
    err.statusCode = 401;
    throw err;
  }

  if (stored.user.status !== 'ACTIVE') {
    const err = new Error('Account is not active.');
    err.statusCode = 403;
    throw err;
  }

  const accessToken = generateAccessToken(stored.user);
  return { accessToken };
}

// ── Logout ────────────────────────────────────────────────

async function logout(token) {
  if (!token) return;
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

// ── Logout All Devices ────────────────────────────────────

async function logoutAll(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

module.exports = { register, login, verifyEmailOtp, resendOtp, refreshAccessToken, logout, logoutAll };
