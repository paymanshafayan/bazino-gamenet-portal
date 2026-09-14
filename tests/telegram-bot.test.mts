/**
 * Telegram bot — pure logic tests (parser, limiter, matcher, commands).
 * No network: t.me parsing uses an HTML fixture captured from the real
 * t.me/s/<channel> markup shape.
 */
import { suite, test, assert, run } from './harness.mts';
import { parseTmeS, stripTags, parseViews, recentPosts, searchPosts } from '../services/telegram-bot/tme.mjs';
import {
  escapeHtml, parseCommand, isOwner, matchKeywords, RateLimiter, formatHit, DEFAULT_KEYWORDS,
} from '../services/telegram-bot/lib.mjs';

const FIXTURE = `
<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="kibrispostasi/101">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text js-message_text" dir="auto">
  <b>PS5 turnuvası</b> bu hafta sonu — <a href="https://example.com">kayıt linki</a>
  </div>
  <span class="tgme_widget_message_views">1.2K</span>
  <time datetime="2026-09-14T10:00:00+00:00"></time>
</div></div></div>
<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="kibrispostasi/102">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text" dir="auto">
  Döviz kurları bugün yükseldi &amp; piyasalar sakin
  </div>
  <span class="tgme_widget_message_views">890</span>
  <time datetime="2026-09-14T11:30:00+00:00"></time>
</div></div></div>
<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="kibrispostasi/103">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text" dir="auto">
  İskele&#39;de yeni kafe açıldı — مسابقهٔ گیمینگ هفتهٔ بعد
  </div>
  <span class="tgme_widget_message_views">3,4K</span>
  <time datetime="2026-09-14T12:00:00+00:00"></time>
</div></div></div>`;

suite('T. Telegram bot (pure logic)');

test('parseTmeS extracts posts with id/text/views/time/link', () => {
  const posts = parseTmeS(FIXTURE, 'kibrispostasi');
  assert.equal(posts.length, 3, 'three posts');
  assert.equal(posts[0].channel, 'kibrispostasi');
  assert.equal(posts[0].id, 101);
  assert.ok(posts[0].text.includes('PS5 turnuvası'), 'bold tag stripped but text kept: ' + posts[0].text);
  assert.ok(!posts[0].text.includes('<b>'), 'no raw tags');
  assert.equal(posts[0].views, '1.2K');
  assert.equal(posts[0].timeISO.slice(0, 10), '2026-09-14');
  assert.equal(posts[0].link, 'https://t.me/kibrispostasi/101');
  });

  test('parseTmeS decodes entities and tolerates empty input', () => {
  const posts = parseTmeS(FIXTURE);
  assert.ok(posts[2].text.includes("İskele'de"), 'numeric entity decoded');
  assert.ok(posts[2].text.includes('مسابقهٔ گیمینگ'), 'persian text kept');
  assert.equal(parseTmeS('', 'x').length, 0);
  assert.equal(parseTmeS(null as any).length, 0);
  });

  test('parseViews converts K/M badges', () => {
  assert.equal(parseViews('1.2K'), 1200);
  assert.equal(parseViews('3,4M'), 3400000);
  assert.equal(parseViews('890'), 890);
  assert.equal(parseViews(''), 0);
  });

  test('recentPosts filters by hours, keeps timeless posts', () => {
  const now = Date.parse('2026-09-14T13:00:00Z');
  const posts = parseTmeS(FIXTURE);
  const recent = recentPosts(posts, 24, now);
  assert.equal(recent.length, 3);
    const stale = recentPosts(posts, 1, now + 48 * 3600e3);
    assert.equal(stale.length, 0, 'all posts older than the 1h window drop');
  });

  test('searchPosts matches all terms case-insensitively', () => {
  const posts = parseTmeS(FIXTURE);
  assert.equal(searchPosts(posts, 'ps5 turnuva').length, 1);
  assert.equal(searchPosts(posts, 'PS5').length, 1);
  assert.equal(searchPosts(posts, 'döviz').length, 1);
  assert.equal(searchPosts(posts, 'yokyokyok').length, 0);
  assert.equal(searchPosts(posts, '').length, 0);
  });

  test('matchKeywords catches gaming buzz in tr/fa/en', () => {
  assert.ok(matchKeywords('Büyük FIFA turnuvası başlıyor').includes('fifa'));
  assert.ok(matchKeywords('مسابقهٔ گیمینگ اسکله').length >= 2, 'fa + local hit');
  assert.ok(matchKeywords('İskele Long Beach etkinliği').length >= 2);
  assert.equal(matchKeywords('döviz kurları yükseldi').length, 0, 'no false hit');
  assert.equal(matchKeywords('').length, 0);
  });

  test('RateLimiter enforces window cap and min gap (ToS anti-spam)', () => {
  const rl = new RateLimiter({ maxPerWindow: 2, windowMs: 1000, minGapMs: 100 });
  const t = 1_000_000;
  assert.ok(rl.allow('g1', t).ok, 'first send allowed');
  assert.equal(rl.allow('g1', t + 50).ok, false, 'min gap blocks');
  assert.ok(rl.allow('g1', t + 150).ok, 'second send allowed after gap');
  const third = rl.allow('g1', t + 400);
  assert.equal(third.ok, false, 'window cap reached');
  assert.equal((third as any).reason, 'window_full');
  assert.ok(rl.allow('g2', t).ok, 'other group unaffected');
  assert.equal(rl.wouldAllow('g1', t + 500), false);
  });

  test('parseCommand splits cmd/args and strips bot suffix', () => {
  assert.deepEqual(parseCommand('/post Hello world'), { cmd: 'post', args: 'Hello world' });
  assert.deepEqual(parseCommand('/SEARCH@bazino_ops_bot  ps5 '), { cmd: 'search', args: 'ps5' });
  assert.equal(parseCommand('plain text'), null);
  assert.deepEqual(parseCommand('/id'), { cmd: 'id', args: '' });
  });

  test('isOwner checks the whitelist only', () => {
  assert.ok(isOwner(111, '111,222'));
  assert.ok(isOwner('222', '111,222'));
  assert.equal(isOwner(333, '111,222'), false);
  assert.equal(isOwner(111, ''), false);
  });

  test('escapeHtml and formatHit produce safe Telegram HTML', () => {
  assert.equal(escapeHtml('<b>&</b>'), '&lt;b&gt;&amp;&lt;/b&gt;');
  const line = formatHit({ id: 1, channel: 'k<p>', text: 'a<b>c', views: '', timeISO: '2026-09-14T10:00:00Z', link: 'https://t.me/x/1' }, ['ps5']);
  assert.ok(!line.includes('<p>'), 'channel escaped');
  assert.ok(!/<b>c/.test(line), 'text escaped');
  assert.ok(line.includes('🎯 ps5'));
  });

  test('default keyword/watchlist sanity', () => {
assert.ok(DEFAULT_KEYWORDS.includes('turnuva'));
assert.ok(DEFAULT_KEYWORDS.some((k) => k.includes('مسابقه')));
});

await run({ title: 'Bazino — Telegram bot tests', jsonOut: 'tests/reports/telegram-bot.json' });
