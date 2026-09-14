/**
 * Blog-import validation — pure, unit-testable. Shared by the Manus endpoint
 * (/api/manus/blog/imports) and tests. No I/O.
 */
export type BlogImportLanguage = 'fa' | 'en' | 'tr' | 'ru';
export type BlogImportMediaType = 'post' | 'reel' | 'story';

export interface BlogImportInput {
  media_id: string;
  media_type: BlogImportMediaType;
  caption: string;
  image_url?: string;
  permalink?: string;
  published_at?: string;
  language?: BlogImportLanguage;
}

export type BlogImportResult =
  | { ok: true; value: BlogImportInput }
  | { ok: false; error: string };

const MEDIA_ID_RE = /^[\w-]{1,64}$/;
const URL_RE = /^https?:\/\/\S{1,480}$/i;

export function validateBlogImport(body: any): BlogImportResult {
  const b = body && typeof body === 'object' ? body : {};
  const media_id = String(b.media_id ?? '').trim();
  if (!media_id) return { ok: false, error: 'MEDIA_ID_REQUIRED' };
  if (!MEDIA_ID_RE.test(media_id)) return { ok: false, error: 'INVALID_MEDIA_ID' };
  const media_type = String(b.media_type || 'post');
  if (!['post', 'reel', 'story'].includes(media_type)) return { ok: false, error: 'INVALID_MEDIA_TYPE' };
  const caption = String(b.caption ?? '').trim();
  if (!caption) return { ok: false, error: 'CAPTION_REQUIRED' };
  if (caption.length > 5000) return { ok: false, error: 'CAPTION_TOO_LONG' };

  const optionalUrl = (raw: any, error: string): string | undefined => {
    if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
    const s = String(raw).trim();
    if (!URL_RE.test(s)) throw new ValidationError(error);
    return s;
  };
  try {
    const image_url = optionalUrl(b.image_url, 'INVALID_IMAGE_URL');
    const permalink = optionalUrl(b.permalink, 'INVALID_PERMALINK');
    let published_at: string | undefined;
    if (b.published_at !== undefined && b.published_at !== null && String(b.published_at).trim()) {
      const t = Date.parse(String(b.published_at));
      if (!Number.isFinite(t)) return { ok: false, error: 'INVALID_PUBLISHED_AT' };
      published_at = new Date(t).toISOString();
    }
    const language = ['fa', 'en', 'tr', 'ru'].includes(String(b.language))
      ? String(b.language) as BlogImportLanguage : undefined;
    return { ok: true, value: { media_id, media_type: media_type as BlogImportMediaType, caption, image_url, permalink, published_at, language } };
  } catch (e: any) {
    if (e instanceof ValidationError) return { ok: false, error: e.error };
    throw e;
  }
}

class ValidationError extends Error { constructor(public error: string) { super(error); } }

/** Blog title from the caption's first meaningful line; falls back to a stable name. */
export function blogTitleFrom(caption: string, mediaType: string, mediaId: string): string {
  const firstLine = String(caption || '').split(/\r?\n/).map(s => s.trim()).find(Boolean) || '';
  const t = firstLine.replace(/[#*_~`>]/g, '').trim();
  return t.length >= 3 ? t.slice(0, 120) : `Instagram ${mediaType} ${mediaId}`;
}
