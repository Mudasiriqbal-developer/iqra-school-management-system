const http = require('http');

const makeRequest = (path) => {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(data)
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
};

async function test() {
  const classes = await makeRequest('/api/classes');
  console.log('--- Classes from running server ---');
  console.log(JSON.stringify(classes.data, null, 2));
}

test();
