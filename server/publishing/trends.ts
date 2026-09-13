import { OpsCore, nowISO } from '../management/core';
import { PublishingSettings } from './settings';
import type { TrendDigest } from '../../shared/publishing/types';

/* ─────────────────────────────────────────────────────────────────────────────
 * دایجست ترند روزانه (فاز ۲ — گام ۱: «چشم سیستم»)
 * YouTube Data API v3 (chart=mostPopular، دستهٔ Gaming، منطقهٔ CY/TR — هر
 * فراخوانی فقط ۱ واحد از سهمیهٔ رایگان ۱۰٬۰۰۰ واحد/روز) + Twitch Helix
 * (getTopGames — کاملاً رایگان). خروجی: رکورد pub-trend-digest با id=تاریخ.
 * بدون کلیدها سرویس ساکت است و بقیهٔ سیستم کار می‌کند؛ خطای شبکه حداقل
 * ۱ ساعت بعد دوباره امتحان می‌شود (بک‌آف در حافظه).
 * ───────────────────────────────────────────────────────────────────────────── */

const YT_BASE = 'https://www.googleapis.com/youtube/v3/videos';
const TWITCH_TOKEN = 'https://id.twitch.tv/oauth2/token';
const TWITCH_TOP = 'https://api.twitch.tv/helix/games/top';
const RETRY_BACKOFF_MS = 3600000;

export class TrendService {
  settings: PublishingSettings;
  private lastAttempt = 0;
  constructor(public core: OpsCore, public fetcher: typeof fetch = fetch) {
    this.settings = new PublishingSettings(core);
  }

  private async ytKey(): Promise<string> { return (await this.settings.vault.zernio('youtube_api_key')) || ''; }
  private async twitchCreds(): Promise<{ id: string; secret: string } | null> {
    const id = (await this.settings.vault.zernio('twitch_client_id')) || '';
    const secret = (await this.settings.vault.zernio('twitch_client_secret')) || '';
    return id && secret ? { id, secret } : null;
  }

  /** در حلقهٔ ۴ ثانیه‌ای صدا می‌شود؛ روزی یک‌بار دایجست می‌سازد. */
  async work() {
    const today = nowISO().slice(0, 10);
    if (await this.core.read('pub-trend-digest', today)) return;
    if (Date.now() - this.lastAttempt < RETRY_BACKOFF_MS) return;
    this.lastAttempt = Date.now();
    const yt = await this.fetchYoutube().catch(() => null);
    const tw = await this.fetchTwitch().catch(() => null);
    if (yt === null && tw === null) return; // هیچ منبعی تنظیم/در دسترس نیست
    const digest: TrendDigest = {
      date: today,
      youtube: (yt || []).slice(0, 10),
      twitch: (tw || []).slice(0, 10),
      createdAt: nowISO(),
    };
    await this.core.save('pub-trend-digest', today, digest, 0);
  }

  private async fetchYoutube(): Promise<TrendDigest['youtube'] | null> {
    const key = await this.ytKey();
    if (!key) return null;
    const out: TrendDigest['youtube'] = [];
    for (const region of ['CY', 'TR']) {
      // دستهٔ ۲۰ = Gaming؛ اگر چارت دسته برای منطقه خالی بود، بدون دسته (عمومی)
      for (const withCategory of [true, false]) {
        const url = `${YT_BASE}?part=snippet,statistics&chart=mostPopular&maxResults=8&regionCode=${region}&key=${encodeURIComponent(key)}`
          + (withCategory ? '&videoCategoryId=20' : '');
        const res = await this.fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
        if (!res.ok) throw new Error(`YOUTUBE_HTTP_${res.status}`);
        const data: any = await res.json();
        const items: any[] = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) continue;
        for (const it of items.slice(0, 5)) {
          out.push({
            title: String(it?.snippet?.title || '').slice(0, 200),
            channel: String(it?.snippet?.channelTitle || '').slice(0, 120),
            views: Number(it?.statistics?.viewCount || 0),
          });
        }
        break;
      }
    }
    return out;
  }

  private async fetchTwitch(): Promise<TrendDigest['twitch'] | null> {
    const creds = await this.twitchCreds();
    if (!creds) return null;
    const tokenRes = await this.fetcher(`${TWITCH_TOKEN}?client_id=${encodeURIComponent(creds.id)}&client_secret=${encodeURIComponent(creds.secret)}&grant_type=client_credentials`, {
      method: 'POST', signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!tokenRes.ok) throw new Error(`TWITCH_TOKEN_HTTP_${tokenRes.status}`);
    const tokenData: any = await tokenRes.json();
    const topRes = await this.fetcher(`${TWITCH_TOP}?first=10`, {
      headers: { 'Client-Id': creds.id, Authorization: `Bearer ${String(tokenData?.access_token || '')}` },
      signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!topRes.ok) throw new Error(`TWITCH_HTTP_${topRes.status}`);
    const top: any = await topRes.json();
    return (Array.isArray(top?.data) ? top.data : []).map((g: any) => ({
      name: String(g?.name || '').slice(0, 120),
      viewers: Number(g?.viewers || g?.popularity || 0),
    }));
  }

  async latest(): Promise<TrendDigest | null> {
    const rows = await this.core.list<TrendDigest>('pub-trend-digest');
    if (!rows.length) return null;
    return rows.map(r => r.data).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  }
}
