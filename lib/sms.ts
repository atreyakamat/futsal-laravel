import crypto from 'crypto';

import * as fs from 'fs';
import * as path from 'path';

const SMS_LOG_PATH = process.env.SMS_LOG_PATH || '/tmp/sms-log.txt';
function logToPublic(msg: string) {
  try {
    const logPath = SMS_LOG_PATH;
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch(e) {}
}

export interface SmsProvider {
  sendSms(to: string, message: string, options?: { appUrl?: string }): Promise<boolean>;
}

export class MockProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    console.info(`[SMS MOCK] To: ${to} | Message: ${message}`);
    logToPublic(`[SMS MOCK] To: ${to} | Message: ${message}`);
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

  async sendSms(to: string, message: string, options?: { appUrl?: string }): Promise<boolean> {
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

  async sendSms(to: string, message: string, options?: { appUrl?: string }): Promise<boolean> {
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

  async sendSms(to: string, message: string, options?: { appUrl?: string }): Promise<boolean> {
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

export class AiSensyProvider implements SmsProvider {
  private apiKey: string;
  private campaignName: string;
  private userName: string;
  private source: string;

  constructor() {
    this.apiKey = process.env.AISENSY_API_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4N2UxMDA0MWQyYjdjMGMwZDkyY2VkYiIsIm5hbWUiOiJBSVREIE9mZmljaWFsIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY3OTQ3MGY4YmMzNjE1MGJmYjczOTIxMSIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTMwOTIxMDB9.TTQF2swfBaK6Lb3HgAEDr4OobXqyatJaS-GbPYEFgw8';
    this.campaignName = 'agnelarena_cofirm';
    this.userName = process.env.AISENSY_USERNAME ?? 'AITD Official';
    this.source = process.env.AISENSY_SOURCE ?? 'new-landing-page form';
  }

  async sendSms(to: string, message: string, options?: { appUrl?: string }): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[AiSensyProvider] Missing environment credentials, falling back to mock logging.');
      console.info(`[SMS AISENSY MOCK] To: ${to} | Message: ${message}`);
      return true;
    }
    try {
      // Normalize: strip any non-digits except leading + then ensure 91 prefix
      let destination = to.replace(/[^\d]/g, '').trim();
      if (destination.length === 10) {
        destination = '91' + destination;
      } else if (destination.startsWith('0')) {
        destination = '91' + destination.substring(1);
      }

      // Try to parse structured confirmation or OTP message
      let templateParams: string[] = [];
      let buttonText = 'user';
      let ticketNumber = '';
      let isOtp = false;

      const otpMatch = message.match(/\b\d{6}\b/);
      const otp = otpMatch ? otpMatch[0] : '';

      if (message.startsWith('CONFIRMED|')) {
        const parts = message.split('|');
        const dateStr = parts[1] || '';
        const timeRange = parts[2] || '';
        ticketNumber = parts[3] || '';
        const bookingRef = parts[4] || '';
        const customerName = parts[5] || 'Player';

        let formattedDate = dateStr;
        try {
          formattedDate = new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        } catch (_) {}

        let startTime = timeRange;
        let endTime = timeRange;
        if (timeRange.includes('-')) {
          const times = timeRange.split('-');
          startTime = (times[0] ?? '').trim();
          endTime = (times[1] ?? '').trim();
        }

        templateParams = ['$FirstName', '$FirstName', '$FirstName', '$FirstName']; // placeholders as per approved template
        buttonText = ticketNumber || bookingRef;
      } else if (otp) {
        isOtp = true;
        templateParams = ['$FirstName']; // placeholder, OTP sent in button text
        buttonText = otp;
      } else {
        templateParams = [message, message, message, message];
        buttonText = 'user';
      }

      // Try to extract dynamic ticket number if present (starts with TKT-)
      if (!ticketNumber && !isOtp) {
        const ticketMatch = message.match(/\bTKT-[A-Z0-9-]+\b/i);
        ticketNumber = ticketMatch ? ticketMatch[0] : '';
      }

      const appUrl = options?.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com';
      const pdfUrl = ticketNumber 
        ? `${appUrl}/api/ticket/${ticketNumber}.pdf`
        : "https://d3jt6ku4g6z5l8.cloudfront.net/FILE/6353da2e153a147b991dd812/4079142_dummy.pdf";

      const payload: any = {
        apiKey: this.apiKey,
        campaignName: isOtp
          ? 'agnel_arena_otp'
          : 'agnelarena_cofirm',
        destination: destination,
        userName: this.userName,
        templateParams: templateParams,
        source: this.source,
        media: isOtp ? {} : {
          url: pdfUrl,
          filename: ticketNumber ? `ticket-${ticketNumber}.pdf` : "booking_confirmation.pdf"
        },
        buttons: isOtp ? [] : [
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: buttonText
              }
            ]
          }
        ],
        carouselCards: [],
        location: {},
        attributes: {},
        paramsFallbackValue: {
          FirstName: "user"
        }
      };

      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        const errMsg = `[AiSensyProvider] Failed to send WhatsApp message: ${response.status} - ${errText} | destination=${destination} | campaign=${isOtp ? (process.env.AISENSY_CAMPAIGN_NAME_OTP || 'agnel_arena_otp') : (process.env.AISENSY_CAMPAIGN_NAME_BOOKING || 'agnelarena_cofirm')} | templateParams=${JSON.stringify(templateParams)}`;
        console.error(errMsg);
        logToPublic(errMsg);
        return false;
      }
      
      const resData = await response.json();
      console.info(`[AiSensyProvider] Message sent successfully to ${to}. Response:`, resData);
      logToPublic(`[AiSensyProvider] Message sent successfully to ${to}. Response: ${JSON.stringify(resData)}`);
      return true;
    } catch (err: any) {
      console.error('[AiSensyProvider] Error sending WhatsApp message:', err);
      logToPublic(`[AiSensyProvider] Error sending WhatsApp message: ${err.message || String(err)}`);
      return false;
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const providerType = (process.env.SMS_PROVIDER ?? 'aisensy').toLowerCase();
  
  logToPublic(`[getSmsProvider] Resolving provider: "${providerType}" (env: ${process.env.SMS_PROVIDER})`);
  
  switch (providerType) {
    case 'twilio':
      return new TwilioProvider();
    case 'msg91':
      return new MSG91Provider();
    case 'gupshup':
      return new GupshupProvider();
    case 'aisensy':
    case 'whatsapp':
      return new AiSensyProvider();
    case 'mock':
    default:
      logToPublic(`[getSmsProvider] Falling back to MockProvider for "${providerType}"`);
      return new MockProvider();
  }
}

