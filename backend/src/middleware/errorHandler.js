// ============================================================
// Global Error Handler
// ============================================================
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, url: req.url, method: req.method });

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An internal server error occurred.'
    : err.message || 'An internal server error occurred.';

  res.status(statusCode).json({ success: false, message });
};

module.exports = { errorHandler };
