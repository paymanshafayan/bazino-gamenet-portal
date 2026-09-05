/**
 * Media-ID ingest + Friend Gate (ادمین + وب‌هوک Zernio). پورتال به Meta وصل نیست.
 */
import type express from 'express';
import type { IDataStore } from '../dataProviders';
import { IG_INGEST_TOKEN_KEY, IG_SETTING_KEYS, readIgSettings, seedIgSettings } from './igSettings';
import { onCampaignComment, onFollowButton, parseFollowPayload, registerPublishedMedia } from './igEngine';
import { dispatchIgOutbound, verifyZernioSignature, zernioConfigured, zernioFollowStatus } from './zernio';

export interface IgRouteDeps {
  app: express.Express;
  getStore: () => IDataStore;
  authUsername: (req: express.Request) => string | undefined;
}

function httpError(res: express.Response, e: any, fallback = 500) {
  const status = e?.statusCode || fallback;
  return res.status(status).json({ error: e?.code || e?.message || String(e), code: e?.code || undefined, message: e?.message });
}

function bearer(req: express.Request): string {
  const h = req.headers.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  return '';
}

async function ingestToken(store: IDataStore): Promise<string> {
  return (process.env.IG_INGEST_TOKEN || (await store.getSetting(IG_INGEST_TOKEN_KEY)) || '').trim();
}

export function registerIgRoutes(d: IgRouteDeps) {
  const { app } = d;
  const store = () => d.getStore();

  app.post('/api/integrations/instagram/published-media', async (req, res) => {
    try {
      await seedIgSettings(store());
      const expected = await ingestToken(store());
      if (!expected || bearer(req) !== expected) {
        return res.status(401).json({ accepted: false, error: 'unauthorized', code: 'unauthorized' });
      }
      const key = String(req.headers['idempotency-key'] || `instagram:${req.body?.media_id || ''}`);
      const out = await registerPublishedMedia(store(), req.body, key);
      return res.status(out.status).json(out.json);
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/integrations/zernio/webhook', async (req, res) => {
    try {
      const raw = (req as any).rawBody as Buffer | undefined;
      const payload = raw || Buffer.from(JSON.stringify(req.body || {}));
      if (!verifyZernioSignature(payload, String(req.headers['x-zernio-signature'] || ''))) {
        return res.status(401).json({ error: 'unauthorized', code: 'unauthorized' });
      }
      const body = req.body || {};
      const event = String(body.event || body.type || '');
      let outboundSent = false;
      if (event === 'comment.received' || body.comment) {
        const c = body.comment || {};
        const mediaId = String(c.platformPostId || c.mediaId || body.platformPostId || '');
        const r = await onCampaignComment(store(), {
          mediaId,
          commentId: String(c.id || c.commentId || ''),
          text: String(c.text || c.message || ''),
          igUserId: String(c.author?.id || c.authorId || c.igUserId || ''),
          igUsername: String(c.author?.username || c.username || ''),
        });
        if (r.ok && r.outbound) {
          const sent = await dispatchIgOutbound(r.outbound, mediaId);
          outboundSent = !!sent.sent;
        }
      } else if (event === 'message.received' || body.button || body.postback) {
        const payloadStr = String(body.button?.payload || body.postback?.payload || body.message?.payload || body.payload || '');
        const memberId = parseFollowPayload(payloadStr);
        if (memberId) {
          const verified = await zernioFollowStatus(String(body.sender?.id || body.message?.sender?.id || ''));
          const r = await onFollowButton(store(), memberId, verified === true);
          if (r.ok && r.outbound) {
            const mediaId = r.member?.mediaId || '';
            const sent = await dispatchIgOutbound(r.outbound, mediaId);
            outboundSent = !!sent.sent;
          }
        }
      }
      res.json({ ok: true, outboundSent });
    } catch (e) { httpError(res, e); }
  });

  app.get('/api/admin/ig-campaign', async (_req, res) => {
    try {
      await seedIgSettings(store());
      const settings = await readIgSettings(store());
      const media = await store().listIgMedia();
      const members = await store().listIgMembers();
      res.json({
        settings,
        media,
        members,
        zernioConfigured: zernioConfigured(),
        ingestPath: '/api/integrations/instagram/published-media',
      });
    } catch (e) { httpError(res, e); }
  });

  app.put('/api/admin/ig-campaign', async (req, res) => {
    try {
      const body = req.body || {};
      for (const k of IG_SETTING_KEYS) {
        if (body[k] === undefined || body[k] === null) continue;
        await store().setSetting(k, String(body[k]));
      }
      res.json({ success: true, settings: await readIgSettings(store()) });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/admin/ig/register-media', async (req, res) => {
    try {
      const out = await registerPublishedMedia(store(), req.body, `admin:${req.body?.media_id || ''}`);
      return res.status(out.status).json(out.json);
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/admin/ig/simulate-comment', async (req, res) => {
    try {
      const b = req.body || {};
      const r = await onCampaignComment(store(), {
        mediaId: String(b.mediaId || ''),
        commentId: String(b.commentId || ''),
        text: String(b.text || ''),
        igUserId: String(b.igUserId || ''),
        igUsername: String(b.igUsername || ''),
      });
      if (!r.ok) return res.status(400).json({ error: r.error, code: r.error });
      res.json({ success: true, member: r.member, outbound: r.outbound });
    } catch (e) { httpError(res, e); }
  });

  app.post('/api/admin/ig/simulate-button', async (req, res) => {
    try {
      const r = await onFollowButton(store(), String((req.body || {}).memberId || ''), !!(req.body || {}).followVerified);
      if (!r.ok) return res.status(400).json({ error: r.error, code: r.error });
      res.json({ success: true, member: r.member, outbound: r.outbound });
    } catch (e) { httpError(res, e); }
  });
}
