import { sendEmail } from '../lib/email';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npx tsx scripts/send-test-email.ts <recipient-email>');
    process.exit(1);
  }

  const fromEmail = process.env.AWS_FROM_EMAIL || '(AWS_FROM_EMAIL not set — falling back to default)';
  const subject = 'AgnelArena SES test email';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
      <h2 style="color: #0df220; border-bottom: 2px solid #0df220; padding-bottom: 10px;">AgnelArena SES Test</h2>
      <p>This is a test email confirming the app's AWS SES configuration is working.</p>
      <p><strong>Sending from:</strong> ${fromEmail}</p>
      <p><strong>Region:</strong> ${process.env.AWS_DEFAULT_REGION || '(AWS_DEFAULT_REGION not set)'}</p>
    </div>
  `;
  const text = `AgnelArena SES test email. Sending from ${fromEmail}, region ${process.env.AWS_DEFAULT_REGION || '(not set)'}.`;

  console.log(`Sending test email to ${to} (from ${fromEmail})...`);
  const result = await sendEmail({ to, subject, html, text });
  console.log('SES Response:', result);
  if (!result.success) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
