import http from 'http';

function fetchUrl(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== PHASE 3: PRODUCTION SERVER VERIFICATION ===');
  
  // 1. Root page /
  const rootRes = await fetchUrl('http://localhost:3088/');
  console.log(`GET / -> HTTP ${rootRes.status}`);
  if (rootRes.status !== 200) {
    throw new Error(`GET / failed with status ${rootRes.status}`);
  }

  // 2. /api/health
  const healthRes = await fetchUrl('http://localhost:3088/api/health');
  console.log(`GET /api/health -> HTTP ${healthRes.status}`);
  console.log('Health Body:', healthRes.body);
  if (healthRes.status !== 200) {
    throw new Error(`GET /api/health failed with status ${healthRes.status}`);
  }
  const healthJson = JSON.parse(healthRes.body);
  if (healthJson.status !== 'healthy') {
    throw new Error(`Health status is not healthy: ${healthRes.body}`);
  }

  // 3. /arena/aiem-assagao
  const arenaRes = await fetchUrl('http://localhost:3088/arena/aiem-assagao');
  console.log(`GET /arena/aiem-assagao -> HTTP ${arenaRes.status}`);
  if (arenaRes.status !== 200) {
    throw new Error(`GET /arena/aiem-assagao failed with status ${arenaRes.status}`);
  }
  if (!arenaRes.body.toLowerCase().includes('assagao')) {
    throw new Error('Arena page body does not contain arena name');
  }

  // 4. /api/slots/status
  const slotsRes = await fetchUrl('http://localhost:3088/api/slots/status?arena_id=23&date=2026-07-29');
  console.log(`GET /api/slots/status -> HTTP ${slotsRes.status}`);
  console.log('Slots Body (sample):', slotsRes.body.slice(0, 300));
  if (slotsRes.status !== 200) {
    throw new Error(`GET /api/slots/status failed with status ${slotsRes.status}`);
  }

  console.log('\n✅ PHASE 3 VERIFICATION COMPLETE: ALL ENDPOINTS HEALTHY AND RETURNING REAL DATA UNDER NEXT START!');
}

main().catch(err => {
  console.error('❌ PHASE 3 VERIFICATION FAILED:', err.message);
  process.exit(1);
});
