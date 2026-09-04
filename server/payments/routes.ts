/**
 * مسیرهای پرداخت آنلاین (PayTR iFrame API).
 *
 *   GET  /api/payments/config                 → وضعیت درگاه برای فرانت‌اند (فعال/تست/ارز)
 *   POST /api/payments/paytr/create           → ساخت سفارش pending + گرفتن iframe token
 *   POST /api/payments/paytr/callback         → Bildirim URL (سرور→سرور، فقط «OK»)
 *   GET  /api/payments/orders/:oid            → وضعیت سفارش برای صفحهٔ success (polling)
 *   GET  /api/payments/paytr/mock/:oid        → صفحهٔ شبیه‌ساز درگاه (فقط PAYTR_MOCK=1)
 *   GET  /api/admin/payments                  → فهرست تراکنش‌ها (ادمین)
 *   POST /api/admin/payments/:oid/refund      → İade (ادمین)
 *
 * قیمت همیشه سمت سرور از کاتالوگ محاسبه می‌شود؛ تکمیل سفارش (کسر موجودی، امتیاز، لاگ رزرو)
 * فقط در callback و فقط یک بار (idempotent روی merchant_oid) انجام می‌شود.
 */
import type express from 'express';
import { urlencoded as expressUrlencoded } from 'express';
import type { IDataStore, PaymentOrderRow } from '../dataProviders';
import {
  readPaytrConfig, generateMerchantOid, isValidMerchantOid, encodeBasket, requestIframeToken, iframeUrlForToken,
  verifyCallbackHash, buildCallbackHash, requestRefund, clientIpFromHeaders, sanitizeEmail, toKurus, PAYTR_IFRAME_RESIZER,
  type PaytrCurrency,
} from './paytr';

export type OrderKind = 'reservation' | 'cafe' | 'shop' | 'tournament';

/** آنچه بخش‌های دیگر سرور باید در اختیار ماژول بگذارند. */
export interface PaymentDeps {
  app: express.Express;
  getStore: () => IDataStore;
  requireAdmin: express.RequestHandler;
  /** نام کاربر لاگین‌شده از توکن (یا undefined). */
  authUsername: (req: express.Request) => string | undefined;
  /** پیش‌فاکتور: قیمت نهایی + سبد + اعتبارسنجی (موجودی/کوپن/هم‌پوشانی). خطا با statusCode پرتاب می‌کند. */
  quote: (kind: OrderKind, params: any, username: string | undefined) => Promise<{
    amount: number; basket: Array<{ name: string; unitPrice: number; qty: number }>; payload: any; description: string;
  }>;
  /** تکمیل سفارش بعد از پرداخت موفق (کسر موجودی، امتیاز، لاگ‌ها). فقط یک بار صدا زده می‌شود. */
  fulfil: (kind: OrderKind, payload: any, username: string, order: PaymentOrderRow) => Promise<any>;
  currency: PaytrCurrency;
  /** نرخ امتیاز: هر چند واحد پول = ۱ امتیاز. */
  pointsPerUnit: number;
}

const KINDS: OrderKind[] = ['reservation', 'cafe', 'shop', 'tournament'];

