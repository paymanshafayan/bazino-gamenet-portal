/**
 * Batch 12 — bulk marketing messaging over the Messaggio multichannel gateway
 * (SMS / WhatsApp / Viber).
 *
 * Secrets (env, set in the host; never in git or the public settings API):
 *   MESSAGGIO_PROJECT_LOGIN   — bulk login, sent as the `Messaggio-Login` header (required)
 *   MESSAGGIO_SENDE_CODE      — SMS sender API code        (sms.from)
 *   MESSAGGIO_VIBER_CODE      — Viber sender API code      (viber.from)
 *   MESSAGGIO_WHATSAPP_CODE   — WhatsApp sender API code   (whatsapp.from)
 *
 * When a channel's credentials/sender code are missing, that channel runs in the
 * simulator (no network call, deterministic fake message ids) so the panel flow can
 * be tested without live credentials — mirroring the Manus adapter convention.
 */
import type express from 'express';
import { OpsCore, endpoint, fail, newId, nowISO, stringValue } from './core';

type Channel = 'sms' | 'viber' | 'whatsapp';
const CHANNELS: Channel[] = ['sms', 'viber', 'whatsapp'];

export interface ChannelResult { channel: Channel; ok: boolean; sent: number; simulated: boolean; error?: string; providerIds?: string[]; }
export interface CampaignRow {
  id: string; createdAt: string; actor: string; channels: Channel[]; recipientCount: number;
  smsText?: string; viberText?: string; whatsappTemplate?: string;
  results: ChannelResult[]; simulated: boolean; phones: string[];
}

const MESSAGGIO_URL = 'https://msg.messaggio.com/api/v1/send';

/** Phone → Messaggio digits form (country code, no "+" or spaces). */
export function normalizePhone(p: string): string {
  return String(p || '').replace(/\D/g, '');
}
export function dedupePhones(list: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const raw of list) { const p = normalizePhone(raw); if (p.length >= 8 && !seen.has(p)) { seen.add(p); out.push(p); } }
  return out;
}

/** Build the per-channel `from` sender code for a channel (env or settings override). */
function senderCodeFor(channel: Channel, settings: Record<string, string>): string {
  if (channel === 'sms') return settings.messaggio_sende_code || process.env.MESSAGGIO_SENDE_CODE || '';
  if (channel === 'viber') return settings.messaggio_viber_code || process.env.MESSAGGIO_VIBER_CODE || '';
  return settings.messaggio_whatsapp_code || process.env.MESSAGGIO_WHATSAPP_CODE || '';
}

export class MessagingService {
  constructor(public core: OpsCore) {}

  /** Config summary for the panel (never exposes secret values, only set/missing). */
  async config() {
    const s = await this.settings();
    const login = s.messaggio_project_login || process.env.MESSAGGIO_PROJECT_LOGIN || '';
    const ch = (c: Channel) => ({ code: senderCodeFor(c, s) ? true : false, available: !!login && !!senderCodeFor(c, s) });
    return { login: !!login, sms: ch('sms'), viber: ch('viber'), whatsapp: ch('whatsapp') };
  }

  private async settings(): Promise<Record<string, string>> {
    const g = async (k: string) => { try { return (await this.core.store.getSetting(k)) || ''; } catch { return ''; } };
    return {
      messaggio_project_login: await g('messaggio_project_login'),
      messaggio_sende_code: await g('messaggio_sende_code'),
      messaggio_viber_code: await g('messaggio_viber_code'),
      messaggio_whatsapp_code: await g('messaggio_whatsapp_code'),
    };
  }

  /** All verified phones we hold (users who logged in via OTP / verified their number). */
  async audiencePhones(): Promise<string[]> {
    const users = await this.core.store.listUsers();
    return dedupePhones(users.map(u => u.phone || '').filter(Boolean));
  }

