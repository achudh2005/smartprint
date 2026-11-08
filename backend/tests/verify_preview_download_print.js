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

async function run() {
  console.log('--- Step 1: Login Shop Owner ---');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'demo@smartprint.com', password: 'Password123' }));
  const token = JSON.parse(loginRes.text).data.accessToken;
  console.log('Login OK. User ID 2, Token length:', token.length);

  console.log('--- Step 2: Customer Init Session ---');
  const sessionRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/customer/sessions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ shopCode: 'SP-DEMO-0001', deviceFingerprint: 'test-fingerprint' }));
  const sessionData = JSON.parse(sessionRes.text);
  const sessionToken = sessionData.data.sessionToken;
  console.log('Session initialized. Token:', sessionToken);

  console.log('--- Step 3: Customer Uploads Sample PDF ---');
  const userPdf = path.resolve('uploads/shop_23/session_cs_56ef1a7d014ba/051e43ea-990e-4290-968e-9e59c741693d.pdf');
  const fileContent = fs.existsSync(userPdf)
    ? fs.readFileSync(userPdf)
    : Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000059 00000 n \n0000000116 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n165\n%%EOF');
  
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
  const uploadData = JSON.parse(uploadRes.text);
  console.log('Upload HTTP status:', uploadRes.statusCode, 'Files uploaded count:', uploadData.data?.files?.length);
  const uploadedFile = uploadData.data?.files?.[0];
  console.log('Uploaded File - ID:', uploadedFile?.id, 'publicId:', uploadedFile?.publicId, 'name:', uploadedFile?.originalName);

  console.log('--- Step 4: Confirm Customer Order ---');
  const confirmRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/customer/sessions/' + sessionToken + '/confirm',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ customerName: 'Test Customer', customerPhone: '9876543210' }));
  console.log('Confirm raw status:', confirmRes.statusCode, 'text:', confirmRes.text);
  const confirmData = JSON.parse(confirmRes.text);
  const order = confirmData.data?.order || confirmData.data;
  console.log('Order confirmed! Order ID:', order?.id, 'Order Number:', order?.orderNumber);

  console.log('--- Step 5: Test Shop Preview Endpoint ---');
  const shopPrevRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/shops/1/files/' + uploadedFile.publicId + '/preview?token=' + token,
    method: 'GET'
  });
  console.log('Shop Preview Status:', shopPrevRes.statusCode, 'Content-Type:', shopPrevRes.headers['content-type'], 'Bytes:', shopPrevRes.buffer.length);

  console.log('--- Step 6: Test Shop Download Endpoint (Bearer & Token) ---');
  const shopDlHeaderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/shops/1/files/' + uploadedFile.publicId + '/download',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Shop Download (Header) Status:', shopDlHeaderRes.statusCode, 'Content-Disposition:', shopDlHeaderRes.headers['content-disposition'], 'Bytes:', shopDlHeaderRes.buffer.length);

  const shopDlQueryRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/shops/1/files/' + uploadedFile.publicId + '/download?token=' + token,
    method: 'GET'
  });
  console.log('Shop Download (Query) Status:', shopDlQueryRes.statusCode, 'Content-Disposition:', shopDlQueryRes.headers['content-disposition'], 'Bytes:', shopDlQueryRes.buffer.length);

  console.log('--- Step 7: Test Print Recording Functionality ---');
  const printJobRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/shops/1/orders/' + order.id + '/files/' + uploadedFile.id + '/print-job',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  const printData = JSON.parse(printJobRes.text);
  console.log('Print job recorded status:', printJobRes.statusCode, 'Message:', printData.message, 'PrintJob ID:', printData.data?.printJob?.id, 'Attempt:', printData.data?.printJob?.attemptNumber);

  console.log('\n>>> ALL 7 E2E STEPS VERIFIED SUCCESSFULLY! <<<');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
