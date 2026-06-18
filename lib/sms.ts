import crypto from 'crypto';

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
}

export class MockProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    console.info(`[SMS MOCK] To: ${to} | Message: ${message}`);
    return true;
  }
}

export class TwilioProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER ?? '';
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[TwilioProvider] Missing environment credentials, falling back to mock logging.');
      console.info(`[SMS TWILIO MOCK] To: ${to} | Message: ${message}`);
      return true;
    }
    try {
      const basicAuth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: this.fromNumber,
            Body: message,
          }).toString(),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TwilioProvider] Failed to send SMS: ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[TwilioProvider] Error sending SMS:', err);
      return false;
    }
  }
}

export class MSG91Provider implements SmsProvider {
  private authKey: string;
  private templateId: string;
  private senderId: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY ?? '';
    this.templateId = process.env.MSG91_TEMPLATE_ID ?? '';
    this.senderId = process.env.MSG91_SENDER_ID ?? '';
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.authKey) {
      console.warn('[MSG91Provider] Missing environment credentials, falling back to mock logging.');
      console.info(`[SMS MSG91 MOCK] To: ${to} | Message: ${message}`);
      return true;
    }
    try {
      const cleanMobile = to.replace(/\+/g, '');
      const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flow_id: this.templateId,
          sender: this.senderId,
          mobiles: cleanMobile,
          var1: message,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[MSG91Provider] Failed to send SMS: ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[MSG91Provider] Error sending SMS:', err);
      return false;
    }
  }
}

export class GupshupProvider implements SmsProvider {
  private apiKey: string;
  private userId: string;
  private password?: string;

  constructor() {
    this.apiKey = process.env.GUPSHUP_API_KEY ?? '';
    this.userId = process.env.GUPSHUP_USER_ID ?? '';
    this.password = process.env.GUPSHUP_PASSWORD ?? '';
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.apiKey && !this.userId) {
      console.warn('[GupshupProvider] Missing environment credentials, falling back to mock logging.');
      console.info(`[SMS GUPSHUP MOCK] To: ${to} | Message: ${message}`);
      return true;
    }
    try {
      const cleanMobile = to.replace(/\+/g, '');
      const params = new URLSearchParams({
        method: 'SendMessage',
        send_to: cleanMobile,
        msg: message,
        msg_type: 'TEXT',
        format: 'json',
        ...(this.apiKey ? { apiKey: this.apiKey } : { userid: this.userId, password: this.password ?? '' }),
      });
      const response = await fetch(`https://enterprise.smsgupshup.com/GatewayAPI/rest?${params.toString()}`);
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[GupshupProvider] Failed to send SMS: ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[GupshupProvider] Error sending SMS:', err);
      return false;
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const providerType = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();
  switch (providerType) {
    case 'twilio':
      return new TwilioProvider();
    case 'msg91':
      return new MSG91Provider();
    case 'gupshup':
      return new GupshupProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}
