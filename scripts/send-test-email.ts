import { sendEmail } from '../lib/email.ts';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const to = 'atkamat1204@gmail.com';
  const subject = 'Agnel Arena Integration Status & Ticket API Documentation';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
      <h2 style="color: #0df220; border-bottom: 2px solid #0df220; padding-bottom: 10px;">Agnel Arena System Integration Complete</h2>
      <p>Hi Atreya,</p>
      <p>This test email confirms that your <strong>AWS SES</strong> setup is successfully integrated and operational.</p>
      
      <h3 style="color: #555;">What was built and updated:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 35%;">AWS SES Integration</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Replaced Resend with AWS SES client natively. Senders verified as <code>no-reply@aiemgoa.ac.in</code>.</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Dynamic PDF Tickets</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Built in-memory PDF generation containing booking metadata, rules, and a custom QR code.</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Ticket Download API</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Exposed a public download route at <code>/api/bookings/download?ticket=TKT-XXXX</code>.</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Public Verification Page</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Created a public portal at <code>/verify-ticket?ticket=TKT-XXXX</code> where scanned QR codes resolve and display booking validation instantly.</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">WhatsApp PDF Tickets</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Successfully modified the WhatsApp/SMS dispatch payload to extract ticket IDs, auto-build download URLs, and deliver real PDF files as media attachments to players.</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Image Upload UI</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Updated the Super Admin form to allow uploading Cover and Logo image files directly.</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">AIEM Assagao Arena Address</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Updated the seed scripts and database mappings to point to: <em>Agnel Technical Educational Complex Assagao, Bardez – Goa 403507</em>.</td>
        </tr>
      </table>
      
      <p style="margin-top: 20px; font-size: 12px; color: #777;">This email was automatically generated and sent via AWS SES client testing.</p>
    </div>
  `;
  
  const text = `Agnel Arena Integration Complete. AWS SES is operational. Senders verified as no-reply@aiemgoa.ac.in. PDF Ticket Download is at /api/bookings/download?ticket=TKT-XXXX. Public validation portal is at /verify-ticket?ticket=TKT-XXXX. WhatsApp confirmation sends the PDF. AIEM Assagao seed address is set to Agnel Technical Educational Complex Assagao, Bardez - Goa 403507.`;

  console.log(`Sending verification test email to ${to}...`);
  const result = await sendEmail({ to, subject, html, text });
  console.log('SES Response:', result);
}

main().catch(console.error);
