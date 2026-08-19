import crypto from 'crypto';

import * as fs from 'fs';
import * as path from 'path';
import { generateTicketDownloadToken } from '@/lib/ticket-token';

const SMS_LOG_PATH = process.env.SMS_LOG_PATH || '/tmp/sms-log.txt';
function logToPublic(msg: string) {
  try {
    const logPath = SMS_LOG_PATH;
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch(e) {}
}

export interface SmsProvider {
  sendSms(to: string, message: string, options?: { appUrl?: string; arenaAddress?: string }): Promise<boolean>;
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

  async sendSms(to: string, message: string, options?: { appUrl?: string; arenaAddress?: string }): Promise<boolean> {
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
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TwilioProvider] Failed to send SMS: ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[TwilioProvider] Error sending SMS:', err?.message || err);
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

  async sendSms(to: string, message: string, options?: { appUrl?: string; arenaAddress?: string }): Promise<boolean> {
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
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[MSG91Provider] Failed to send SMS: ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[MSG91Provider] Error sending SMS:', err?.message || err);
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

  async sendSms(to: string, message: string, options?: { appUrl?: string; arenaAddress?: string }): Promise<boolean> {
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
      const response = await fetch(`https://enterprise.smsgupshup.com/GatewayAPI/rest?${params.toString()}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[GupshupProvider] Failed to send SMS: ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[GupshupProvider] Error sending SMS:', err?.message || err);
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
    this.apiKey = process.env.AISENSY_API_KEY || '';
    this.campaignName = 'agnelarena_cofirm';
    this.userName = process.env.AISENSY_USERNAME ?? 'AITD Official';
    this.source = process.env.AISENSY_SOURCE ?? 'new-landing-page form';
  }

  async sendSms(to: string, message: string, options?: { appUrl?: string; arenaAddress?: string }): Promise<boolean> {
    if (!this.apiKey) {
      const errMsg = '[AiSensyProvider] Provider Configuration Error: AISENSY_API_KEY is missing from environment.';
      console.error(errMsg);
      logToPublic(errMsg);
      throw new Error(errMsg);
    }
    try {
      // Normalize: strip any non-digits
      let destination = to.replace(/[^\d]/g, '').trim();

      // Try to parse structured confirmation, reschedule, or OTP message
      let templateParams: string[] = [];
      let ticketNumber = '';
      let isOtp = false;
      let isReschedule = false;

      const otpMatch = message.match(/\b\d{6}\b/);
      const otp = otpMatch ? otpMatch[0] : '';

      if (message.startsWith('RESCHEDULED|')) {
        isReschedule = true;
        const parts = message.split('|');
        const oldDateStr = parts[1] || '';
        const oldTimeRange = parts[2] || '';
        const newDateStr = parts[3] || '';
        const newTimeRange = parts[4] || '';
        ticketNumber = parts[5] || '';
        const customerName = parts[6] || 'Player';

        const formatDate = (d: string) => {
          try {
            return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          } catch {
            return d;
          }
        };

        // Matches the 6-placeholder agnelarena_reschedule template:
        // {{1}} name, {{2}} old date, {{3}} old time, {{4}} new date,
        // {{5}} new time, {{6}} new ticket number.
        templateParams = [customerName, formatDate(oldDateStr), oldTimeRange, formatDate(newDateStr), newTimeRange, ticketNumber];
      } else if (message.startsWith('CONFIRMED|')) {
        const parts = message.split('|');
        const dateStr = parts[1] || '';
        const timeRange = parts[2] || '';
        ticketNumber = parts[3] || '';
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

        // Template reads "Hi {{1}} your booking ... on {{2}} from {{3}} to
        // {{4}} is confirmed!" — these four values were already parsed out
        // above but were never actually used here; the literal string
        // '$FirstName' was being sent as all four params, which AiSensy
        // interpreted as an unresolved contact-attribute reference and
        // rendered as "UNKNOWN" for every slot.
        templateParams = [customerName, formattedDate, startTime, endTime];
      } else if (otp) {
        isOtp = true;
        templateParams = [otp];
      } else {
        templateParams = [message, message, message, message];
      }

      // Try to extract dynamic ticket number if present (starts with TKT-)
      if (!ticketNumber && !isOtp && !isReschedule) {
        const ticketMatch = message.match(/\bTKT-[A-Z0-9-]+\b/i);
        ticketNumber = ticketMatch ? ticketMatch[0] : '';
      }

      const appUrl = options?.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://agnelarenagoa.com';
      const pdfUrl = ticketNumber
        ? `${appUrl}/api/ticket/${ticketNumber}.pdf?token=${generateTicketDownloadToken(ticketNumber)}`
        : "https://d3jt6ku4g6z5l8.cloudfront.net/FILE/6353da2e153a147b991dd812/4079142_dummy.pdf";

      // The booking-confirmation template name is env-driven so a template
      // swap (e.g. moving to a new Document-type template with a dynamic
      // {{1}} URL button) is a config change, not a code deploy. Whether to
      // send the button's `parameters` is tied to that same env var: the
      // currently-approved default template's URL button is registered
      // static (no {{1}}) and rejects a `parameters` array outright, so
      // only opt into sending one once AISENSY_CAMPAIGN_NAME_BOOKING is
      // explicitly set to a template that was actually approved with a
      // dynamic button.
      const bookingCampaignName = process.env.AISENSY_CAMPAIGN_NAME_BOOKING || 'agnelarena_cofirm';
      const rescheduleCampaignName = process.env.AISENSY_CAMPAIGN_NAME_RESCHEDULE || 'agnelarena_reschedule';
      const useDynamicButton = Boolean(process.env.AISENSY_CAMPAIGN_NAME_BOOKING) && !isOtp && !isReschedule;

      const payload: any = {
        apiKey: this.apiKey,
        campaignName: isOtp
          ? (process.env.AISENSY_CAMPAIGN_NAME_OTP || 'agnel_arena_otp')
          : isReschedule
            ? rescheduleCampaignName
            : bookingCampaignName,
        destination: destination,
        userName: this.userName,
        templateParams: templateParams,
        source: this.source,
        media: (isOtp || isReschedule) ? {} : {
          url: pdfUrl,
          filename: ticketNumber ? `ticket-${ticketNumber}.pdf` : "booking_confirmation.pdf"
        },
        // Button 1 ("Verify Booking") carries the ticket number as its
        // dynamic suffix. Button 2 ("How to Reach Us") is registered with a
        // static Google Maps search URL prefix
        // (https://www.google.com/maps/search/?api=1&query={{1}}) and the
        // arena's address as its dynamic suffix — WhatsApp/Meta only allows
        // appending a dynamic value onto a fixed, template-registered URL
        // prefix, not swapping in an arbitrary URL, so this always resolves
        // via a Maps text search rather than depending on the arena's own
        // (possibly short-link) gmaps_link field, which wouldn't fit that
        // static-prefix model.
        // agnel_arena_otp's own URL button is registered dynamic (it needs
        // a {{1}} parameter — the opposite of the booking-confirmation
        // template's static one) confirmed by AiSensy's rejection:
        // "Button at index 0 of type Url requires a parameter" when we sent
        // an empty buttons array. Standard WhatsApp OTP-template pattern:
        // an "Autofill"/"Copy Code" button whose parameter is the OTP
        // itself (already in templateParams for the message body too).
        buttons: isOtp
          ? [
              {
                type: "button",
                sub_type: "url",
                index: 0,
                parameters: [{ type: "text", text: otp }],
              },
            ]
          : isReschedule
            ? (Boolean(process.env.AISENSY_CAMPAIGN_NAME_RESCHEDULE)
                ? [
                    {
                      type: "button",
                      sub_type: "url",
                      index: 0,
                      parameters: [{ type: "text", text: ticketNumber || 'N/A' }],
                    },
                  ]
                : [])
          : useDynamicButton
            ? [
                {
                  type: "button",
                  sub_type: "url",
                  index: 0,
                  parameters: [{ type: "text", text: ticketNumber || 'N/A' }],
                },
                ...(options?.arenaAddress
                  ? [
                      {
                        type: "button",
                        sub_type: "url",
                        index: 1,
                        parameters: [{ type: "text", text: encodeURIComponent(options.arenaAddress) }],
                      },
                    ]
                  : []),
              ]
            : [],
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
        signal: AbortSignal.timeout(5000), // 5s timeout to fail fast on network degradation
      });

      if (!response.ok) {
        const errText = await response.text();
        const errMsg = `[AiSensyProvider] Failed to send WhatsApp message: ${response.status} - ${errText} | destination=${destination} | campaign=${isOtp ? (process.env.AISENSY_CAMPAIGN_NAME_OTP || 'agnel_arena_otp') : isReschedule ? rescheduleCampaignName : bookingCampaignName} | templateParams=${JSON.stringify(templateParams)}`;
        console.error(errMsg);
        logToPublic(errMsg);
        return false;
      }
      
      const resData = await response.json();
      console.info(`[AiSensyProvider] Message sent successfully to ${to}. Response:`, resData);
      logToPublic(`[AiSensyProvider] Message sent successfully to ${to}. Response: ${JSON.stringify(resData)}`);
      return true;
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError' || err?.code === 'UND_ERR_CONNECT_TIMEOUT' || String(err?.message).includes('timeout');
      const errDetail = isTimeout ? 'Network timeout connecting to AiSensy API endpoint (3.6.154.237:443)' : (err?.message || String(err));
      console.error(`[AiSensyProvider] Error sending WhatsApp message: ${errDetail}`);
      logToPublic(`[AiSensyProvider] Error sending WhatsApp message: ${errDetail}`);

      // In development or when offline, log explicit fallback notice so dev can use printed OTP
      console.info(`[SMS AISENSY FALLBACK MOCK] Destination: ${to} | OTP/Message: ${message}`);
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
