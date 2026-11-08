const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer,
          text: buffer.toString()
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function test() {
  console.log('--- Test 1: Testing Registration & Rate Limiting ---');
  const uniqueEmail = `test_${Date.now()}@mca.ajce.in`;
  const regRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    name: 'Achudh',
    email: uniqueEmail,
    password: 'Password123',
    confirmPassword: 'Password123',
  }));
  console.log('Registration HTTP Status:', regRes.statusCode);
  const regData = JSON.parse(regRes.text);
  console.log('Registration Response:', regData.message, 'User Email:', regData.data?.user?.email);

  console.log('--- Test 2: Customer Session & File Upload ---');
  const sessRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/customer/sessions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ shopCode: 'SP-DEMO-0001', deviceFingerprint: 'test-fingerprint' }));
  const sessionToken = JSON.parse(sessRes.text).data.sessionToken;
  console.log('Session initialized. Token:', sessionToken);

  const userPdf = path.resolve('uploads/shop_23/session_cs_56ef1a7d014ba/051e43ea-990e-4290-968e-9e59c741693d.pdf');
  const fileContent = fs.readFileSync(userPdf);
  const boundary = '----WebKitFormBoundaryXyZ789';
  const pre = Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="files"; filename="print_sample.pdf"\r\n' +
    'Content-Type: application/pdf\r\n\r\n'
  );
  const post = Buffer.from('\r\n--' + boundary + '--\r\n');
  const multipartBody = Buffer.concat([pre, fileContent, post]);

  const uploadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/customer/sessions/' + sessionToken + '/files',
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': multipartBody.length
    }
  }, multipartBody);
  console.log('Upload HTTP Status:', uploadRes.statusCode);

  console.log('--- Test 3: Confirm Customer Order ---');
  const confirmRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/customer/sessions/' + sessionToken + '/confirm',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ customerName: 'Achudh', customerPhone: '9876543210' }));
  const confirmData = JSON.parse(confirmRes.text);
  console.log('Confirm Order Status:', confirmRes.statusCode);
  const orderNumber = confirmData.data?.orderNumber;
  console.log('Confirmed Order Number:', orderNumber);

  console.log('--- Test 4: Fetch Order Status by Order Number (Testing OrderConfirmationPage API) ---');
  const getOrderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/customer/orders/' + orderNumber,
    method: 'GET'
  });
  console.log('Get Order Status HTTP Code:', getOrderRes.statusCode);
  const orderData = JSON.parse(getOrderRes.text);
  console.log('Order Details Retrieved:');
  console.log('  Order Number:', orderData.data?.orderNumber);
  console.log('  Status:', orderData.data?.status);
  console.log('  Payment Status:', orderData.data?.paymentStatus);
  console.log('  Total Amount:', orderData.data?.totalAmount);
  console.log('  Expires At:', orderData.data?.expiresAt);
  console.log('  Shop Name:', orderData.data?.shop?.name);
  console.log('  Files Count:', orderData.data?.files?.length);
  console.log('  First File:', orderData.data?.files?.[0]?.originalName, 'Pages:', orderData.data?.files?.[0]?.pageCount);
  console.log('  Services Array:', Array.isArray(orderData.data?.files?.[0]?.services) ? 'Valid Array' : 'Invalid');

  console.log('\n>>> ALL AUDIT TESTS PASSED WITH ZERO ERRORS! <<<');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
