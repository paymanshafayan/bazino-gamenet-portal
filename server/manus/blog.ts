/**
 * Manus blog-import endpoint (feature 2026-09-11): turn a published Instagram
 * post/reel/story into a blog content DRAFT. The machine never publishes —
 * an admin approves and publishes from Content & Publish Queue (studio rule:
 * "the agent proposes, the human approves").
 *
 * Auth: baz_ token with scope `manus:blog`. Idempotent per media_id.
 */
import type express from 'express';
import { OpsCore, endpoint, fail, fingerprint, nowISO } from '../management/core';
import { isValidApiToken } from '../affiliate/igSettings';
import { ContentService } from '../management/content';
import { validateBlogImport, blogTitleFrom } from './blogPolicy';
import { detectAwayLanguage } from '../affiliate/awayPolicy';

export const MANUS_BLOG_SCOPE = 'manus:blog';

function bearer(req: express.Request): string {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

export function registerManusBlogRoutes(d: { app: express.Express; getStore: () => any }) {
  const { app } = d;
  const store = () => d.getStore();
  const core = () => new OpsCore(store);

  app.post('/api/manus/blog/imports', endpoint(async (req, res) => {
    if (!(await isValidApiToken(store(), bearer(req), MANUS_BLOG_SCOPE))) fail('UNAUTHORIZED', 401);
    const parsed = validateBlogImport(req.body);
    /* tsconfig is non-strict (no strictNullChecks): boolean-discriminant narrowing
     * on the result union is unreliable, so go through any here. */
    const bad: any = parsed;
    if (!bad.ok) fail(bad.error, 400);
    const v = bad.value;

    // One import per media_id (or an explicit Idempotency-Key).
    const key = String(req.headers['idempotency-key'] || '').trim() || `blog-import:${v.media_id}`;
    const id = fingerprint({ key });
    const existing = await core().read('blog-import', id);
    if (existing) {
      return res.json({ ok: true, import_id: id, content_id: existing.data.contentId, status: 'duplicate' });
    }

    const language = v.language || detectAwayLanguage(v.caption);
    const title = blogTitleFrom(v.caption, v.media_type, v.media_id);
    const body = v.caption + (v.permalink ? `\n\nInstagram: ${v.permalink}` : '');
    const content = new ContentService(core());
    const saved: any = await content.create('manus:blog', {
      idempotencyKey: `blog-import:${v.media_id}`,
      title,
      versions: { blog: { title, body, mediaUrl: v.image_url, mediaType: 'image' as const, language, category: 'Instagram' } },
      destinations: ['blog'],
    });
    await core().save('blog-import', id, {
      mediaId: v.media_id, mediaType: v.media_type, permalink: v.permalink || '',
      publishedAt: v.published_at || '', language, contentId: saved.id,
      createdAt: nowISO(), source: 'manus',
    }, 0);
    res.json({ ok: true, import_id: id, content_id: saved.id, status: 'draft' });
  }));
}
