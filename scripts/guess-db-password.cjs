const { Client } = require('pg');

const passwords = ['postgres', 'admin', 'password', '123456', 'root', '', 'SuperAdmin@123', 'Admin@123456', 'Futsal@123'];
const ports = [5432, 5433, 5434, 5435];

async function tryPasswords() {
  for (const port of ports) {
    console.log(`Trying port ${port}...`);
    for (const password of passwords) {
      const DATABASE_URL = `postgresql://postgres:${password}@localhost:${port}/postgres`;
      const client = new Client({ connectionString: DATABASE_URL });
      try {
        await client.connect();
        console.log(`SUCCESS! Port: ${port}, Password: "${password}"`);
        await client.end();
        return;
      } catch (err) {
        // console.log(`Failed: ${password}`);
      }
    }
  }
  console.log('All attempts failed.');
}

tryPasswords();
