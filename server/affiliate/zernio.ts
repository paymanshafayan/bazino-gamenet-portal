/**
 * کلاینت Zernio — پورتال به Meta وصل نمی‌شود؛ فقط فرمان PR/DM به عامل.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { IgOutbound } from './igEngine';

const BASE = (process.env.ZERNIO_BASE_URL || 'https://zernio.com/api').replace(/\/$/, '');

export function zernioConfigured(): boolean {
  return !!process.env.ZERNIO_API_KEY && !!process.env.ZERNIO_IG_ACCOUNT_ID;
}

export function verifyZernioSignature(rawBody: Buffer | string, header: string | undefined): boolean {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET || '';
  if (!secret) return process.env.NODE_ENV !== 'production';
  const got = String(header || '').trim().replace(/^sha256=/i, '');
  if (!/^[a-f0-9]{32,128}$/i.test(got)) return false;
  const expect = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(got, 'hex');
  const b = Buffer.from(expect, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function zernioFetch(path: string, init: RequestInit): Promise<any> {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) throw Object.assign(new Error('ZERNIO_UNCONFIGURED'), { statusCode: 503, code: 'ZERNIO_UNCONFIGURED' });
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `ZERNIO_${res.status}`), { statusCode: 502, code: 'ZERNIO_ERROR', detail: json });
  return json;
}

export async function dispatchIgOutbound(out: IgOutbound, platformPostId: string): Promise<{ sent: boolean; skipped?: string }> {
  if (!zernioConfigured()) return { sent: false, skipped: 'unconfigured' };
  const accountId = process.env.ZERNIO_IG_ACCOUNT_ID!;
  if (out.kind === 'private_reply') {
    const commentId = out.commentId || '';
    await zernioFetch(`/v1/inbox/comments/${encodeURIComponent(platformPostId)}/${encodeURIComponent(commentId)}/private-reply`, {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        message: out.text,
        buttons: out.buttons.slice(0, 3).map(b => ({ type: 'postback', title: b.title.slice(0, 20), payload: b.payload })),
      }),
    });
    return { sent: true };
  }
  await zernioFetch('/v1/inbox/messages', {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      recipientId: out.igUserId,
      message: out.text,
      buttons: out.buttons.slice(0, 3),
    }),
  });
  return { sent: true };
}

export async function zernioFollowStatus(igUserId: string): Promise<boolean | null> {
  if (!zernioConfigured() || !igUserId) return null;
  try {
    const accountId = process.env.ZERNIO_IG_ACCOUNT_ID!;
    const json = await zernioFetch(`/v1/accounts/${encodeURIComponent(accountId)}/follow-status/${encodeURIComponent(igUserId)}`, { method: 'GET' });
    if (json?.isFollower === true || json?.follower === true || json?.status === 'follower') return true;
    if (json?.isFollower === false || json?.status === 'non_follower') return false;
    return null;
  } catch {
    return null;
  }
}
