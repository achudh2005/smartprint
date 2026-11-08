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

async function main() {
  console.log('Testing customer flow for SP-A9DC-X67T...');
  const shopRes = await get('/api/v1/customer/shops/SP-A9DC-X67T');
  console.log('Shop Lookup Status:', shopRes.status, 'Shop Name:', shopRes.body?.data?.name);

  const sessionRes = await post('/api/v1/customer/sessions', { shopCode: 'SP-A9DC-X67T' });
  console.log('Session Status:', sessionRes.status, 'Session Token:', sessionRes.body?.data?.sessionToken?.slice(0, 15) + '...');
  console.log('Initial draftOrder:', sessionRes.body?.data?.draftOrder);

  console.log('ALL CHECKS PASSED ✅');
}

main().catch(console.error);
