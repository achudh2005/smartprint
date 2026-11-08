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
  try {
    const passwordHash = await argon2.hash('Password123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const existingUsers = await db.user.findMany();
    const existingEmails = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));

    // 1. Super Admin
    if (!existingEmails.has('superadmin@smartprint.io')) {
      await db.user.create({
        data: {
          id: 1,
          name: 'Platform Super Admin',
          email: 'superadmin@smartprint.io',
          passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          isActive: true,
        },
      });
    }

    // 2. Demo Shop Owner
    let owner = existingUsers.find(u => (u.email || '').toLowerCase() === 'demo@smartprint.com');
    if (!owner) {
      owner = await db.user.create({
        data: {
          id: 2,
          name: 'Demo Owner',
          email: 'demo@smartprint.com',
          passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
          isActive: true,
        },
      });
    }

    // 3. User Achudh permanent profiles
    const permanentAccounts = [
      { name: 'Achudh', email: 'achudhshaji@gmail.com' },
      { name: 'Achudh', email: 'achudhshaji2028@mca.ajce.in' },
    ];
    for (const acc of permanentAccounts) {
      if (!existingEmails.has(acc.email.toLowerCase())) {
        await db.user.create({
          data: {
            name: acc.name,
            email: acc.email,
            passwordHash,
            role: 'OWNER',
            status: 'ACTIVE',
            isActive: true,
          },
        });
        logger.info(`💾 Permanent user account established: ${acc.email}`);
      }
    }

    // 4. Demo Shop & Configuration (only if no shops exist)
    const existingShops = await db.shop.findMany();
    if (existingShops.length === 0) {
      const shop = await db.shop.create({
        data: {
          id: 1,
          name: 'Central Fast Print Hub',
          slug: 'central-fast-print-hub',
          shopCode: 'SP-DEMO-0001',
          ownerId: owner.id,
          address: '104 Brigade Road, Bangalore, Karnataka 560025',
          phone: '+91 98765 43210',
          email: 'central@smartprint.com',
          status: 'ACTIVE',
          subscriptionTier: 'ENTERPRISE',
          agentToken: 'agt_demo_token_smartprint_64_characters_super_secret_key_1234567890',
        },
      });

      // Shop User Membership for Demo Owner
      await db.shopUser.create({
        data: {
          id: 1,
          shopId: shop.id,
          userId: owner.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      // Also attach user Achudh to demo shop so they can immediately test order management
      const achudhUsers = await db.user.findMany({
        where: {
          OR: [
            { email: 'achudhshaji@gmail.com' },
            { email: 'achudhshaji2028@mca.ajce.in' },
          ],
        },
      });
      for (const aUser of achudhUsers) {
        await db.shopUser.create({
          data: {
            shopId: shop.id,
            userId: aUser.id,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });
      }

      // Shop Settings
      await db.shopSettings.create({
        data: {
          id: 1,
          shopId: shop.id,
          paymentEnabled: true,
          directPrintEnabled: true,
          manualPrintEnabled: true,
          defaultExpiryHours: 1,
          defaultExpiryOption: '1h',
          allowedExpiryOptions: '15m,1h,3h,8h',
          maxUploadSizeMb: 50,
          acceptedFormats: '.pdf,.png,.jpg,.jpeg,.docx',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        },
      });

      // Pricing Rules
      const pricingRules = [
        { name: 'B&W A4 Simplex', colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 1.50 },
        { name: 'B&W A4 Duplex', colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 2.00 },
        { name: 'Color A4 Simplex', colorMode: 'COLOR', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 5.00 },
        { name: 'Color A4 Duplex', colorMode: 'COLOR', paperSize: 'A4', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 8.00 },
      ];
      for (const rule of pricingRules) {
        await db.pricingRule.create({
          data: { shopId: shop.id, ...rule, isActive: true },
        });
      }

      // Additional Services
      await db.additionalService.create({
        data: { shopId: shop.id, name: 'Soft Spiral Binding', description: 'Plastic coil spiral binding', price: 30.00, isActive: true },
      });
      await db.additionalService.create({
        data: { shopId: shop.id, name: 'Hardcover Project Binding', description: 'Golden letter embossed binding', price: 150.00, isActive: true },
      });
      await db.additionalService.create({
        data: { shopId: shop.id, name: 'Gloss Sheet Lamination', description: 'Thermal waterproof lamination', price: 20.00, isActive: true },
      });

      // Sample Physical Printers
      await db.printer.create({
        data: {
          id: 1,
          shopId: shop.id,
          name: 'HP LaserJet Pro M404dn',
          model: 'HP LaserJet M404',
          status: 'ONLINE',
          isDefault: true,
          isActive: true,
          connectionType: 'WINDOWS_SPOOLER',
          capabilities: { color: false, duplex: true, paperSizes: ['A4', 'LETTER', 'LEGAL'] },
          lastSeenAt: new Date(),
        },
      });
      await db.printer.create({
        data: {
          id: 2,
          shopId: shop.id,
          name: 'Canon imageRUNNER ADVANCE C3530i',
          model: 'Canon C3530i',
          status: 'ONLINE',
          isDefault: false,
          isActive: true,
          connectionType: 'NETWORK',
          capabilities: { color: true, duplex: true, paperSizes: ['A4', 'A3', 'LETTER'] },
          lastSeenAt: new Date(),
        },
      });
    }

    // Ensure all shops are linked to Achudh accounts as OWNER
    const allShops = await db.shop.findMany();
    const achudhUsers = await db.user.findMany({
      where: {
        OR: [
          { email: 'achudhshaji@gmail.com' },
          { email: 'achudhshaji2028@mca.ajce.in' },
        ],
      },
    });
    for (const sh of allShops) {
      for (const aUser of achudhUsers) {
        const existingMembership = await db.shopUser.findFirst({
          where: { shopId: sh.id, userId: aUser.id },
        });
        if (!existingMembership) {
          await db.shopUser.create({
            data: {
              shopId: sh.id,
              userId: aUser.id,
              role: 'OWNER',
              status: 'ACTIVE',
            },
          });
        }
      }
    }

    logger.info('🌱 Database ready with persistent accounts (Achudh: achudhshaji@gmail.com | Demo: demo@smartprint.com | SuperAdmin: superadmin@smartprint.io | Password: Password123)');
  } catch (err) {
    logger.error('Failed to seed in-memory database:', err);
  }
}

async function testConnection() {
  try {
    await activePrisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.warn(`[Database] MySQL server unreachable (${err.message}).`);
    logger.info(`[Database] Initializing in-memory zero-config persistence with pre-seeded demo accounts & shops.`);
    const mock = new InMemoryPrisma();
    await seedInMemory(mock);
    activePrisma = mock;
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
