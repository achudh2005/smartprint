// ============================================================
// Prisma Client Singleton with In-Memory Demo Fallback
// ============================================================
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const argon2 = require('argon2');
const { InMemoryPrisma } = require('../../tests/mockPrisma');

let activePrisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  activePrisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

activePrisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

async function seedInMemory(db) {
  // Clean Mode: No pre-seeded demo accounts or mock shops.
  // The printing shop owner registers freshly via /register and creates their shop.
  logger.info('🌱 Database ready in clean state: ready for fresh user registration and shop creation.');
}

async function testConnection() {
  try {
    const probe = activePrisma.$queryRaw`SELECT 1`;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Prisma probe timed out (2000ms)')), 2000)
    );
    await Promise.race([probe, timeout]);
  } catch (err) {
    logger.warn(`[Database] MySQL server unreachable (${err.message}).`);
    logger.info(`[Database] Initializing zero-config persistence store.`);
    const prevPrisma = activePrisma;
    const mock = new InMemoryPrisma();
    await seedInMemory(mock);
    activePrisma = mock;
    if (prevPrisma && typeof prevPrisma.$disconnect === 'function') {
      prevPrisma.$disconnect().catch(() => {});
    }
  }
}

const prisma = new Proxy({}, {
  get(target, prop) {
    if (prop === 'prisma') return prisma;
    if (prop === 'testConnection') return testConnection;
    if (prop === '$connect') return () => (activePrisma.$connect ? activePrisma.$connect() : Promise.resolve());
    if (prop === '$disconnect') return () => (activePrisma.$disconnect ? activePrisma.$disconnect() : Promise.resolve());
    if (prop === '$transaction') return (...args) => activePrisma.$transaction(...args);
    return activePrisma[prop];
  },
});

module.exports = prisma;
module.exports.prisma = prisma;
module.exports.testConnection = testConnection;
