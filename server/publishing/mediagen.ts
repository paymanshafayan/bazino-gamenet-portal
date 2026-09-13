import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { OpsCore, fail, nowISO, fingerprint } from '../management/core';
import { AssetLibrary, MAX_IMAGE_BYTES } from './assets';
import { PublishingSettings } from './settings';
import { PublishingService } from './publish';
import { SOCIAL_LANGUAGES, type MediaGenProvider, type MediaGenTask, type SocialLanguage } from '../../shared/publishing/types';

/* ─────────────────────────────────────────────────────────────────────────────
 * تولید رسانهٔ بصری (فاز ۱ پلن ۲۰۲۶-۰۹-۱۳):
 *   Imejis.io  — قالب‌محور، متن دقیق به هر زبانی (۱۰۰ رندر/ماه روی پلن رایگان)
 *   Cloudflare Workers AI (FLUX.1-schnell) — تولید خام، ~۱۷۰ تصویر/روز رایگان
 * خروجی به‌صورت asset وارد کتابخانهٔ رسانه می‌شود و از آنجا فقط از طریق
 * pub-draft + تأیید انسانیِ موجود به انتشار می‌رسد — هرگز auto-publish نمی‌شود.
 * ───────────────────────────────────────────────────────────────────────────── */

export const IMEJIS_RENDER_BASE = 'https://render.imejis.io/v1/';
export const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
export const FLUX_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const RENDER_TIMEOUT = 90000;
const exec = promisify(execFile);

// ریلز $0 (provider ترکیب): ElevenLabs v3 + ffmpeg پرتال
export const ELEVENLABS_TTS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech/';
export const DEFAULT_TTS_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel — صدای از پیش ساختهٔ ElevenLabs
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const COMPOSE_TIMEOUT = 120000;

function subtitleFontFile(): string {
  const p = process.env.BAZINO_FONT_PATH || path.resolve(process.cwd(), 'server/publishing/fonts/Vazirmatn-Bold.ttf');
  if (!fs.existsSync(p)) fail('FONT_NOT_FOUND', 500);
  return p;
}

export class ProviderFailure extends Error {
  constructor(public code: string, public uncertain = false) { super(code); }
}
function safeCode(e: any): string {
  return typeof e?.code === 'string' && /^[A-Z0-9_]+$/.test(e.code) ? e.code : 'MEDIAGEN_ERROR';
}

export class MediaGenService {
  settings: PublishingSettings;
  assets: AssetLibrary;
  constructor(public core: OpsCore, public fetcher: typeof fetch = fetch, assets?: AssetLibrary, public publishing?: PublishingService) {
    this.settings = new PublishingSettings(core);
    this.assets = assets || new AssetLibrary(core);
    this.publishing = publishing || new PublishingService(core, fetcher, this.assets.root);
  }

