import http from 'http';
import pkg from 'pg';
const { Pool } = pkg;

function fetchUrl(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    }).on('error', reject);
  });
}

async function verifyDockerApp() {
  console.log('--- Testing Docker Application at http://localhost:3001 ---');
  
  // 1. Health check
  const healthRes = await fetchUrl('http://localhost:3001/api/health');
  console.log(`Docker /api/health -> HTTP ${healthRes.status}`);
  console.log('Health Output:', healthRes.body);
  if (healthRes.status !== 200 || !healthRes.body.includes('"status":"healthy"')) {
    throw new Error(`Docker container /api/health failed: ${healthRes.body}`);
  }

  // 2. Root page
  const rootRes = await fetchUrl('http://localhost:3001/');
  console.log(`Docker / -> HTTP ${rootRes.status}`);
  if (rootRes.status !== 200) {
    throw new Error(`Docker container / failed: HTTP ${rootRes.status}`);
  }

  // 3. Arena page
  const arenaRes = await fetchUrl('http://localhost:3001/arena/aiem-assagao');
  console.log(`Docker /arena/aiem-assagao -> HTTP ${arenaRes.status}`);
  if (arenaRes.status !== 200 || !arenaRes.body.toLowerCase().includes('assagao')) {
    throw new Error(`Docker container /arena/aiem-assagao failed: HTTP ${arenaRes.status}`);
  }

  // 4. Slots API
  const slotsRes = await fetchUrl('http://localhost:3001/api/slots/status?arena_id=23&date=2026-07-29');
  console.log(`Docker /api/slots/status -> HTTP ${slotsRes.status}`);
  if (slotsRes.status !== 200 || !slotsRes.body.includes('"success":true')) {
    throw new Error(`Docker container /api/slots/status failed: ${slotsRes.body}`);
  }

  console.log('✅ Docker App Verification PASSED!');
}

async function main() {
  await verifyDockerApp();
}

main().catch(err => {
  console.error('❌ Docker Verification Failed:', err.message);
  process.exit(1);
});
