/**
 * SMS provider abstraction for Bazino.
 * Select a driver with env SMS_PROVIDER = smsto | easysendsms | mock (default: mock).
 * See docs/sms/SMS-PROVIDERS.md
 */
export interface SmsSendResult { ok: boolean; providerMessageId?: string; error?: string; raw?: unknown }
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<SmsSendResult>;
}

const senderId = () => (process.env.SMS_SENDER_ID || 'Bazino').slice(0, 11);

// ---------- SMS.to (https://developers.sms.to) ----------
class SmsToProvider implements SmsProvider {
  readonly name = 'smsto';
  constructor(private apiKey: string) {}
  async send(to: string, message: string): Promise<SmsSendResult> {
    try {
      const res = await fetch('https://api.sms.to/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message, to, sender_id: senderId(), bypass_optout: true }),
      });
      const raw: any = await res.json().catch(() => ({}));
      if (!res.ok || raw?.success === false) return { ok: false, error: raw?.message || `HTTP ${res.status}`, raw };
      return { ok: true, providerMessageId: raw?.message_id || raw?.id, raw };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  }
}

// ---------- EasySendSMS (https://github.com/EasySendSMS/REST-API-v1) ----------
class EasySendSmsProvider implements SmsProvider {
  readonly name = 'easysendsms';
  constructor(private apiKey: string) {}
  async send(to: string, message: string): Promise<SmsSendResult> {
    try {
      const unicode = /[^\x00-\x7F]/.test(message);
      const res = await fetch('https://restapi.easysendsms.app/v1/rest/sms/send', {
        method: 'POST',
        headers: { apikey: this.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ from: senderId(), to: to.replace(/^\+/, ''), text: message, type: unicode ? '1' : '0' }),
      });
      const raw: any = await res.json().catch(() => ({}));
      if (!res.ok || (raw?.status && String(raw.status).toUpperCase() !== 'OK')) return { ok: false, error: raw?.description || raw?.error || `HTTP ${res.status}`, raw };
      return { ok: true, providerMessageId: raw?.messageIds?.[0], raw };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  }
}

// ---------- Messaggio (https://messaggio.com/api-docs/) ----------
// Multichannel gateway; for SMS we POST to /api/v1/send with the bulk login in the
// `Messaggio-Login` header and the per-sender "API code" as `sms.from`.
// Secrets (env, set in the host): MESSAGGIO_PROJECT_LOGIN, MESSAGGIO_SENDE_CODE.
export class MessaggioProvider implements SmsProvider {
  readonly name = 'messaggio';
  constructor(private login: string, private senderCode: string) {}
  async send(to: string, message: string): Promise<SmsSendResult> {
    try {
      // Messaggio examples use digits with country code and no leading "+".
      const phone = to.replace(/\D/g, '');
      const res = await fetch('https://msg.messaggio.com/api/v1/send', {
        method: 'POST',
        headers: {
          'Messaggio-Login': this.login,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          recipients: [{ phone }],
          channels: ['sms'],
          sms: { from: this.senderCode, content: [{ type: 'text', text: message }] },
        }),
      });
      const raw: any = await res.json().catch(() => ({}));
      if (!res.ok || raw?.success === false || (raw?.status && /error|fail|denied|invalid/i.test(String(raw.status)))) {
        return { ok: false, error: raw?.message || raw?.error || raw?.description || `HTTP ${res.status}`, raw };
      }
      const id = raw?.message_id || raw?.id || raw?.response?.message_id
        || (Array.isArray(raw?.messages) ? raw.messages[0]?.id : undefined)
        || raw?.result?.[0]?.message_id;
      return { ok: true, providerMessageId: id ? String(id) : undefined, raw };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  }
}

// ---------- Mock (development / tests) ----------
export interface MockSmsEntry { to: string; message: string; at: string }
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  readonly outbox: MockSmsEntry[] = [];
  async send(to: string, message: string): Promise<SmsSendResult> {
    const entry = { to, message, at: new Date().toISOString() };
    this.outbox.push(entry);
    if (this.outbox.length > 200) this.outbox.shift();
    if (process.env.NODE_ENV !== 'test') console.log(`[sms:mock] → ${to}: ${message}`);
    return { ok: true, providerMessageId: `mock-${this.outbox.length}` };
  }
  lastFor(to: string) { for (let i = this.outbox.length - 1; i >= 0; i--) if (this.outbox[i].to === to) return this.outbox[i]; return undefined; }
}

let instance: SmsProvider | null = null;
export function getSmsProvider(): SmsProvider {
  if (instance) return instance;
  const kind = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  if (kind === 'smsto') {
    if (!process.env.SMSTO_API_KEY) throw new Error('SMS_PROVIDER=smsto requires SMSTO_API_KEY');
    instance = new SmsToProvider(process.env.SMSTO_API_KEY);
  } else if (kind === 'easysendsms') {
    if (!process.env.EASYSENDSMS_API_KEY) throw new Error('SMS_PROVIDER=easysendsms requires EASYSENDSMS_API_KEY');
    instance = new EasySendSmsProvider(process.env.EASYSENDSMS_API_KEY);
  } else if (kind === 'messaggio') {
    if (!process.env.MESSAGGIO_PROJECT_LOGIN) throw new Error('SMS_PROVIDER=messaggio requires MESSAGGIO_PROJECT_LOGIN');
    if (!process.env.MESSAGGIO_SENDE_CODE) throw new Error('SMS_PROVIDER=messaggio requires MESSAGGIO_SENDE_CODE (sender API code)');
    instance = new MessaggioProvider(process.env.MESSAGGIO_PROJECT_LOGIN, process.env.MESSAGGIO_SENDE_CODE);
  } else {
    if (kind !== 'mock') console.warn(`[sms] unknown SMS_PROVIDER "${kind}", falling back to mock`);
    instance = new MockSmsProvider();
  }
  return instance;
}
export const isMockSms = () => getSmsProvider() instanceof MockSmsProvider;
