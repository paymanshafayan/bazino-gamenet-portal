/**
 * برداشت قرارداد واقعی API برای اپ ادمین فلاتر (admin_app).
 * سرور واقعی dist/server.cjs روی :3000، لاگین ادمین واقعی، همهٔ GETهای مصرفی
 * اپ + چند round-trip نوشتاری. خروجی: api_contract.json
 */
const BASE = 'http://127.0.0.1:3000';
const fs = require('fs');

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  const { token, user } = await login.json();
  console.log('login:', login.status, 'role:', user.role);
  const H = { Authorization: `Bearer ${token}` };
  const HJ = { ...H, 'Content-Type': 'application/json' };

  const out = { capturedAt: new Date().toISOString(), base: BASE, user: { username: user.username, role: user.role }, endpoints: {}, writes: {} };

  const gets = [
    '/api/admin/stats', '/api/admin/storage-status', '/api/data-source', '/api/admin/users',
    '/api/systems', '/api/cafe', '/api/accessories', '/api/tournaments', '/api/tournaments/events',
    '/api/articles', '/api/app-sliders', '/api/messages', '/api/chat/rooms', '/api/themes',
    '/api/coupons', '/api/settings',
    '/api/admin/tickets', '/api/admin/db-logs',
    '/api/admin/affiliates', '/api/admin/affiliates/report', '/api/admin/affiliate-settings', '/api/admin/ig-campaign',
    '/api/admin/appetize/status',
    '/api/management/me', '/api/management/bootstrap', '/api/management/floor', '/api/management/reservations',
    '/api/management/orders', '/api/management/onsite-orders', '/api/management/cashouts', '/api/management/customers',
    '/api/management/receipts', '/api/management/reports', '/api/management/settlements',
    '/api/management/coupons', '/api/management/special-hours', '/api/management/content',
    '/api/management/tournaments', '/api/management/messaging/audience', '/api/management/messaging/campaigns',
    '/api/management/jarvis/state', '/api/management/jarvis/sessions', '/api/management/jarvis/approvals',
    '/api/management/publishing/reports', '/api/management/publishing/campaigns', '/api/management/publishing/events',
  ];
  for (const path of gets) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: H });
      const text = await res.text();
      let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
      out.endpoints[path] = { status: res.status, sample: body };
      console.log(res.status, path);
    } catch (e) {
      out.endpoints[path] = { status: 0, error: String(e) };
      console.log('ERR', path, String(e).slice(0, 80));
    }
  }

  // ── round-trip نوشتاری برای شکل درخواست/پاسخ CRUD ──
  const w = out.writes;

  // systems
  let res = await fetch(`${BASE}/api/admin/systems`, { method: 'POST', headers: HJ, body: JSON.stringify({ name: 'CT-TEST', type: 'PC', hourlyRate: 120000, status: 'available' }) });
  w.system_create = { status: res.status, body: await res.json() };
  const sysId = w.system_create.body?.systems?.find?.((s) => s.name === 'CT-TEST')?.id || w.system_create.body?.system?.id;
  if (sysId) {
    res = await fetch(`${BASE}/api/admin/systems/${sysId}`, { method: 'PUT', headers: HJ, body: JSON.stringify({ name: 'CT-TEST', type: 'PC', hourlyRate: 130000, status: 'available' }) });
    w.system_update = { status: res.status, body: (await res.json()).systems?.find?.((s) => s.id === sysId) ?? (await res.text()).slice(0, 100) };
    res = await fetch(`${BASE}/api/admin/systems/${sysId}`, { method: 'DELETE', headers: H });
    w.system_delete = { status: res.status };
  }

  // cafe
  res = await fetch(`${BASE}/api/admin/cafe`, { method: 'POST', headers: HJ, body: JSON.stringify({ name: 'Test Item', category: 'Foods', price: 50000, inventory: 5 }) });
  w.cafe_create = { status: res.status, body: await res.json() };
  const cafeId = w.cafe_create.body?.cafeItems?.slice?.(-1)[0]?.id;
  if (cafeId) { res = await fetch(`${BASE}/api/admin/cafe/${cafeId}`, { method: 'DELETE', headers: H }); w.cafe_delete = { status: res.status }; }

  // articles
  res = await fetch(`${BASE}/api/admin/articles`, { method: 'POST', headers: HJ, body: JSON.stringify({ title: 'Test Article', content: 'body', category: 'News', author: 'admin' }) });
  w.article_create = { status: res.status, body: await res.json() };
  const artId = w.article_create.body?.articles?.slice?.(-1)[0]?.id;
  if (artId) { res = await fetch(`${BASE}/api/admin/articles/${artId}`, { method: 'DELETE', headers: H }); w.article_delete = { status: res.status }; }

  // app-sliders
  res = await fetch(`${BASE}/api/admin/app-sliders`, { method: 'POST', headers: HJ, body: JSON.stringify({ title: 'Test Slide', subtitle: 'sub', imageUrl: '/images/hero/main.webp', target: 'home' }) });
  w.slider_create = { status: res.status, body: await res.json() };
  const slId = w.slider_create.body?.sliders?.slice?.(-1)[0]?.id || w.slider_create.body?.slider?.id;
  if (slId) { res = await fetch(`${BASE}/api/admin/app-sliders/${slId}`, { method: 'DELETE', headers: H }); w.slider_delete = { status: res.status }; }

  // coupons (management)
  res = await fetch(`${BASE}/api/management/coupons`, { method: 'POST', headers: HJ, body: JSON.stringify({ code: 'TESTADMIN1', value: 10, min: 0, expiresDays: 30 }) });
  w.coupon_create = { status: res.status, body: await res.json() };
  const cpId = w.coupon_create.body?.id || w.coupon_create.body?.coupon?.id;
  if (cpId) { res = await fetch(`${BASE}/api/management/coupons/${cpId}/delete`, { method: 'POST', headers: HJ, body: '{}' }); w.coupon_delete = { status: res.status }; }

  // admin message
  res = await fetch(`${BASE}/api/admin/messages`, { method: 'POST', headers: HJ, body: JSON.stringify({ title: 'Test', body: 'hello from contract capture', sendAsNotification: true }) });
  w.message_create = { status: res.status, body: await res.json() };

  // theme list + install-jobs shape (از تست قبلی می‌دانیم؛ فقط فیلدهای کلیدی)
  out.themeInstallFlow = {
    note: 'POST /api/admin/themes/install → 202 {jobId,themeId,version,progress,pollUrl} → GET /api/admin/themes/install-jobs/:jobId تا completed/failed',
    verified: true,
  };

  fs.writeFileSync('/home/user/bazino-gamenet-portal/admin_app/api_contract.json', JSON.stringify(out, null, 2));
  console.log('DONE → admin_app/api_contract.json (' + Object.keys(out.endpoints).length + ' GET shapes)');
}
main().catch((e) => { console.error(e); process.exit(1); });
