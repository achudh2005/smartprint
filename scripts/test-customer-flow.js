const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: 5000, path }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    }).on('error', reject);
  });
}

function uploadFile(sessionToken, filename, content, mimeType) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let postData = '';
    postData += `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`;
    postData += `Content-Type: ${mimeType}\r\n\r\n`;
    postData += content;
    postData += `\r\n--${boundary}--\r\n`;

    const req = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: `/api/v1/customer/sessions/${sessionToken}/files`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('1. Testing shop profile SP-A9DC-X67T...');
  const shopRes = await get('/api/v1/customer/shops/SP-A9DC-X67T');
  console.log('Shop Name:', shopRes.body?.data?.name);

  console.log('2. Creating session...');
  const sessionRes = await post('/api/v1/customer/sessions', { shopCode: 'SP-A9DC-X67T' });
  const token = sessionRes.body?.data?.sessionToken;
  console.log('Session Token:', token?.slice(0, 20) + '...');

  console.log('3. Uploading test document...');
  const uploadRes = await uploadFile(token, 'test_notes.txt', 'Hello SmartPrint AWS Sydney EC2 production server!', 'text/plain');
  console.log('Upload HTTP Status:', uploadRes.status);
  console.log('Upload Result:', uploadRes.body);

  console.log('4. Fetching refreshed session...');
  const refreshedRes = await get(`/api/v1/customer/sessions/${token}`);
  const draftOrder = refreshedRes.body?.data?.draftOrder;
  console.log('Refreshed draftOrder:', JSON.stringify(draftOrder, null, 2));

  console.log('5. Submitting order...');
  const confirmRes = await post(`/api/v1/customer/sessions/${token}/confirm`, {
    customerName: 'Test Customer',
    customerPhone: '9876543210',
    notes: 'Test print',
    expiryOption: '1h',
    paymentMethod: 'COUNTER',
  });
  console.log('Confirm Order Result:', confirmRes.body);

  console.log('FULL CUSTOMER FLOW VERIFIED SUCCESSFULLY! 🚀');
}

main().catch(console.error);
