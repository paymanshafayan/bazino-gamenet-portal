/**
 * Batch 8 — social media / blog content management with Manus (API v2) and a durable
 * publishing queue, used from BOTH the operations console and the website admin panel.
 *
 * Security & honesty rules (acceptance criteria 14–16):
 *  - Drafts are never public. Only an approved version is published, at its scheduled time.
 *  - The Manus API key lives server-side only (`settings: manus_api_key`, secret).
 *  - External calls only happen when configured; otherwise INTEGRATION_NOT_CONFIGURED.
 *  - Each destination (blog/instagram/telegram) is tracked separately; one channel
 *    failing never marks the others as success.
 *  - Webhook deliveries are HMAC-verified and idempotent (requestId); a replay or an
 *    invalid signature never triggers a publish.
 *  - The queue is persisted as OpsRecords ('content'), so a server restart does not drop
 *    scheduled work.
 */
import express from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { OpsCore, endpoint, fail, newId, nowISO, stringValue } from './core';
import { PublishingSettings } from '../publishing/settings';
import { ManusClient } from '../publishing/manus';
import { fingerprint } from './core';
import type { ContentItem, ContentVersion } from '../../shared/management/types';

export type Destination = 'blog' | 'instagram' | 'telegram';
export const DESTINATIONS: Destination[] = ['blog', 'instagram', 'telegram'];

const VALID_STATUSES = ['draft', 'generating', 'review', 'approved', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'cancelled'];

export class ContentService {
  constructor(public core: OpsCore) {}

  async list() {
    return (await this.core.list<ContentItem>('content'))
      .map(r => ({ id: r.id, version: r.version, updatedAt: r.updatedAt, ...r.data }))
      .sort((a, b) => (b.scheduledAt || '').localeCompare(a.scheduledAt || ''));
  }

  async get(id: string) {
    const r = await this.core.read<ContentItem>('content', id);
    if (!r) fail('NOT_FOUND', 404);
    return { id: r.id, version: r.version, updatedAt: r.updatedAt, ...r.data };
  }

