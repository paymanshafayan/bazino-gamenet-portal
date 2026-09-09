/**
 * Telegram Gateway HTTP client — portal side (Express).
 * The portal signs every send command (HMAC-SHA256 over raw JSON bytes);
 * the Python gateway verifies with the same scheme (see telegram-gateway/ in B2).
 * No express/DB imports here so unit tests stay dependency-free.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TG_SIGNATURE_HEADER = 'x-portal-signature';

export function signCommand(secret: string, rawBody: string | Buffer): string {
  return createHmac('sha256', String(secret || '')).update(rawBody).digest('hex');
}

/** Mirror of the gateway-side verifier (same rules as the Zernio HMAC verifier). */
export function verifyCommandSignature(raw: Buffer, signature: string, secret: string): boolean {
  const sig = String(signature || '').replace(/^sha256=/i, '');
  if (!secret || !/^[\x00-\x7F]+$/.test(sig) || !/^([a-f\d]{64})$/i.test(sig)) return false;
  const a = Buffer.from(sig, 'hex');
  const b = createHmac('sha256', secret).update(raw).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface TgGatewayConfig {
  baseUrl: string;
  bearer: string;
  hmacSecret: string;
  timeoutMs: number;
}

/** null = gateway not configured → portal stays readonly (health: unreachable). */
export function readGatewayConfig(env: NodeJS.ProcessEnv = process.env): TgGatewayConfig | null {
  const baseUrl = String(env.TG_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  const bearer = String(env.TG_GATEWAY_BEARER || '').trim();
  const hmacSecret = String(env.TG_GATEWAY_HMAC_SECRET || '').trim();
  if (!baseUrl || !bearer || !hmacSecret) return null;
  return { baseUrl, bearer, hmacSecret, timeoutMs: 8000 };
}

export interface TgSendCommand {
  request_id: string;
  draft_id: string;
  dialog_id: string;
  message: string;
  idempotency_key: string;
  expires_at: string;
}

export interface TgSendResult {
  request_id: string;
  draft_id?: string;
  status: 'sent' | 'failed';
  telegram_message_id?: string;
  sent_at?: string;
  error_code?: string;
  retryable?: boolean;
}

type FetchImpl = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export class TelegramGatewayClient {
  constructor(public cfg: TgGatewayConfig, private fetchImpl: FetchImpl = fetch as any) {}

  private async call(path: string, init?: any): Promise<any> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs);
    try {
      const res = await this.fetchImpl(this.cfg.baseUrl + path, {
        ...init,
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.bearer}`, ...(init?.headers || {}) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(`Gateway ${path}: ${res.status}`), { code: 'GATEWAY_ERROR', statusCode: 502 });
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  health() { return this.call('/internal/health'); }
  dialogs(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.call('/internal/dialogs' + (q ? `?${q}` : ''));
  }
  permissions(dialogId: string) { return this.call(`/internal/dialogs/${encodeURIComponent(dialogId)}/permissions`); }
  search(dialogId: string, params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.call(`/internal/dialogs/${encodeURIComponent(dialogId)}/messages/search` + (q ? `?${q}` : ''));
  }

  async send(cmd: TgSendCommand): Promise<TgSendResult> {
    const raw = JSON.stringify(cmd);
    const sig = signCommand(this.cfg.hmacSecret, raw);
    return this.call('/internal/send', {
      method: 'POST',
      body: raw,
      headers: { [TG_SIGNATURE_HEADER]: `sha256=${sig}` },
    });
  }
}

/**
 * In-memory mock for unit tests. Records every call; performs zero network I/O,
 * so tests can prove "no live send" (plan test 10).
 */
export class MockTelegramGateway {
  calls: Array<{ path: string; body?: any }> = [];
  dialogsData: any[] = [
    { dialog_id: '-100111', title: 'Gamers Hub', username: 'gamershub', type: 'supergroup', is_member: true, is_admin: false, can_send: true, can_send_media: true, language: 'en', last_checked_at: '2026-09-09T00:00:00.000Z' },
    { dialog_id: '-100222', title: 'Bazino Channel', username: 'bazinopro', type: 'channel', is_member: true, is_admin: true, can_send: true, can_send_media: true, language: 'fa', last_checked_at: '2026-09-09T00:00:00.000Z' },
  ];
  permissionsData: Record<string, any> = {
    '-100111': { dialog_id: '-100111', is_member: true, is_admin: false, can_send: true, can_send_media: true, checked_at: '2026-09-09T00:00:00.000Z' },
    '-100222': { dialog_id: '-100222', is_member: true, is_admin: true, can_send: true, can_send_media: true, checked_at: '2026-09-09T00:00:00.000Z' },
  };
  failNextSendWith: any = null;

  async health() { this.calls.push({ path: '/internal/health' }); return { ok: true, service: 'tg-gateway-mock' }; }
  async dialogs() { this.calls.push({ path: '/internal/dialogs' }); return { items: this.dialogsData }; }
  async permissions(id: string) {
    this.calls.push({ path: `/internal/dialogs/${id}/permissions` });
    return this.permissionsData[id] || { dialog_id: id, is_member: false, is_admin: false, can_send: false, can_send_media: false, checked_at: new Date().toISOString() };
  }
  async search(id: string, params: Record<string, string> = {}) {
    this.calls.push({ path: `/internal/dialogs/${id}/messages/search`, body: params });
    return { dialog_id: id, items: [{ message_id: '12345', date: '2026-09-08T20:00:00.000Z', keyword: 'PS5', text: 'Anyone up for PS5 tonight?' }] };
  }
  async send(cmd: TgSendCommand): Promise<TgSendResult> {
    this.calls.push({ path: '/internal/send', body: cmd });
    if (this.failNextSendWith) {
      const e = this.failNextSendWith; this.failNextSendWith = null;
      return { request_id: cmd.request_id, draft_id: cmd.draft_id, status: 'failed', ...e };
    }
    return { request_id: cmd.request_id, draft_id: cmd.draft_id, status: 'sent', telegram_message_id: '67890', sent_at: new Date().toISOString() };
  }
  sentCommands() { return this.calls.filter(c => c.path === '/internal/send').map(c => c.body); }
  reset() { this.calls = []; this.failNextSendWith = null; }
}
