import { execSync } from 'child_process';
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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('====================================================');
  console.log('🔄 PHASE 6 — RESTART / PERSISTENCE VERIFICATION');
  console.log('====================================================');

  // Step 1: Record existing persistent record
  console.log('\n1. Fetching persistent record from Docker App...');
  const slotsRes1 = await fetchUrl('http://localhost:3001/api/slots/status?arena_id=1&date=2026-07-29');
  if (slotsRes1.status !== 200) throw new Error(`Initial slots fetch failed: HTTP ${slotsRes1.status}`);
  const data1 = JSON.parse(slotsRes1.body);
  console.log(`  ✅ Recorded Arena Name: "${data1.arena}", Date: "${data1.date}", Slots Count: ${data1.slots.length}`);

  // Step 2: Restart application container
  console.log('\n2. Restarting application container (futsal_next_app)...');
  execSync('docker restart futsal_next_app', { stdio: 'inherit' });
  await sleep(3000);

  // Step 3: Verify health after app restart
  console.log('\n3. Verifying health after app container restart...');
  let healthRes2: any = null;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      healthRes2 = await fetchUrl('http://localhost:3001/api/health');
      if (healthRes2.status === 200 && healthRes2.body.includes('"status":"healthy"')) {
        break;
      }
    } catch (_) {}
  }
  console.log(`  Health Status: ${healthRes2?.body}`);
  if (!healthRes2 || healthRes2.status !== 200 || !healthRes2.body.includes('"status":"healthy"')) {
    throw new Error('Health check failed after app container restart');
  }
  console.log('  ✅ Application container healthy after restart!');

  // Step 4: Verify record remains
  console.log('\n4. Verifying persistent record remains after app restart...');
  const slotsRes2 = await fetchUrl('http://localhost:3001/api/slots/status?arena_id=1&date=2026-07-29');
  const data2 = JSON.parse(slotsRes2.body);
  if (data2.arena !== data1.arena || data2.slots.length !== data1.slots.length) {
    throw new Error('Persistent record mismatch after app container restart');
  }
  console.log('  ✅ Record intact after app container restart!');

  // Step 5: Restart PostgreSQL container
  console.log('\n5. Restarting PostgreSQL container (futsal_postgres)...');
  execSync('docker restart futsal_postgres', { stdio: 'inherit' });
  
  // Step 6: Wait for DB readiness
  console.log('\n6. Waiting for PostgreSQL container readiness...');
  let dbReady = false;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    try {
      const out = execSync('docker exec futsal_postgres pg_isready -U postgres -d futsal_laravel', { encoding: 'utf8' });
      if (out.includes('accepting connections')) {
        dbReady = true;
        break;
      }
    } catch (_) {}
  }
  if (!dbReady) throw new Error('PostgreSQL container failed to become ready');
  console.log('  ✅ PostgreSQL container accepting connections!');

  // Step 7: Verify application reconnects
  console.log('\n7. Verifying application reconnects to PostgreSQL...');
  let healthRes3: any = null;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      healthRes3 = await fetchUrl('http://localhost:3001/api/health');
      if (healthRes3.status === 200 && healthRes3.body.includes('"status":"healthy"')) {
        break;
      }
    } catch (_) {}
  }
  console.log(`  Health Status: ${healthRes3?.body}`);
  if (!healthRes3 || healthRes3.status !== 200 || !healthRes3.body.includes('"status":"healthy"')) {
    throw new Error('Application failed to reconnect after PostgreSQL restart');
  }
  console.log('  ✅ Application reconnected to PostgreSQL successfully!');

  // Step 8 & 9: Verify record remains & arena/slot data loads
  console.log('\n8 & 9. Verifying arena/slot data loads after DB restart...');
  const slotsRes3 = await fetchUrl('http://localhost:3001/api/slots/status?arena_id=1&date=2026-07-29');
  const data3 = JSON.parse(slotsRes3.body);
  if (data3.arena !== data1.arena || data3.slots.length !== data1.slots.length) {
    throw new Error('Persistent record mismatch after PostgreSQL container restart');
  }
  console.log(`  ✅ Persistent record verified! Arena: "${data3.arena}", Slots: ${data3.slots.length}`);

  console.log('\n====================================================');
  console.log('✅ PHASE 6 RESTART & PERSISTENCE VERIFICATION PASSED!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('❌ Phase 6 Failed:', err.message);
  process.exit(1);
});
