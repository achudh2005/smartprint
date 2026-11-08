// ============================================================
// Winston Logger
// ============================================================
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, stack }) =>
          stack
            ? `${timestamp} [${level}]: ${message}\n${stack}`
            : `${timestamp} [${level}]: ${message}`
        )
      ),
    }),
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: format.json(),
    }),
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: format.json(),
    }),
  ],
});

module.exports = logger;
