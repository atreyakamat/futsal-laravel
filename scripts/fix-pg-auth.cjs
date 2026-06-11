const fs = require('fs');
const path = 'C:\\Program Files\\PostgreSQL\\16\\data\\pg_hba.conf';
try {
  const content = fs.readFileSync(path, 'utf8');
  const newContent = content.replace(/scram-sha-256/g, 'trust');
  fs.writeFileSync(path, newContent);
  console.log('Successfully updated pg_hba.conf');
} catch (err) {
  console.error('Error updating pg_hba.conf:', err.message);
}
