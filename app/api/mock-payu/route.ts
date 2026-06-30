import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPayuConfig } from '@/lib/payment';

export async function POST(request: Request) {
  const formData = await request.formData();
  
  const txnid = formData.get('txnid') as string;
  const amount = formData.get('amount') as string;
  const productinfo = formData.get('productinfo') as string;
  const firstname = formData.get('firstname') as string;
  const email = formData.get('email') as string;
  const surl = formData.get('surl') as string;
  const furl = formData.get('furl') as string;
  
  // Create reverse hash to send back to our callback
  const { merchantKey, merchantSalt } = getPayuConfig();
  const status = 'success';
  const hashString = `${merchantSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
  const reverseHash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mock PayU Gateway</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; background: #f4f5f7; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        h1 { color: #2ecc71; margin-bottom: 5px; }
        p { color: #666; margin-bottom: 30px; font-size: 14px; }
        .btn { background: #2ecc71; color: white; border: none; padding: 15px 20px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn-fail { background: #e74c3c; margin-top: 10px; }
        .amount { font-size: 32px; font-weight: 900; color: #111; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>PayU Mock Gateway</h1>
        <p>Local Testing Environment</p>
        <div class="amount">₹${amount}</div>
        <p><strong>Txn ID:</strong> ${txnid}</p>
        
        <form method="POST" action="${surl}">
          <input type="hidden" name="status" value="${status}" />
          <input type="hidden" name="txnid" value="${txnid}" />
          <input type="hidden" name="amount" value="${amount}" />
          <input type="hidden" name="productinfo" value="${productinfo}" />
          <input type="hidden" name="firstname" value="${firstname}" />
          <input type="hidden" name="email" value="${email}" />
          <input type="hidden" name="hash" value="${reverseHash}" />
          <input type="hidden" name="mihpayid" value="MOCK_${Date.now()}" />
          <button type="submit" class="btn">Simulate Payment Success</button>
        </form>

        <form method="POST" action="${furl}">
          <!-- Failure hash simulation is usually ignored, but we'll just post failure -->
          <input type="hidden" name="status" value="failure" />
          <input type="hidden" name="txnid" value="${txnid}" />
          <input type="hidden" name="amount" value="${amount}" />
          <input type="hidden" name="hash" value="MOCK_FAIL_HASH" />
          <button type="submit" class="btn btn-fail">Simulate Payment Failure</button>
        </form>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