export function registerPaymentRoutes(d: PaymentDeps) {
  const { app } = d;
  const cfg = () => readPaytrConfig();

  const publicUrl = (req: express.Request) => {
    const c = cfg();
    if (c?.publicUrl) return c.publicUrl;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
    return `${proto}://${req.get('host')}`;
  };

  app.get('/api/payments/config', (_req, res) => {
    const c = cfg();
    res.json({
      enabled: !!c,
      // تسک ۱۳: آنلاین موقتاً غیرفعال؛ فرانت‌اند از /api/payments/methods روش‌های جایگزین را می‌خواند
      onlineDisabled: !c,
      provider: 'paytr',
      testMode: c ? c.testMode : false,
      mock: c ? c.mock : false,
      currency: d.currency,
      pointsPerUnit: d.pointsPerUnit,
      iframeResizer: PAYTR_IFRAME_RESIZER,
    });
  });

  app.post('/api/payments/paytr/create', async (req, res) => {
    const c = cfg();
    if (!c) return res.status(503).json({ error: 'Online payment is not configured', code: 'PAYMENT_DISABLED' });
    try {
      const { kind, params, customer, lang, consent } = req.body || {};
      if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Invalid order kind', code: 'BAD_KIND' });
      if (consent !== true) return res.status(400).json({ error: 'Legal consent is required', code: 'CONSENT_REQUIRED' });
      const username = d.authUsername(req) || '';
      const store = d.getStore();
      const user = username ? await store.getUserByUsername(username) : undefined;

      const q = await d.quote(kind, params || {}, username || undefined);
      if (!(q.amount > 0)) return res.status(400).json({ error: 'Amount must be positive', code: 'BAD_AMOUNT' });
      const amountKurus = toKurus(q.amount);
      if (amountKurus < 100) return res.status(400).json({ error: 'Minimum payment is 1.00', code: 'BAD_AMOUNT' });

      const merchantOid = generateMerchantOid();
      const email = sanitizeEmail(customer?.email || user?.email || '');
      const name = String(customer?.name || user?.username || 'Guest').slice(0, 60) || 'Guest';
      const phone = String(customer?.phone || user?.phone || '0000000000').slice(0, 20);
      const address = String(customer?.address || 'Bazino Gaming Lounge, Iskele').slice(0, 400);
      const now = new Date().toISOString();

      await store.createPaymentOrder({
        merchantOid, kind, username, email, amountKurus, currency: d.currency, status: 'pending', provider: 'paytr',
        payload: JSON.stringify({ params: q.payload, description: q.description, customer: { name, email, phone } }),
        result: '', totalAmountKurus: 0, failedCode: '', failedMsg: '', createdAt: now, updatedAt: now,
      });

      const base = publicUrl(req);
      const token = await requestIframeToken(c, {
        merchantOid, userIp: clientIpFromHeaders(req.headers as any, req.ip || '127.0.0.1'), email, amountKurus,
        userBasketB64: encodeBasket(q.basket), currency: d.currency, noInstallment: 1, maxInstallment: 0,
        userName: name, userAddress: address, userPhone: phone,
        okUrl: `${base}/payment/success?oid=${merchantOid}`, failUrl: `${base}/payment/fail?oid=${merchantOid}`,
        lang: lang === 'tr' ? 'tr' : 'en', timeoutLimit: 30, debugOn: 0,
      });

      res.json({
        success: true, merchantOid, amount: q.amount, amountKurus, currency: d.currency,
        iframeUrl: iframeUrlForToken(c, token), iframeResizer: c.mock ? '' : PAYTR_IFRAME_RESIZER,
        testMode: c.testMode, mock: c.mock, description: q.description,
      });
    } catch (e: any) {
      res.status(e?.statusCode || 500).json({ error: e?.message || String(e), code: e?.code || 'PAYMENT_CREATE_FAILED' });
    }
  });

  /** پردازش نتیجه (مشترک بین callback واقعی و mock). خروجی: متن پاسخ. */
  async function processCallback(body: Record<string, any>): Promise<{ status: number; text: string }> {
    const c = cfg();
    if (!c) return { status: 503, text: 'PAYTR notification failed: payments disabled' };
    const merchantOid = String(body.merchant_oid || '');
    if (!isValidMerchantOid(merchantOid)) return { status: 400, text: 'PAYTR notification failed: bad merchant_oid' };
    if (!verifyCallbackHash(c, { merchant_oid: merchantOid, status: String(body.status), total_amount: String(body.total_amount), hash: String(body.hash) })) {
      console.warn('[PayTR] callback with bad hash for', merchantOid);
      return { status: 400, text: 'PAYTR notification failed: bad hash' };
    }
    const store = d.getStore();
    const order = await store.getPaymentOrder(merchantOid);
    if (!order) return { status: 404, text: 'PAYTR notification failed: order not found' };
    // تکراری → فقط OK (PayTR ممکن است چند بار بفرستد)
    if (order.status === 'success' || order.status === 'failed') return { status: 200, text: 'OK' };

    const ok = String(body.status) === 'success';
    const totalAmountKurus = Number.parseInt(String(body.total_amount || '0'), 10) || 0;
    const now = new Date().toISOString();
    if (!ok) {
      await store.updatePaymentOrder(merchantOid, {
        status: 'failed', totalAmountKurus, failedCode: String(body.failed_reason_code || ''),
        failedMsg: String(body.failed_reason_msg || '').slice(0, 500), result: JSON.stringify(body).slice(0, 4000), updatedAt: now,
      });
      return { status: 200, text: 'OK' };
    }
    if (totalAmountKurus < order.amountKurus) {
      // مبلغ کمتر از سفارش: تأیید نکن ولی OK بده تا PayTR تکرار نکند؛ برای بررسی دستی علامت بزن
      await store.updatePaymentOrder(merchantOid, { status: 'failed', totalAmountKurus, failedCode: 'AMOUNT_MISMATCH', failedMsg: `paid ${totalAmountKurus} < due ${order.amountKurus}`, result: JSON.stringify(body).slice(0, 4000), updatedAt: now });
      console.error('[PayTR] amount mismatch', merchantOid, totalAmountKurus, order.amountKurus);
      return { status: 200, text: 'OK' };
    }
    // ابتدا وضعیت را قفل کن تا callback هم‌زمان دوباره fulfil نکند
    await store.updatePaymentOrder(merchantOid, { status: 'success', totalAmountKurus, updatedAt: now });
    try {
      const payload = JSON.parse(order.payload || '{}');
      const result = await d.fulfil(order.kind as OrderKind, payload.params, order.username, order);
      await store.updatePaymentOrder(merchantOid, { result: JSON.stringify({ callback: body, fulfilment: result }).slice(0, 8000), updatedAt: new Date().toISOString() });
    } catch (e: any) {
      console.error('[PayTR] fulfilment failed for', merchantOid, e);
      await store.updatePaymentOrder(merchantOid, { status: 'paid_unfulfilled', failedCode: 'FULFIL_ERROR', failedMsg: String(e?.message || e).slice(0, 500), updatedAt: new Date().toISOString() });
    }
    return { status: 200, text: 'OK' };
  }

  // Bildirim URL: بدون لاگین، بدون CSRF، پاسخ متن ساده.
  // PayTR بدنه را به‌صورت application/x-www-form-urlencoded می‌فرستد.
  const formParser = expressUrlencoded({ extended: false, limit: '64kb' });
  app.post('/api/payments/paytr/callback', formParser, async (req, res) => {
    try {
      const r = await processCallback(req.body || {});
      res.status(r.status).type('text/plain').send(r.text);
    } catch (e: any) {
      console.error('[PayTR] callback error', e);
      res.status(500).type('text/plain').send('PAYTR notification failed: server error');
    }
  });

  app.get('/api/payments/orders/:oid', async (req, res) => {
    const oid = String(req.params.oid || '');
    if (!isValidMerchantOid(oid)) return res.status(400).json({ error: 'bad oid' });
    const o = await d.getStore().getPaymentOrder(oid);
    if (!o) return res.status(404).json({ error: 'not found' });
    let description = '';
    try { description = JSON.parse(o.payload || '{}').description || ''; } catch { /* ignore */ }
    res.json({
      merchantOid: o.merchantOid, kind: o.kind, status: o.status, amount: o.amountKurus / 100, currency: o.currency,
      failedCode: o.failedCode, failedMsg: o.failedMsg, description, createdAt: o.createdAt, updatedAt: o.updatedAt,
    });
  });

  // شبیه‌ساز درگاه برای توسعه/تست خودکار (فقط وقتی PAYTR_MOCK=1)
  app.get('/api/payments/paytr/mock/:oid', async (req, res) => {
    const c = cfg();
    if (!c?.mock) return res.status(404).send('not found');
    const oid = String(req.params.oid || '');
    const o = await d.getStore().getPaymentOrder(oid);
    if (!o) return res.status(404).send('order not found');
    res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>PayTR MOCK</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f6fb;margin:0;padding:24px;color:#1b2430}
.card{max-width:420px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:24px}
h1{font-size:18px;margin:0 0 6px}.amt{font-size:28px;font-weight:800;margin:10px 0 18px}
button{width:100%;padding:12px;border:0;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;margin-top:8px}
.ok{background:#16a34a;color:#fff}.no{background:#dc2626;color:#fff}.tag{display:inline-block;background:#fde68a;color:#78350f;font-size:11px;padding:2px 8px;border-radius:999px;font-weight:700}
input{width:100%;padding:10px;border:1px solid #d5dae3;border-radius:8px;margin:4px 0 10px;font-size:14px;box-sizing:border-box}</style></head>
<body><div class="card"><span class="tag">İŞLEMİ TEST MODUNDA YAPIYORSUNUZ (MOCK)</span><h1>PayTR Güvenli Ödeme</h1>
<div>Sipariş: <code>${oid}</code></div><div class="amt">${(o.amountKurus / 100).toFixed(2)} ${o.currency}</div>
<label>Kart No</label><input value="4355 0843 5508 4358" readonly><label>SKT / CVV</label><input value="12/30 · 000" readonly>
<form method="post" action="/api/payments/paytr/mock/${oid}/decide"><button class="ok" name="decision" value="success" id="mock-pay-ok">Ödemeyi Tamamla</button>
<button class="no" name="decision" value="failed" id="mock-pay-fail">Ödemeyi İptal Et</button></form></div></body></html>`);
  });

  app.post('/api/payments/paytr/mock/:oid/decide', formParser, async (req, res) => {
    const c = cfg();
    if (!c?.mock) return res.status(404).send('not found');
    const oid = String(req.params.oid || '');
    const o = await d.getStore().getPaymentOrder(oid);
    if (!o) return res.status(404).send('order not found');
    const decision = String((req.body || {}).decision) === 'failed' ? 'failed' : 'success';
    const total = String(o.amountKurus);
    const body: Record<string, string> = {
      merchant_oid: oid, status: decision, total_amount: total, hash: buildCallbackHash(c, oid, decision, total),
      test_mode: '1', payment_type: 'card', currency: o.currency, payment_amount: total,
      ...(decision === 'failed' ? { failed_reason_code: '6', failed_reason_msg: 'Müşteri ödeme yapmaktan vazgeçti.' } : {}),
    };
    await processCallback(body);
    const base = publicUrl(req);
    // مثل PayTR واقعی: top-level redirect به ok/fail URL
    const target = `${base}/payment/${decision === 'success' ? 'success' : 'fail'}?oid=${oid}`;
    res.type('html').send(`<!doctype html><meta charset="utf-8"><script>if (window.top !== window) { window.top.location.href = ${JSON.stringify(target)}; } else { location.href = ${JSON.stringify(target)}; }</script>Redirecting…`);
  });

  // ---- ادمین ----
  app.get('/api/admin/payments', d.requireAdmin, async (_req, res) => {
    const rows = await d.getStore().listPaymentOrders(300);
    res.json(rows.map(o => ({ ...o, payload: undefined, result: undefined, amount: o.amountKurus / 100, totalAmount: o.totalAmountKurus / 100 })));
  });

  app.post('/api/admin/payments/:oid/refund', d.requireAdmin, async (req, res) => {
    const c = cfg();
    if (!c) return res.status(503).json({ error: 'payments disabled' });
    const oid = String(req.params.oid || '');
    const store = d.getStore();
    const o = await store.getPaymentOrder(oid);
    if (!o) return res.status(404).json({ error: 'not found' });
    if (o.status !== 'success' && o.status !== 'paid_unfulfilled') return res.status(400).json({ error: 'only successful payments can be refunded' });
    const amount = Number(req.body?.amount) > 0 ? Number(req.body.amount) : o.totalAmountKurus / 100;
    const r = await requestRefund(c, oid, amount);
    if (!r.ok) return res.status(502).json({ error: r.raw?.err_msg || 'refund failed', raw: r.raw });
    await store.updatePaymentOrder(oid, { status: 'refunded', result: JSON.stringify({ refund: r.raw }).slice(0, 4000), updatedAt: new Date().toISOString() });
    res.json({ success: true, refund: r.raw });
  });
}
