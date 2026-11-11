// ============================================================
// SmartPrint Backend – Entry Point
// ============================================================
require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { testConnection } = require('./database/client');
const { initSocket } = require('./socket');
const { validateMasterKey } = require('./services/encryption.service');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Validate envelope encryption master key presence and 256-bit length
    validateMasterKey();
    logger.info('🔐 AES-256-GCM Envelope Encryption initialized');
    const server = http.createServer(app);
    initSocket(server);
    logger.info('⚡ Real-time Socket.IO engine initialized');

    // Initialize scheduled queues (finance reports, file expiry)
    require('./queues/report.queue');
    logger.info('📊 Finance reports scheduled queue initialized');

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 SmartPrint API running on http://0.0.0.0:${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    await testConnection();
    logger.info('✅ Database connection established');
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
