import { OpsCore, fail, newId, nowISO } from '../management/core';
import { getJarvisConfig, groqChatCompletion } from '../jarvis/config';
import { SOCIAL_LANGUAGES, type CampaignBrief, type SocialLanguage, type TrendDigest } from '../../shared/publishing/types';
import { hooksFor } from './hooks';

/* ─────────────────────────────────────────────────────────────────────────────
 * بریف کمپین (فاز ۲ — گام ۲: «مغز سیستم»، الهام از Business DNA پوملی)
 * هر تولید محتوا از یک بریفِ تأییدشده می‌آید، نه پرامپت خام.
 * تأیید انسانی اجباری است: status فقط با POST /approve و confirmed:true از
 * draft به approved می‌رود. موتور پیشنهاد: Groq (جارویس موجود — $0).
 * ───────────────────────────────────────────────────────────────────────────── */

const PRIVATE_LINK = /\/ig\/invite\/|[?&](?:token|sig|gate)=|\{\{\s*invite_url/i;

function sanitizeBody(b: any, language: SocialLanguage): Pick<CampaignBrief, 'goal' | 'audience' | 'offer' | 'hooks' | 'caption' | 'cta' | 'language'> {
  const goal = String(b.goal || '').trim();
  if ([...goal].length < 3 || [...goal].length > 120) fail('BRIEF_GOAL_REQUIRED');
  const audience = String(b.audience || '').slice(0, 200);
  const offer = String(b.offer || '').slice(0, 300);
  const hooks = Array.isArray(b.hooks) ? b.hooks : [];
  if (hooks.length < 1 || hooks.length > 6) fail('BRIEF_HOOKS_REQUIRED');
  const cleanHooks = hooks.map(h => String(h).slice(0, 200));
  if (cleanHooks.some(h => !h.trim())) fail('BRIEF_HOOKS_REQUIRED');
  const caption = String(b.caption || '');
  if ([...caption].length > 2200) fail('CAPTION_TOO_LONG');
  if (PRIVATE_LINK.test(caption)) fail('PRIVATE_LINK_FORBIDDEN');
  const cta = String(b.cta || '').slice(0, 160);
  if (!cta.trim()) fail('BRIEF_CTA_REQUIRED');
  return { goal, audience, offer, hooks: cleanHooks, caption, cta, language };
}

export class BriefService {
  constructor(public core: OpsCore, public fetcher: typeof fetch = fetch) {}

  async list(actor: string, admin = false) {
    return (await this.core.list<CampaignBrief>('pub-brief'))
      .filter(r => admin || r.data.owner === actor)
      .map(r => ({ id: r.id, ...r.data }));
  }

  async save(actor: string, id: string | undefined, b: any, source: CampaignBrief['source'] = 'manual') {
    const language = (SOCIAL_LANGUAGES as string[]).includes(b.language) ? b.language as SocialLanguage : fail('INVALID_LANGUAGE');
    const body = sanitizeBody(b, language);
    return this.core.store.runInTransaction(async () => {
      const old = id ? await this.core.read<CampaignBrief>('pub-brief', id) : undefined;
      if (id && !old) fail('BRIEF_NOT_FOUND', 404);
      if (old && old.data.owner !== actor) fail('FORBIDDEN', 403);
      if (old && old.data.status !== 'draft') fail('BRIEF_NOT_EDITABLE', 409);
      if (old && old.version !== Number(b.version)) fail('VERSION_CONFLICT', 409);
      const data: CampaignBrief = {
        ...body,
        trendRef: old?.data.trendRef || String(b.trendRef || '').slice(0, 10) || undefined,
        status: 'draft', source: old?.data.source || source,
        owner: old?.data.owner || actor, createdAt: old?.data.createdAt || nowISO(),
      };
      const r = await this.core.save('pub-brief', id || newId('BR'), data, old?.version || 0);
      await this.core.audit(actor, 'brief.save', r.id, { goal: body.goal.slice(0, 80) });
      return r;
    });
  }

  async approve(actor: string, id: string, b: any) {
    if (b.confirmed !== true) fail('BRIEF_CONFIRMATION_REQUIRED');
    return this.core.store.runInTransaction(async () => {
      const row = await this.core.read<CampaignBrief>('pub-brief', id);
      if (!row) fail('BRIEF_NOT_FOUND', 404);
      if (row.data.owner !== actor) fail('FORBIDDEN', 403);
      if (row.data.status !== 'draft') fail('BRIEF_NOT_DRAFT', 409);
      if (row.version !== Number(b.version)) fail('VERSION_CONFLICT', 409);
      const r = await this.core.save('pub-brief', id, { ...row.data, status: 'approved', approvedBy: actor, approvedAt: nowISO() }, row.version);
      await this.core.audit(actor, 'brief.approve', id, {});
      return r;
    });
  }

  async archive(actor: string, id: string, b: any) {
    if (b.confirmed !== true) fail('BRIEF_CONFIRMATION_REQUIRED');
    return this.core.store.runInTransaction(async () => {
      const row = await this.core.read<CampaignBrief>('pub-brief', id);
      if (!row) fail('BRIEF_NOT_FOUND', 404);
      if (row.data.owner !== actor) fail('FORBIDDEN', 403);
      if (row.data.status === 'archived') fail('BRIEF_NOT_DRAFT', 409);
      const r = await this.core.save('pub-brief', id, { ...row.data, status: 'archived' }, row.version);
      await this.core.audit(actor, 'brief.archive', id, {});
      return r;
    });
  }

  /** پیشنهاد بریف با Groq: ترند روز (اگر باشد) + هوک‌های کتابخانه → JSON بریف. */
  async suggest(actor: string, b: any) {
    const language = (SOCIAL_LANGUAGES as string[]).includes(b.language) ? b.language as SocialLanguage : fail('INVALID_LANGUAGE');
    const cfg = await getJarvisConfig(this.core.store);
    const apiKey = cfg.apiKey || process.env.GROQ_API_KEY || '';
    if (!apiKey) fail('GROQ_NOT_CONFIGURED', 409);
    const digests = await this.core.list<TrendDigest>('pub-trend-digest');
    const digest = digests.map(r => r.data).sort((a, b2) => (a.date < b2.date ? 1 : -1))[0] || null;
    const hookSamples = hooksFor(language).slice(0, 8).map(h => h.template);
    const system = [
      'You are the campaign copywriter for "Bazino", a gaming club (gamenet) in Famagusta, Cyprus.',
      'Audience: local Persian/Turkish speaking gamers and students.',
      'Write ALL copy (goal, hooks, caption, cta) in the requested language. Hooks must follow viral patterns.',
      'Respond with STRICT JSON only, no markdown, matching this schema:',
      '{"goal":string(<=120),"audience":string(<=200),"offer":string(<=300),"hooks":[3-4 strings, each <=200],"caption":string(<=900, with hashtags at the end),"cta":string(<=160)}',
    ].join('\n');
    const user = JSON.stringify({
      language, goalHint: String(b.goalHint || '').slice(0, 300) || undefined,
      todayTrend: digest ? { date: digest.date, topGames: digest.twitch.slice(0, 5).map(t => t.name), topYoutube: digest.youtube.slice(0, 5).map(y => y.title) } : null,
      hookPatternSamples: hookSamples,
    });
    let content = '';
    try {
      const resp: any = await groqChatCompletion({
        apiKey, model: cfg.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.7, maxTokens: 1200, fetcher: this.fetcher,
      });
      content = String(resp?.choices?.[0]?.message?.content || '');
    } catch (e: any) {
      fail(e?.code === 'JARVIS_RATE_LIMITED' ? 'GROQ_RATE_LIMITED' : 'BRIEF_GENERATION_FAILED', 502);
    }
    const match = content.match(/\{[\s\S]*\}/);
    let parsed: any;
    try { parsed = match ? JSON.parse(match[0]) : null; } catch { parsed = null; }
    if (!parsed) fail('BRIEF_GENERATION_FAILED', 502);
    // ذخیره به‌عنوان پیش‌نویس — تأیید انسانی جداگانه انجام می‌شود
    return this.save(actor, undefined, { ...parsed, language, trendRef: digest?.date }, 'groq');
  }
}
