/**
 * Integrations suite — pure policy units for the two 2026-09-11 features:
 *  1) Instagram away auto-reply (language detection, window, guards)
 *  2) Manus blog-import validation
 * No I/O, no express, no DB — same dependency-free style as manus.test.mts.
 */
import { suite, test, assert, run } from './harness.mts';

const away = await import('../server/affiliate/awayPolicy.ts');
const blog = await import('../server/manus/blogPolicy.ts');
/** any-typed accessor so union results stay checkable without narrowing noise. */
const B = (b: any): any => blog.validateBlogImport(b);

const S = (over: any = {}) => ({ ...away.DEFAULT_AWAY_SETTINGS, enabled: true, ...over });

suite('1. Away language detection (fa/en/tr/ru from message text)');
test('Persian script → fa (incl. Arabic digits)', () => {
  assert.equal(away.detectAwayLanguage('سلام، برای رزرو پیام دادم'), 'fa');
  assert.equal(away.detectAwayLanguage('چند نرخ ساعتPlayStation ۵ است؟'), 'fa');
});
test('Cyrillic → ru', () => {
  assert.equal(away.detectAwayLanguage('Привет, хочу забронировать PS5'), 'ru');
});
test('Turkish-specific letters → tr', () => {
  assert.equal(away.detectAwayLanguage('Merhaba, fiyatınız kaç lira?'), 'tr');
  assert.equal(away.detectAwayLanguage('işlem saatleri'), 'tr');
});
test('Latin without Turkish letters → en', () => {
  assert.equal(away.detectAwayLanguage('Hello, I want to book a rig'), 'en');
  assert.equal(away.detectAwayLanguage(''), 'en');
});

suite('2. Away window (Cyprus hours, wrap-around)');
test('default 01:00–10:00: 02:00 in, 11:00 out, 01:00 in, 10:00 out (exclusive)', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 8, 11, h - 3, 0, 0)); // Cyprus = UTC+3
  assert.equal(away.inAwayWindow({ startHour: 1, endHour: 10 }, at(2), 'Asia/Nicosia'), true);
  assert.equal(away.inAwayWindow({ startHour: 1, endHour: 10 }, at(11), 'Asia/Nicosia'), false);
  assert.equal(away.inAwayWindow({ startHour: 1, endHour: 10 }, at(1), 'Asia/Nicosia'), true);
  assert.equal(away.inAwayWindow({ startHour: 1, endHour: 10 }, at(10), 'Asia/Nicosia'), false);
});
test('wrap window 22→04: 23:00 in, 02:00 in, 12:00 out', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 8, 11, h - 3, 0, 0));
  assert.equal(away.inAwayWindow({ startHour: 22, endHour: 4 }, at(23), 'Asia/Nicosia'), true);
  assert.equal(away.inAwayWindow({ startHour: 22, endHour: 4 }, at(2), 'Asia/Nicosia'), true);
  assert.equal(away.inAwayWindow({ startHour: 22, endHour: 4 }, at(12), 'Asia/Nicosia'), false);
});