  /* ── سکرت‌ها (env اول، بعد vault — همان الگوی Zernio) ── */
  private async imejisKey() { return (await this.settings.vault.zernio('imejis_api_key')) || ''; }
  private async cfToken() { return (await this.settings.vault.zernio('cloudflare_api_token')) || ''; }
  private async elevenKey() { return (await this.settings.vault.zernio('elevenlabs_api_key')) || ''; }
  private async cfAccountId(): Promise<string> {
    const direct = (await this.settings.vault.zernio('cloudflare_account_id')) || '';
    if (direct) return direct;
    // استخراج account id از zone id (CLOUDFLARE_ZONE_ID) — یک‌بار و کش در vault
    const zoneId = (await this.settings.vault.zernio('cloudflare_zone_id')) || '';
    const token = await this.cfToken();
    if (!zoneId || !token) return '';
    try {
      const r = await this.fetcher(`${CF_API_BASE}/zones/${encodeURIComponent(zoneId)}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      const d = await r.json() as any;
      const id = r.ok && d?.success === true ? String(d?.result?.account?.id || '') : '';
      if (id) { try { await this.settings.vault.set('cloudflare_account_id', id, 'system'); } catch { /* بدون master key: هر بار مشتق می‌شود */ } }
      return id;
    } catch { return ''; }
  }

  /* ── سهمیهٔ ماهانه (تقویم UTC) ── */
  private monthKey() { return new Date().toISOString().slice(0, 7); }
  async quota() {
    const cfg = (await this.settings.config()).data;
    const rows = (await this.core.list<MediaGenTask>('pub-mediagen-task'))
      .filter(r => r.data.status !== 'cancelled' && r.data.createdAt.startsWith(this.monthKey()));
    const used = (p: MediaGenProvider) => rows.filter(r => r.data.provider === p).length;
    return {
      month: this.monthKey(),
      imejis: { used: used('imejis'), limit: cfg.mediagenImejisLimit },
      flux: { used: used('flux'), limit: cfg.mediagenFluxLimit },
      compose: { used: used('compose'), limit: cfg.mediagenComposeLimit },
      enabled: cfg.mediagenEnabled,
    };
  }

  /* ── ثبت درخواست تولید ── */
  async generate(actor: string, b: any) {
    if (b.confirmedCost !== true) fail('COST_CONFIRMATION_REQUIRED');
    const cfg = (await this.settings.config()).data;
    if (!cfg.mediagenEnabled) fail('MEDIAGEN_DISABLED', 409);
    const provider = b.provider === 'flux' ? 'flux' : b.provider === 'imejis' ? 'imejis' : b.provider === 'compose' ? 'compose' : fail('PROVIDER_REQUIRED');
    const title = String(b.title || '').slice(0, 200).trim();
    if (!title) fail('TITLE_REQUIRED');
    const language = (SOCIAL_LANGUAGES as string[]).includes(b.language) ? b.language as SocialLanguage : fail('INVALID_LANGUAGE');
    let designId = '', fields: Record<string, string> = {}, prompt = '';
    let sourceAssetId = '', script = '', subtitle = '', voiceId = '', briefId = '';
    if (provider === 'imejis') {
      if (!await this.imejisKey()) fail('IMEJIS_NOT_CONFIGURED', 409);
      designId = String(b.designId || '').trim();
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(designId)) fail('INVALID_DESIGN_ID');
      if (!cfg.mediagenDesigns.includes(designId)) fail('DESIGN_NOT_ALLOWED', 409);
      const raw = b.fields;
      if (raw !== undefined && (typeof raw !== 'object' || Array.isArray(raw))) fail('INVALID_FIELDS');
      const entries = Object.entries(raw || {});
      if (entries.length > 30) fail('INVALID_FIELDS');
      for (const [k, v] of entries) {
        if (typeof k !== 'string' || k.length > 80 || typeof v !== 'string' || v.length > 500) fail('INVALID_FIELDS');
        fields[k] = v;
      }
    } else if (provider === 'flux') {
      if (!await this.cfToken()) fail('FLUX_NOT_CONFIGURED', 409);
      prompt = String(b.prompt || '').trim();
      if (prompt.length < 10 || prompt.length > 2000) fail('INVALID_PROMPT');
    } else {
      // compose: تصویر آمادهٔ برند + متن صدا + زیرنویس → ریلز mp4
      if (!await this.elevenKey()) fail('ELEVENLABS_NOT_CONFIGURED', 409);
      sourceAssetId = String(b.sourceAssetId || '').trim();
      if (!/^AS-[a-f0-9-]+$/i.test(sourceAssetId)) fail('INVALID_SOURCE_ASSET');
      const src = await this.assets.ready(sourceAssetId);
      if (src.data.owner !== actor) fail('FORBIDDEN', 403);
      if (!src.data.mime.startsWith('image/')) fail('IMAGE_REQUIRED');
      script = String(b.script || '').trim();
      if ([...script].length < 10 || [...script].length > 900) fail('INVALID_SCRIPT');
      subtitle = String(b.subtitle ?? '').replace(/\r/g, '').slice(0, 400);
      voiceId = String(b.voiceId || '').trim();
      if (voiceId && !/^[\w-]{1,64}$/.test(voiceId)) fail('INVALID_VOICE_ID');
      if (b.briefId !== undefined && b.briefId !== '') {
        const brief = await this.core.read('pub-brief', String(b.briefId));
        if (!brief) fail('BRIEF_NOT_FOUND', 404);
        if (brief.data.owner !== actor) fail('FORBIDDEN', 403);
        if (brief.data.status !== 'approved') fail('BRIEF_NOT_APPROVED', 409);
        briefId = brief.id;
      }
    }
    const q = await this.quota();
    if (provider === 'imejis' && q.imejis.used >= q.imejis.limit) fail('GENERATION_QUOTA_EXCEEDED', 429);
    if (provider === 'flux' && q.flux.used >= q.flux.limit) fail('GENERATION_QUOTA_EXCEEDED', 429);
    if (provider === 'compose' && q.compose.used >= q.compose.limit) fail('GENERATION_QUOTA_EXCEEDED', 429);
    const key = fingerprint({ actor, provider, designId, fields, prompt, title, language, sourceAssetId, script, subtitle, briefId });
    return this.core.store.runInTransaction(async () => {
      const prior = await this.core.read('pub-mediagen-task', key);
      if (prior) return { id: key, status: prior.data.status, duplicate: true };
      await this.core.save<MediaGenTask>('pub-mediagen-task', key, {
        provider, designId, fields, prompt, title, language, owner: actor,
        sourceAssetId: sourceAssetId || undefined, script: script || undefined,
        subtitle: subtitle || undefined, voiceId: voiceId || undefined, briefId: briefId || undefined,
        status: 'queued', createdAt: nowISO(),
      }, 0, `mediagen:${key}`);
      await this.core.audit(actor, 'mediagen.generate', key, { provider, designId: designId || undefined });
      return { id: key, status: 'queued', duplicate: false };
    });
  }

  /* ── پردازش صف (در حلقهٔ ۴ ثانیه‌ای publicationRoutes) ── */
  async work() {
    const cfg = (await this.settings.config()).data;
    if (!cfg.mediagenEnabled) return;
    const rows = (await this.core.list<MediaGenTask>('pub-mediagen-task'))
      .filter(r => r.data.status === 'queued' || (r.data.status === 'rendering' && Date.parse(r.data.leaseUntil || '') < Date.now() - 60000))
      .slice(0, 2);
    for (const row of rows) {
      const lease = randomUUID();
      const claimed = await this.core.store.runInTransaction(async () => {
        const r = await this.core.read<MediaGenTask>('pub-mediagen-task', row.id);
        if (!r || (r.data.status !== 'queued' && !(r.data.status === 'rendering' && Date.parse(r.data.leaseUntil || '') < Date.now() - 60000))) return false;
        await this.core.save('pub-mediagen-task', r.id, { ...r.data, status: 'rendering', leaseToken: lease, leaseUntil: new Date(Date.now() + RENDER_TIMEOUT).toISOString() }, r.version);
        return true;
      });
      if (!claimed) continue;
      let assetId = '', error = '';
      try {
        const bytes = row.data.provider === 'imejis'
          ? await this.renderImejis(row.data.designId, row.data.fields)
          : row.data.provider === 'compose'
            ? await this.renderCompose(row.data)
            : await this.renderFlux(row.data.prompt);
        assetId = await this.saveAsset(row.data, bytes.mime, bytes.data);
      } catch (e: any) {
        error = e instanceof ProviderFailure ? e.code : safeCode(e);
      }
      await this.core.store.runInTransaction(async () => {
        const r = await this.core.read<MediaGenTask>('pub-mediagen-task', row.id);
        if (!r || r.data.leaseToken !== lease) return;
        await this.core.save('pub-mediagen-task', r.id, {
          ...r.data, status: error ? 'failed' : 'completed', assetId: assetId || undefined,
          error: error || undefined, completedAt: nowISO(), leaseToken: undefined, leaseUntil: undefined,
        }, r.version);
      });
    }
  }

  private async renderImejis(designId: string, fields: Record<string, string>): Promise<{ data: Buffer; mime: 'image/jpeg' | 'image/png' }> {
    const key = await this.imejisKey();
    if (!key) fail('IMEJIS_NOT_CONFIGURED', 409);
    let res: Response;
    try {
      res = await this.fetcher(`${IMEJIS_RENDER_BASE}${encodeURIComponent(designId)}?format=jpeg&quality=92`, {
        method: 'POST',
        headers: { 'dma-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(fields || {}),
        signal: AbortSignal.timeout(RENDER_TIMEOUT), redirect: 'error',
      });
    } catch { throw new ProviderFailure('IMEJIS_CONNECTION_ERROR'); }
    if (!res.ok) throw new ProviderFailure(`IMEJIS_HTTP_${res.status}`, res.status >= 500);
    const mime = String(res.headers.get('content-type') || '').split(';')[0].trim();
    if (mime !== 'image/jpeg' && mime !== 'image/png') throw new ProviderFailure('PROVIDER_MEDIA_UNSUPPORTED');
    const data = Buffer.from(await res.arrayBuffer());
    if (!data.length || data.length > MAX_IMAGE_BYTES) throw new ProviderFailure('PROVIDER_MEDIA_TOO_LARGE');
    return { data, mime: mime as 'image/jpeg' | 'image/png' };
  }

  private async renderFlux(prompt: string): Promise<{ data: Buffer; mime: 'image/png' | 'image/jpeg' }> {
    const token = await this.cfToken();
    if (!token) fail('FLUX_NOT_CONFIGURED', 409);
    const account = await this.cfAccountId();
    if (!account) fail('FLUX_ACCOUNT_UNRESOLVED', 409);
    let res: Response;
    try {
      res = await this.fetcher(`${CF_API_BASE}/accounts/${encodeURIComponent(account)}/ai/run/${FLUX_MODEL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, steps: 4 }),
        signal: AbortSignal.timeout(RENDER_TIMEOUT), redirect: 'error',
      });
    } catch { throw new ProviderFailure('FLUX_CONNECTION_ERROR'); }
    if (!res.ok) throw new ProviderFailure(`FLUX_HTTP_${res.status}`, res.status >= 500);
    const mime = String(res.headers.get('content-type') || '').split(';')[0].trim();
    let data: Buffer, outMime: 'image/png' | 'image/jpeg';
    if (mime === 'image/png' || mime === 'image/jpeg') { data = Buffer.from(await res.arrayBuffer()); outMime = mime; }
    else {
      // REST ممکن است JSON {result:{image:'<base64>'}} برگرداند
      let j: any; try { j = await res.json(); } catch { throw new ProviderFailure('PROVIDER_MEDIA_UNSUPPORTED'); }
      const b64 = typeof j?.result?.image === 'string' ? j.result.image : undefined;
      if (!b64) throw new ProviderFailure('PROVIDER_MEDIA_UNSUPPORTED');
      data = Buffer.from(b64, 'base64'); outMime = 'image/png';
    }
    if (!data.length || data.length > MAX_IMAGE_BYTES) throw new ProviderFailure('PROVIDER_MEDIA_TOO_LARGE');
    return { data, mime: outMime };
  }

  /* ذخیرهٔ خروجی در کتابخانهٔ رسانهٔ همان مالک (همان مسیر chunk/finalize معمول) */
  /* ── provider ترکیب (compose): ElevenLabs TTS + مونتاژ ffmpeg ── */
  private async renderCompose(task: MediaGenTask): Promise<{ data: Buffer; mime: 'video/mp4' }> {
    const audio = await this.ttsEleven(task.script!, task.voiceId || DEFAULT_TTS_VOICE);
    const mp4 = await this.compositeReel(task, audio);
    return { data: mp4, mime: 'video/mp4' };
  }

  private async ttsEleven(script: string, voiceId: string): Promise<Buffer> {
    const key = await this.elevenKey();
    if (!key) fail('ELEVENLABS_NOT_CONFIGURED', 409);
    let res: Response;
    try {
      res = await this.fetcher(`${ELEVENLABS_TTS_BASE}${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: script, model_id: 'eleven_v3' }),
        signal: AbortSignal.timeout(RENDER_TIMEOUT), redirect: 'error',
      });
    } catch { throw new ProviderFailure('ELEVENLABS_CONNECTION_ERROR'); }
    if (!res.ok) throw new ProviderFailure(`ELEVENLABS_HTTP_${res.status}`, res.status >= 500);
    const mime = String(res.headers.get('content-type') || '').split(';')[0].trim();
    if (!mime.startsWith('audio/')) throw new ProviderFailure('PROVIDER_MEDIA_UNSUPPORTED');
    const data = Buffer.from(await res.arrayBuffer());
    if (!data.length || data.length > MAX_AUDIO_BYTES) throw new ProviderFailure('PROVIDER_MEDIA_TOO_LARGE');
    return data;
  }

  /** تصویر برند + حرکت آرام (Ken Burns) + زیرنویس RTL + صدا → mp4 عمودی ۹:۱۶ */
  private async compositeReel(task: MediaGenTask, audio: Buffer): Promise<Buffer> {
    const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
    const font = subtitleFontFile();
    const image = this.assets.file(task.sourceAssetId!, true); // نسخهٔ آمادهٔ (render) تصویر
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mediagen-'));
    const audioFile = path.join(tmp, 'voice');
    const outFile = path.join(tmp, 'out.mp4');
    const subs = path.join(tmp, 'subs.txt');
    try {
      fs.writeFileSync(audioFile, audio);
      // فیلتر: برش ۹:۱۶ → زوم آرام → (زیرنویس) → yuv420p
      let chain = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
        + "zoompan=z='min(zoom+0.0006,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30";
      const draw: string[] = [];
      if (task.subtitle && task.subtitle.trim()) {
        fs.writeFileSync(subs, task.subtitle.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''));
        draw.push(`drawtext=fontfile='${font}':textfile='${subs}':fontsize=52:fontcolor=white:borderw=3:bordercolor=black@0.85:box=1:boxcolor=black@0.45:boxborderw=18:x=(w-text_w)/2:y=h-text_h-160:line_spacing=12`);
      }
      chain += (draw.length ? ',' + draw.join(',') : '') + ',format=yuv420p';
      const args = [
        '-y', '-loop', '1', '-framerate', '30', '-i', image,
        '-i', audioFile,
        '-filter_complex', `[0:v]${chain}[v]`,
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
        outFile,
      ];
      try {
        await exec(ffmpegPath, args, { timeout: COMPOSE_TIMEOUT, maxBuffer: 4 * 1024 * 1024 });
      } catch (e: any) {
        throw new ProviderFailure(e?.code === 'FONT_NOT_FOUND' ? 'FONT_NOT_FOUND' : 'FFMPEG_COMPOSE_FAILED');
      }
      const out = fs.readFileSync(outFile);
      if (!out.length || out.length > 300 * 1024 * 1024) throw new ProviderFailure('FFMPEG_COMPOSE_FAILED');
      return out;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  private async saveAsset(task: MediaGenTask, mime: string, bytes: Buffer): Promise<string> {
    const ext = mime === 'video/mp4' ? 'mp4' : mime === 'image/png' ? 'png' : 'jpg';
    const created = await this.assets.create(task.owner, {
      mime, size: bytes.length, name: `mediagen-${task.provider}-${task.designId || task.provider}.${ext}`,
      idempotencyKey: `mediagen:${fingerprint({ task: task.createdAt, provider: task.provider, designId: task.designId, prompt: task.prompt, sourceAssetId: task.sourceAssetId, script: task.script })}`,
    });
    const id = created.id;
    await this.assets.chunk(task.owner, id, 0, bytes, true);
    await this.assets.finalize(task.owner, id, true);
    return id;
  }

  /* ── ورود به جریان انتشار: فقط draft — تأیید انسانی دست‌نخورده ── */
  async import(actor: string, id: string, b: any) {
    if (b.confirmed !== true) fail('CONFIRMATION_REQUIRED');
    const row = await this.core.read<MediaGenTask>('pub-mediagen-task', id);
    if (!row) fail('NOT_FOUND', 404);
    if (row.data.owner !== actor) fail('FORBIDDEN', 403);
    if (row.data.status !== 'completed') fail('TASK_NOT_READY', 409);
    const format = b.format === 'story' ? 'story' : b.format === 'reel' ? 'reel' : 'image';
    const caption = String(b.caption ?? '').trim();
    if (!caption) fail('CAPTION_REQUIRED');
    const asset = await this.assets.ready(row.data.assetId!);
    if (format === 'reel' && !asset.data.mime.startsWith('video/')) fail('VIDEO_REQUIRED');
    const ratio = (asset.data.width || 0) / (asset.data.height || 0);
    const min = (format === 'story' || format === 'reel' ? 9 / 16 : 0.8) - 0.01, max = 1.91 + 0.01;
    if (!Number.isFinite(ratio) || ratio < min || ratio > max) fail('MEDIA_ASPECT_RATIO');
    const draft = await this.publishing!.save(actor, undefined, {
      title: String(b.title || row.data.title).slice(0, 200),
      caption, language: b.language || row.data.language, format,
      assetIds: [row.data.assetId!], coverId: '', campaignId: '',
      executionMode: 'manual', timezone: undefined,
    });
    await this.core.store.runInTransaction(async () => {
      const fresh = await this.core.read<MediaGenTask>('pub-mediagen-task', id);
      if (fresh && fresh.data.status === 'completed') {
        await this.core.save('pub-mediagen-task', id, { ...fresh.data, status: 'imported', draftId: draft.id }, fresh.version);
      }
    });
    await this.core.audit(actor, 'mediagen.import', id, { draftId: draft.id });
    return { id, status: 'imported', draftId: draft.id };
  }

  async cancel(actor: string, id: string, b: any) {
    if (b.confirmed !== true) fail('CONFIRMATION_REQUIRED');
    return this.core.store.runInTransaction(async () => {
      const row = await this.core.read<MediaGenTask>('pub-mediagen-task', id);
      if (!row) fail('NOT_FOUND', 404);
      if (row.data.owner !== actor) fail('FORBIDDEN', 403);
      if (row.data.status !== 'queued') fail('TASK_NOT_CANCELLABLE', 409);
      await this.core.save('pub-mediagen-task', id, { ...row.data, status: 'cancelled' }, row.version);
      return { id, status: 'cancelled' };
    });
  }

  async tasks(actor: string, admin = false) {
    return (await this.core.list<MediaGenTask>('pub-mediagen-task'))
      .filter(r => admin || r.data.owner === actor)
      .map(r => ({
        id: r.id, provider: r.data.provider, designId: r.data.designId, title: r.data.title,
        language: r.data.language, status: r.data.status, assetId: r.data.assetId || null,
        draftId: r.data.draftId || null, error: r.data.error || '', createdAt: r.data.createdAt,
      }));
  }
}
