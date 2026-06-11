const { Client } = require('pg');

async function testPorts() {
  const ports = [5432, 5433, 5434, 5435];
  for (const port of ports) {
    console.log(`Testing port ${port} as user atkam...`);
    const client = new Client({ host: 'localhost', port, user: 'atkam', database: 'postgres' });
    try {
      await client.connect();
      console.log(`SUCCESS on port ${port}!`);
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed on port ${port}: ${err.message}`);
    }
  }
}

testPorts();
