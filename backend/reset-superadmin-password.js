'use strict';

const argon2 = require('argon2');
const { prisma } = require('./src/database/client');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST, 10) || 65536,
  timeCost: parseInt(process.env.ARGON2_TIME_COST, 10) || 3,
  parallelism: parseInt(process.env.ARGON2_PARALLELISM, 10) || 4,
};

async function main() {
  const newPassword = process.argv[2] || 'A chudh@2005';
  console.log(`Resetting Super Admin password...`);

  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
  });

  console.log(`Found ${admins.length} super admin account(s):`);
  admins.forEach(a => console.log(`- ID: ${a.id}, Email: ${a.email}, Name: ${a.name}, Status: ${a.status}`));

  if (admins.length === 0) {
    console.log('No super admin found! Checking all users:');
    const all = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.log(all);
    return;
  }

  const hash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  for (const admin of admins) {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: hash,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
      },
    });
    console.log(`Updated password for Super Admin: ${admin.email}`);
  }

  console.log(`Successfully reset password to: "${newPassword}"`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