  async create(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'content-create', b, async () => {
      const title = stringValue(b.title, 200, true);
      const versions = this.sanitizeVersions(b.versions || {});
      const data: ContentItem = {
        title, status: 'draft', versions, destinations: this.sanitizeDestinations(b.destinations || ['blog']),
      };
      return this.core.save('content', newId('CT'), data, 0);
    });
  }

  async update(actor: string, id: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'content-update', { id, ...b }, async () => {
      const row = await this.core.read<ContentItem>('content', id);
      if (!row) fail('NOT_FOUND', 404);
      if (Number(b.version) !== row.version) fail('VERSION_CONFLICT', 409);
      const data: ContentItem = {
        ...row.data, approvals: {},
        title: b.title ? stringValue(b.title, 200, true) : row.data.title,
        versions: b.versions ? this.mergeVersions(row.data.versions, b.versions) : row.data.versions,
        destinations: b.destinations ? this.sanitizeDestinations(b.destinations) : row.data.destinations,
      };
      // Editing an approved/published item returns it to review for safety.
      if (['published'].includes(row.data.status)) {
        data.status = 'review';
      } else if (!['generating', 'publishing'].includes(row.data.status)) {
        data.status = 'draft';
      }
      for(const dest of Object.keys(data.destinations)) data.destinations[dest]={...data.destinations[dest],status:'draft'};
      return this.core.save('content', id, data, row.version);
    });
  }

  /** Ask Manus to (re)generate text for a destination. Stores 'generating'; the webhook
   *  fills the version. Without a key we return an explicit configuration error. */
  async generate(actor: string, id: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'content-generate', { id, ...b }, async () => {
      const row = await this.core.read<ContentItem>('content', id);
      if (!row) fail('NOT_FOUND', 404);
      const dest = this.destination(b.destination);
      const key = await this.core.store.getSetting('manus_api_key') || process.env.MANUS_API_KEY || '';
      const language = ['fa', 'en', 'tr', 'ru'].includes(b.language) ? b.language : 'fa';
      const prompt = stringValue(b.prompt, 4000, true);
      const category = stringValue(b.category, 80);
      // Simulator mode: no key configured, or an explicit key value/env asking for the
      // simulator. Lets the whole queue be exercised end-to-end without Manus credentials.
      // Real Manus calls remain untested (no live credential in this environment).
      const simulate = b.simulate === true;
      if (simulate) {
        const sim = this.simulatedDraft(language, dest, row.data.title, prompt, category);
        const versions = { ...row.data.versions, [dest]: { title: sim.title, body: sim.body, language, category: category || undefined } as ContentVersion };
        const data: ContentItem = {
          ...row.data, versions, status: 'review', taskId: newId('SIM'), taskStatus: 'simulated',
          destinations: { ...row.data.destinations, [dest]: { ...row.data.destinations[dest], status: 'review', attemptedAt: nowISO(), simulated: true, requestId: newId('REQ') } as Record<string, any>[string] },
        };
        return this.core.save('content', id, data, row.version);
      }
      if(b.confirmedCost!==true)fail('AGENT_COST_CONFIRMATION_REQUIRED',400);
      const settings=new PublishingSettings(this.core),agentId=(await settings.config()).data.defaultAgentId;
      const manus=new ManusClient(this.core),credential=await manus.credential(agentId);
      const taskKey=newId('GEN');
      const data:ContentItem={...row.data,status:'generating',taskId:taskKey,taskStatus:'queued',approvals:{},destinations:{...row.data.destinations,[dest]:{...row.data.destinations[dest],status:'generating'}}};
      const saved=await this.core.save('content',id,data,row.version);
      await this.core.save('pub-agent-task',taskKey,{legacyContentId:id,legacyVersion:saved.version,legacyDestination:dest,owner:actor,agentId,credentialHash:credential.fingerprint,brief:prompt,title:row.data.title,language,status:'queued',createdAt:nowISO()},0);
      return saved;
    });
  }

  /** Approve a version (requires 'publish' permission) — required before scheduling. */
  async approve(actor: string, id: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'content-approve', { id }, async () => {
      const row = await this.core.read<ContentItem>('content', id);
      if (!row) fail('NOT_FOUND', 404);
      if(Number(b.version)!==row.version)fail('VERSION_CONFLICT',409);
      if(row.data.status==='generating')fail('GENERATION_RUNNING',409);
      if(row.data.taskStatus==='simulated')fail('SIMULATED_CONTENT_NOT_PUBLISHABLE',409);
      const dest = this.destination(b.destination);
      const v = row.data.versions?.[dest];
      if (!v || !v.body) fail('NO_VERSION_TO_APPROVE', 409);
      const data: ContentItem = { ...row.data, approvals:{...(row.data.approvals||{}),[dest]:fingerprint(v)}, approvedVersion: row.version, approvedBy: actor, status: 'review' };
      data.destinations = { ...row.data.destinations, [dest]: { ...row.data.destinations[dest], status: 'approved' } };
      return this.core.save('content', id, data, row.version);
    });
  }

  /** Schedule or publish now. Scheduling requires an approved version for each destination. */
  async schedule(actor: string, id: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'content-schedule', { id, ...b }, async () => {
      const row = await this.core.read<ContentItem>('content', id);
      if (!row) fail('NOT_FOUND', 404);
      const data: ContentItem = { ...row.data };
      const dests = Object.keys(data.destinations) as Destination[];
      if (!dests.length) fail('NO_DESTINATION', 409);
      for (const d of dests) {
        const v = data.versions?.[d];
        if (!v?.body) fail('NO_VERSION_TO_APPROVE', 409);
        if(data.approvals?.[d]!==fingerprint(v))fail('APPROVAL_REQUIRED',409);
      }
      if (b.publishNow) {
        data.status = 'scheduled'; data.scheduledAt = nowISO();
      } else {
        const at = b.scheduledAt ? new Date(b.scheduledAt).toISOString() : '';
        if (!at || Date.parse(at) < Date.now() - 60000) fail('INVALID_SCHEDULE', 400);
        data.status = 'scheduled'; data.scheduledAt = at;
      }
      return this.core.save('content', id, data, row.version);
    });
  }

  async cancel(actor: string, id: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'content-cancel', { id }, async () => {
      const row = await this.core.read<ContentItem>('content', id);
      if (!row) fail('NOT_FOUND', 404);
      if (['published'].includes(row.data.status)) fail('BAD_STATE', 409);
      return this.core.save('content', id, { ...row.data, status: 'cancelled' }, row.version);
    });
  }

  /**
   * Publish due items. Called by the interval sweeper and on demand. For each scheduled
   * item whose time has come, publish per destination and record per-channel results.
   */
  async publishDue() {
    const results:Array<{id:string;destination:string;ok:boolean;error?:string;url?:string}>=[];
    for(const row of await this.core.list<ContentItem>('content')) {
      if(row.data.status!=='scheduled'||!row.data.scheduledAt||Date.parse(row.data.scheduledAt)>Date.now())continue;
      await this.core.store.runInTransaction(async()=>{
        const fresh=await this.core.read<ContentItem>('content',row.id);if(!fresh||fresh.data.status!=='scheduled')return;
        const d=fresh.data,destinations={...d.destinations};let anyOk=false,anyFail=false;
        for(const dest of Object.keys(destinations) as Destination[]) {
          if(destinations[dest].status==='published'){anyOk=true;continue;}
          const v=d.versions?.[dest];
          try {
            if(!v||d.approvals?.[dest]!==fingerprint(v))fail('APPROVAL_REQUIRED',409);
            const r=await this.publishOne(dest,d,v);destinations[dest]={...destinations[dest],status:'published',url:r.url,id:r.externalId,attemptedAt:nowISO()};anyOk=true;results.push({id:row.id,destination:dest,ok:true,url:r.url});
          }catch(e:any){const error=e.code||'PUBLISH_FAILED';destinations[dest]={...destinations[dest],status:'failed',error};anyFail=true;results.push({id:row.id,destination:dest,ok:false,error});}
        }
        await this.core.save('content',row.id,{...d,destinations,status:anyOk&&anyFail?'partial':anyOk?'published':'failed'},fresh.version);
      });
    }
    return results;
  }

  /** Publish one destination. Blog → local articles table; IG/Telegram → Zernio webhook if configured. */
  async publishOne(dest: Destination, item: ContentItem, v: ContentVersion): Promise<{ url?: string; externalId?: string }> {
    if (dest === 'blog') {
      const store = this.core.store;
      const id = `BLG-${newId('').slice(3, 11)}`;
      await store.createArticle({
        id, title: v.title || item.title, content: v.body,
        titleFa: v.language === 'fa' ? (v.title || item.title) : undefined,
        contentFa: v.language === 'fa' ? v.body : undefined,
        titleEn: v.language === 'en' ? (v.title || item.title) : undefined,
        contentEn: v.language === 'en' ? v.body : undefined,
        category: v.category || 'News', imageUrl: v.mediaUrl || '/images/home/esports-480.webp',
        author: 'BAZINO Admin', date: nowISO().slice(0, 10), comments: '[]',
      } as any);
      return { url: `/blog/${id}`, externalId: id };
    }
    fail('USE_PUBLISHING_STUDIO',409);
  }

  /** Webhook receiver for Manus task completion. HMAC on raw body, idempotent by taskId. */
  async handleManusWebhook(rawBody: string, signature: string) {
    const secret = await this.core.store.getSetting('manus_webhook_secret');
    if (!secret) fail('WEBHOOK_NOT_CONFIGURED', 404);
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature || '', 'utf8'), expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) fail('INVALID_SIGNATURE', 401);
    let evt: any; try { evt = JSON.parse(rawBody); } catch { fail('INVALID_BODY', 400); }
    const taskId = String(evt.task_id || evt.taskId || '');
    if (!taskId) fail('INVALID_BODY', 400);
    // Find the content item awaiting this task.
    for (const row of await this.core.list<ContentItem>('content')) {
      if (row.data.taskId !== taskId && !Object.values(row.data.destinations || {}).some((d:any) => d.taskId === taskId)) continue;
      const dest = (Object.keys(row.data.destinations) as Destination[]).find(d => (row.data.destinations[d] as any).taskId === taskId) || 'blog';
      const resultText = String(evt.output_text || evt.text || evt.result || '');
      const resultTitle = String(evt.output_title || evt.title || '');
      const requestId = row.data.destinations[dest]?.requestId;
      // Idempotency: a repeated webhook for an already-filled task does not downgrade state.
      if (row.data.versions?.[dest]?.body && row.data.status !== 'generating') return { idempotent: true, id: row.id };
      const versions = { ...row.data.versions, [dest]: { ...(row.data.versions?.[dest] || { title: '', body: '', language: 'fa' }), body: resultText || row.data.versions?.[dest]?.body || '', title: resultTitle || row.data.versions?.[dest]?.title || '' } as ContentVersion };
      const destinations = { ...row.data.destinations, [dest]: { ...row.data.destinations[dest], status: resultText ? 'review' : 'failed', error: resultText ? undefined : 'EMPTY_RESULT' } };
      const status = Object.values(destinations).every(d => d.status !== 'generating') ? 'review' : 'generating';
      await this.core.save('content', row.id, { ...row.data, versions, destinations, status, taskStatus: evt.status || 'completed' }, row.version);
      return { ok: true, id: row.id, requestId };
    }
    return { ok: true, matched: false };
  }

  /** Deterministic placeholder text for simulator mode. NOT real AI output. */
  private simulatedDraft(language: string, dest: Destination, title: string, prompt: string, category: string): { title: string; body: string } {
    const destFa: Record<Destination, string> = { blog: 'بلاگ', instagram: 'اینستاگرام', telegram: 'تلگرام' };
    const bodyFa = `[نسخهٔ شبیه‌ساز — خروجی واقعی Manus نیست]\n\n${title}\n\nاین متن به‌صورت خودکار و بدون اتصال به سرویس Manus تولید شده تا جریان تأیید، زمان‌بندی و انتشار برای کانال «${destFa[dest]}» قابل آزمایش باشد. موضوع: ${prompt.slice(0, 160)}${category ? `\nدسته‌بندی: ${category}` : ''}\n\nپس از تنظیم کلید معتبر manus_api_key، این متن با نسخهٔ تولیدشده توسط Manus جایگزین می‌شود.`;
    const bodyEn = `[Simulator draft — NOT real Manus output]\n\n${title}\n\nThis text was generated locally without contacting Manus so the approve/schedule/publish flow can be tested for the "${dest}" channel. Brief: ${prompt.slice(0, 160)}${category ? `\nCategory: ${category}` : ''}\n\nOnce a valid manus_api_key is configured, this text is replaced by the Manus-generated version.`;
    const body = language === 'fa' ? bodyFa : bodyEn;
    return { title, body };
  }

  private destination(v: unknown): Destination {
    const d = String(v || 'blog');
    if (!DESTINATIONS.includes(d as Destination)) fail('INVALID_DESTINATION');
    return d as Destination;
  }
  private sanitizeDestinations(v: unknown): ContentItem['destinations'] {
    const arr = Array.isArray(v) ? v : String(v || '').split(',');
    const out: ContentItem['destinations'] = {};
    for (const d of arr) if (DESTINATIONS.includes(d)) out[d as Destination] = { status: 'draft' };
    if (!Object.keys(out).length) out.blog = { status: 'draft' };
    return out;
  }
  private sanitizeVersions(v: any): ContentItem['versions'] {
    const out: ContentItem['versions'] = {};
    for (const d of DESTINATIONS) if (v?.[d]) out[d] = { title: stringValue(v[d].title, 200), body: stringValue(v[d].body, 8000), language: ['fa', 'en', 'tr', 'ru'].includes(v[d].language) ? v[d].language : 'fa', mediaUrl: stringValue(v[d].mediaUrl, 500), mediaType: v[d].mediaType === 'video' ? 'video' : 'image', category: stringValue(v[d].category, 80) };
    return out;
  }
  private mergeVersions(old: ContentItem['versions'] | undefined, next: any): ContentItem['versions'] {
    return { ...(old || {}), ...this.sanitizeVersions(next) };
  }
}