suite('3. Away decision guards (fail-closed)');
const base = { settings: S(), now: new Date('2026-09-11T05:00:00Z'), direction: 'incoming', platform: 'instagram', text: 'سلام می‌خواستم رزرو کنم', conversationId: 'c1', authorId: 'a1', campaignHandled: false, repliesToday: 0, lastReplyAt: null };
test('happy path → reply in sender language', () => {
  const d = away.decideAwayReply({ ...base });
  assert.equal(d.reply, true); assert.equal(d.language, 'fa');
});
test('disabled / campaign flow / outgoing / other platform never reply', () => {
  assert.equal(away.decideAwayReply({ ...base, settings: S({ enabled: false }) }).reason, 'disabled');
  assert.equal(away.decideAwayReply({ ...base, campaignHandled: true }).reason, 'campaign_flow');
  assert.equal(away.decideAwayReply({ ...base, direction: 'outgoing' }).reason, 'outgoing');
  assert.equal(away.decideAwayReply({ ...base, platform: 'messenger' }).reason, 'not_instagram');
});
test('empty text or missing ids fail closed', () => {
  assert.equal(away.decideAwayReply({ ...base, text: '   ' }).reason, 'empty_text');
  assert.equal(away.decideAwayReply({ ...base, conversationId: '' }).reason, 'missing_ids');
});
test('outside window / daily cap / conversation gap fail closed', () => {
  const night = new Date('2026-09-11T12:00:00Z'); // 15:00 Cyprus → outside 1–10
  assert.equal(away.decideAwayReply({ ...base, now: night }).reason, 'outside_window');
  assert.equal(away.decideAwayReply({ ...base, repliesToday: 100 }).reason, 'daily_cap');
  assert.equal(away.decideAwayReply({ ...base, lastReplyAt: '2026-09-11T04:00:00Z' }).reason, 'conversation_recently_replied');
  assert.equal(away.decideAwayReply({ ...base, lastReplyAt: '2026-09-09T00:00:00Z' }).reply, true);
});

suite('4. Away settings sanitization');
test('clamps bad numbers, keeps valid texts, defaults missing languages', () => {
  const clean = away.sanitizeAwaySettings({ enabled: 'true', startHour: 99, endHour: -5, dailyCap: '50', perConversationHours: 3, messages: { fa: '  سلام  ' } });
  assert.equal(clean.enabled, true);
  assert.equal(clean.startHour, 23); assert.equal(clean.endHour, 0);
  assert.equal(clean.dailyCap, 50); assert.equal(clean.perConversationHours, 3);
  assert.equal(clean.messages.fa, 'سلام');
  assert.equal(clean.messages.ru, away.DEFAULT_AWAY_MESSAGES.ru);
});

suite('5. Blog import validation');
test('media_id required and constrained', () => {
  assert.equal(B({}).error, 'MEDIA_ID_REQUIRED');
  assert.equal(B({ media_id: 'not valid!' }).error, 'INVALID_MEDIA_ID');
  assert.equal(B({ media_id: '3401234567890123456', caption: 'x' }).ok, true);
});
test('media_type must be post|reel|story (default post)', () => {
  assert.equal(B({ media_id: '123', caption: 'x', media_type: 'video' }).error, 'INVALID_MEDIA_TYPE');
  assert.equal(B({ media_id: '123', caption: 'x' }).value.media_type, 'post');
});
test('caption required, bounded; urls must be http(s)', () => {
  assert.equal(B({ media_id: '123' }).error, 'CAPTION_REQUIRED');
  assert.equal(B({ media_id: '123', caption: 'x'.repeat(5001) }).error, 'CAPTION_TOO_LONG');
  assert.equal(B({ media_id: '123', caption: 'x', image_url: 'javascript:alert(1)' }).error, 'INVALID_IMAGE_URL');
  assert.equal(B({ media_id: '123', caption: 'x', permalink: 'example.com/x' }).error, 'INVALID_PERMALINK');
});
test('published_at parsed to ISO; language whitelisted; full valid payload', () => {
  const r = B({ media_id: '123', caption: 'سلام دنیا', permalink: 'https://instagram.com/p/abc/', image_url: 'https://cdn.example.com/img.jpg', published_at: '2026-09-11T14:30:00Z', language: 'de' });
  assert.equal(r.ok, true);
  assert.equal(r.value.published_at, '2026-09-11T14:30:00.000Z');
  assert.equal(r.value.language, undefined); // 'de' is not whitelisted → caller detects from caption
  assert.equal(r.value.permalink, 'https://instagram.com/p/abc/');
});
test('title falls back to a stable name when caption has no usable line', () => {
  assert.equal(blog.blogTitleFrom('سلام دنیا\nخط دوم', 'reel', '999'), 'سلام دنیا');
  assert.equal(blog.blogTitleFrom('###', 'post', '999'), 'Instagram post 999');
});

run({ title: 'Bazino — Instagram away auto-reply & Manus blog import', jsonOut: 'tests/reports/integrations.json' });
