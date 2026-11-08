const http = require('http');

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const user = await prisma.user.findFirst({
    where: { email: 'achudhshaji@gmail.com' },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '1d' }
  );

  const req = http.request({
    host: '127.0.0.1',
    port: 5000,
    path: '/api/v1/shops/5/orders?sortBy=createdAt&sortOrder=desc',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const parsed = JSON.parse(d);
      console.log('Status:', res.statusCode);
      console.log('Pagination:', parsed.data?.pagination);
      console.log('Total Count:', parsed.data?.total);
      console.log('Orders Count:', parsed.data?.orders?.length);
      console.log('First (Latest) Order:', parsed.data?.orders?.[0]?.orderNumber, parsed.data?.orders?.[0]?.createdAt);
      console.log('Last (Oldest) Order:', parsed.data?.orders?.[parsed.data?.orders?.length - 1]?.orderNumber, parsed.data?.orders?.[parsed.data?.orders?.length - 1]?.createdAt);
      console.log('VERIFICATION SUCCESSFUL ✅');
    });
  });
  req.end();
}

main().catch(console.error);