  /** One Messaggio send for a single channel; returns the raw parsed response. */
  private async callMessaggio(login: string, body: any): Promise<{ ok: boolean; error?: string; ids: string[] }> {
    try {
      const res = await fetch(MESSAGGIO_URL, {
        method: 'POST',
        headers: { 'Messaggio-Login': login, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const raw: any = await res.json().catch(() => ({}));
      if (!res.ok || raw?.success === false || (raw?.status && /error|fail|denied|invalid/i.test(String(raw.status)))) {
        return { ok: false, error: raw?.message || raw?.error || raw?.description || `HTTP ${res.status}`, ids: [] };
      }
      const ids: string[] = [];
      const collect = (x: any) => { if (!x) return; if (x.message_id || x.id) ids.push(String(x.message_id || x.id)); if (Array.isArray(x.messages)) x.messages.forEach(collect); if (Array.isArray(x.result)) x.result.forEach(collect); };
      collect(raw);
      return { ok: true, ids };
    } catch (e: any) { return { ok: false, error: e?.message || String(e), ids: [] }; }
  }

  /** Build the channel content block per Messaggio schema. */
  private channelBlock(channel: Channel, from: string, c: CampaignInput): any {
    if (channel === 'sms') return { sms: { from, content: [{ type: 'text', text: c.smsText || '' }] } };
    if (channel === 'viber') return { viber: { from, content: [{ type: 'text', text: c.viberText || c.smsText || '' }] } };
    // WhatsApp outside a 24h session needs a pre-registered template; send template if given.
    if (c.whatsappTemplateId) {
      return { whatsapp: { from, content: [{ type: 'template', template: { language: c.whatsappLang || 'en', id: c.whatsappTemplateId, body: { parameters: (c.whatsappParams || []).map((t: string) => ({ text: t })) } } }] } };
    }
    return { whatsapp: { from, content: [{ type: 'text', text: c.whatsappText || c.viberText || c.smsText || '' }] } };
  }

  /**
   * Send a bulk campaign over the chosen channels. Channels without live credentials
   * are simulated. The whole campaign is recorded as a `messaging-campaign` OpsRecord.
   */
  async sendCampaign(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `campaign-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'messaging-send', b, async () => {
      const channels: Channel[] = (Array.isArray(b.channels) ? b.channels : []).filter((c: string) => CHANNELS.includes(c as Channel)) as Channel[];
      if (!channels.length) fail('INVALID_CHANNELS', 400);
      const useAudience = !!b.useAudience;
      const manual = Array.isArray(b.phones) ? b.phones : [];
      const audience = useAudience ? await this.audiencePhones() : [];
      const phones = dedupePhones([...manual, ...audience]);
      if (!phones.length) fail('NO_RECIPIENTS', 400);
      if (channels.includes('sms') && !stringValue(b.smsText, 2000)) fail('SMS_TEXT_REQUIRED', 400);
      if (channels.includes('viber') && !stringValue(b.viberText || b.smsText, 2000)) fail('VIBER_TEXT_REQUIRED', 400);

      const s = await this.settings();
      const login = s.messaggio_project_login || process.env.MESSAGGIO_PROJECT_LOGIN || '';
      const recipients = phones.map(p => ({ phone: p }));
      const results: ChannelResult[] = [];

      for (const channel of channels) {
        const from = senderCodeFor(channel, s);
        const input: CampaignInput = {
          smsText: b.smsText, viberText: b.viberText, whatsappText: b.whatsappText,
          whatsappTemplateId: b.whatsappTemplateId, whatsappLang: b.whatsappLang, whatsappParams: b.whatsappParams,
        };
        const simulated = !login || !from;
        if (simulated) {
          results.push({ channel, ok: true, sent: phones.length, simulated: true, providerIds: phones.map((_, i) => `sim-${channel}-${i + 1}`) });
          continue;
        }
        const body = { recipients, channels: [channel], ...this.channelBlock(channel, from, input) };
        const r = await this.callMessaggio(login, body);
        if (!r.ok) { results.push({ channel, ok: false, sent: 0, simulated: false, error: r.error }); continue; }
        results.push({ channel, ok: true, sent: phones.length, simulated: false, providerIds: r.ids });
      }

      const row: CampaignRow = {
        id: newId('MSG'), createdAt: nowISO(), actor, channels, recipientCount: phones.length,
        smsText: b.smsText, viberText: b.viberText, whatsappTemplate: b.whatsappTemplateId,
        results, simulated: results.every(r => r.simulated), phones,
      };
      await this.core.save('messaging-campaign', row.id, row, 0);
      return { campaign: row };
    });
  }

  async listCampaigns(): Promise<CampaignRow[]> {
    const recs = await this.core.list<CampaignRow>('messaging-campaign');
    return recs.map(r => r.data).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /** Audience preview for the panel (count + masked sample). */
  async audiencePreview() {
    const phones = await this.audiencePhones();
    const mask = (p: string) => p.length > 4 ? `${p.slice(0, 3)}***${p.slice(-2)}` : '***';
    return { count: phones.length, sample: phones.slice(0, 20).map(mask) };
  }
}

interface CampaignInput {
  smsText?: string; viberText?: string; whatsappText?: string;
  whatsappTemplateId?: string; whatsappLang?: string; whatsappParams?: string[];
}

// ─── Routes ─────────────────────────────────────────────────────────────────
export function registerMessagingRoutes(app: express.Express, service: MessagingService) {
  const base = '/api/management/messaging';
  app.get(`${base}/config`, service.core.guard('promotions'), endpoint(async (_req, res) => res.json(await service.config())));
  app.get(`${base}/audience`, service.core.guard('promotions'), endpoint(async (_req, res) => res.json(await service.audiencePreview())));
  app.get(`${base}/campaigns`, service.core.guard('promotions'), endpoint(async (_req, res) => res.json(await service.listCampaigns())));
  app.post(`${base}/send`, service.core.guard('promotions'), endpoint(async (req, res) => res.json(await service.sendCampaign((req as any).staff.username, { ...(req.body || {}) }))));
}
