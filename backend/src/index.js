// ============================================================
// SmartPrint Backend – Entry Point
// ============================================================
require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { testConnection } = require('./database/client');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const server = http.createServer(app);
    initSocket(server);
    logger.info('⚡ Real-time Socket.IO engine initialized');

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
