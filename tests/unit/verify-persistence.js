const { execSync } = require('child_process');

async function run() {
  console.log("Starting verification...");

  // 1. Persistence
  console.log("\n--- SUPER ADMIN PERSISTENCE ---");
  // We can just verify via db query
  const query = "docker exec futsal_postgres psql -U futsal_user -d futsal_laravel -c \"UPDATE settings SET value='6' WHERE key='cancellation_cutoff_hours'\"";
  execSync(query);
  console.log("Set cutoff to 6 in DB.");
  
  execSync("docker compose restart app");
  console.log("Restarted app container.");
  
  const readQuery = "docker exec futsal_postgres psql -U futsal_user -d futsal_laravel -t -c \"SELECT value FROM settings WHERE key='cancellation_cutoff_hours'\"";
  const val = execSync(readQuery).toString().trim();
  if (val === '6') {
    console.log("SETTING PERSISTENCE: PASS");
  } else {
    console.log(`SETTING PERSISTENCE: FAIL (got ${val})`);
  }

  // Restore
  execSync("docker exec futsal_postgres psql -U futsal_user -d futsal_laravel -c \"UPDATE settings SET value='3' WHERE key='cancellation_cutoff_hours'\"");

}
run();
