// ============================================================
// SmartPrint Backend – Express App
// ============================================================
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Routes
const authRoutes = require('./routes/auth.routes');
const shopRoutes = require('./routes/shop.routes');
const profileRoutes = require('./routes/profile.routes');
const customerRoutes = require('./routes/customer.routes');
const paymentRoutes = require('./routes/payment.routes');
const agentRoutes = require('./routes/agent.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Helper to determine if IP is local/private LAN
const isLocalOrLanIp = (ip = '') => {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.includes('127.0.0.1') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.3') ||
    ip.startsWith('::ffff:127.0.0.1') ||
    ip.startsWith('::ffff:192.168.') ||
    ip.startsWith('::ffff:10.')
  );
};

// ── Global rate limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || isLocalOrLanIp(req.ip),
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', globalLimiter);

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP Logging ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SmartPrint API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/shops',    shopRoutes);
app.use('/api/v1/profile',  profileRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/agent',    agentRoutes);
app.use('/api/v1/admin',    adminRoutes);

// ── 404 / Error Handlers ─────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