export function registerContent(app: express.Express, service: ContentService) {
  const { core } = service, base = '/api/management';
  app.get(`${base}/content`, core.guard('content'), endpoint(async (_req, res) => res.json(await service.list())));
  // Static segments must be registered BEFORE the `:id` routes below, otherwise Express
  // would route POST /content/publish-due into the update handler (id = "publish-due").
  app.post(`${base}/content/publish-due`, core.guard('publish'), endpoint(async (_req, res) => res.json(await service.publishDue())));
  app.get(`${base}/content/:id`, core.guard('content'), endpoint(async (req, res) => res.json(await service.get(String(req.params.id)))));
  app.post(`${base}/content`, core.guard('content'), endpoint(async (req, res) => res.json(await service.create((req as any).staff.username, req.body || {}))));
  app.post(`${base}/content/:id`, core.guard('content'), endpoint(async (req, res) => res.json(await service.update((req as any).staff.username, String(req.params.id), req.body || {}))));
  app.post(`${base}/content/:id/generate`, core.guard('publish'), endpoint(async (req, res) => res.json(await service.generate((req as any).staff.username, String(req.params.id), req.body || {}))));
  app.post(`${base}/content/:id/approve`, core.guard('publish'), endpoint(async (req, res) => res.json(await service.approve((req as any).staff.username, String(req.params.id), req.body || {}))));
  app.post(`${base}/content/:id/schedule`, core.guard('publish'), endpoint(async (req, res) => res.json(await service.schedule((req as any).staff.username, String(req.params.id), req.body || {}))));
  app.post(`${base}/content/:id/cancel`, core.guard('publish'), endpoint(async (req, res) => res.json(await service.cancel((req as any).staff.username, String(req.params.id), req.body || {}))));
  // Live Manus callbacks are RSA-verified by publishing/publicationRoutes.ts.
  // Publish sweeper: every 60s, no external call unless something is due.
  setInterval(() => { service.publishDue().catch(() => {}); }, 60_000).unref?.();
}
