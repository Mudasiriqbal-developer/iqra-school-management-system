const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNDhkNGU0MTg0NmMxODBmMGFkMDljZCIsImlhdCI6MTc4MzM5OTAzNywiZXhwIjoxNzg0MDAzODM3fQ.4mek9XaCn7BUmurcPGmFx2Z3vxL4voghZPRYFx6Djyg';

const makeRequest = (path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(data)
        });
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    req.end();
  });
};

async function test() {
  const classes = await makeRequest('/api/classes');
  console.log('--- Classes from running server ---');
  console.log(JSON.stringify(classes.data, null, 2));
}

test();
