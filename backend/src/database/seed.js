// ============================================================
// Database Seed – SmartPrint Phase 1
// Creates a demo admin user and shop for testing
// ============================================================
require('dotenv').config({ path: '../.env' });
const argon2 = require('argon2');
const { prisma } = require('../src/database/client');
const { generateShopCode } = require('../src/utils/generators');

async function main() {
  console.log('🌱 Seeding SmartPrint database...');

  // Create demo user
  const hash = await argon2.hash('Password123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@smartprint.com' },
    update: {},
    create: {
      name: 'Demo Owner',
      email: 'demo@smartprint.com',
      passwordHash: hash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Demo user: ${user.email} (password: Password123)`);

  // Create demo shop
  const shopCode = generateShopCode();
  const shop = await prisma.shop.upsert({
    where: { shopCode: 'SP-DEMO-0001' },
    update: {},
    create: {
      shopCode: 'SP-DEMO-0001',
      name: 'Demo Print Shop',
      address: '123 Main Street, Bangalore, Karnataka 560001',
      phone: '+91 98765 43210',
      email: 'shop@smartprint.com',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Demo shop: "${shop.name}" (Code: ${shop.shopCode})`);

  // Link user to shop
  await prisma.shopUser.upsert({
    where: { shopId_userId: { shopId: shop.id, userId: user.id } },
    update: {},
    create: {
      shopId: shop.id,
      userId: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  // Create default settings
  await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: { shopId: shop.id },
  });

  // Add sample pricing rules
  const pricingRules = [
    { name: 'B&W A4 Simplex', colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 1.00 },
    { name: 'B&W A4 Duplex',  colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 1.50 },
    { name: 'Color A4 Simplex', colorMode: 'COLOR',     paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 5.00 },
    { name: 'Color A4 Duplex',  colorMode: 'COLOR',     paperSize: 'A4', duplexMode: 'DUPLEX_LONG_EDGE', pricePerPage: 8.00 },
  ];

  for (const rule of pricingRules) {
    await prisma.pricingRule.create({
      data: { shopId: shop.id, ...rule, isActive: true },
    });
  }

  console.log('✅ Sample pricing rules created');

  // Add a sample printer
  await prisma.printer.upsert({
    where: { publicId: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      publicId: '00000000-0000-0000-0000-000000000001',
      shopId: shop.id,
      name: 'HP LaserJet Pro',
      model: 'HP LaserJet Pro M404dn',
      status: 'OFFLINE',
      isDefault: true,
    },
  });

  console.log('✅ Sample printer created');
  console.log('\n🎉 Seed complete!');
  console.log('   Login: demo@smartprint.com / Password123');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
