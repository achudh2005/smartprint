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
    await testConnection();
    logger.info('✅ Database connection established');

    const server = http.createServer(app);
    initSocket(server);
    logger.info('⚡ Real-time Socket.IO engine initialized');

    server.listen(PORT, () => {
      logger.info(`🚀 SmartPrint API running on http://localhost:${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
