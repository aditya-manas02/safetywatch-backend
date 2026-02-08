import https from 'https';

const options = {
  hostname: 'safetywatch-backend.onrender.com',
  port: 443,
  path: '/api/stats/public',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
