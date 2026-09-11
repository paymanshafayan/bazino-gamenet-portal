/**
 * Jarvis routes — /api/management/jarvis/* (OpsCore staff auth).
 * The SAME console (shared/management/Jarvis.tsx) is mounted in both the
 * Management App and the site admin panel: the ops staff table is the site
 * users table, so a site admin's JWT works here directly (same pattern as
 * the promotions console). Approve/reject and config writes need the admin
 * role; chat needs any staff permission.
 */
import type express from 'express';
import { OpsCore, endpoint, fail } from '../management/core';
import {
  getJarvisConfig, sanitizeJarvisConfig, mergeApiKey, maskedJarvisConfig, providerConfigured,
  backupConfigured, listProviderModels, suggestedModels, todayUsage, JARVIS_CONFIG_KEY,
  BACKUP_PROVIDERS, JARVIS_PROVIDERS, type JarvisConfig, type JarvisProviderId,
} from './config';
import { JarvisEngine } from './agent';
import { createSkillRegistry } from './skills';
import { createApproval, listApprovals, decideApproval } from './approvals';
import { snapshot, recordSnapshot, monitorHistory } from './monitor';
import { listIncidents } from './incidents';
import { startJarvisAutomation, runJarvisJob } from './automation';

export interface JarvisDeps { core: OpsCore; getStore: () => any; fetcher?: typeof fetch; startAutomation?: boolean }

export function registerJarvis(app: express.Express, d: JarvisDeps) {
  const { core, getStore } = d;
  const approvals = { create: createApproval };
  const registry = createSkillRegistry(approvals);
  const engine = new JarvisEngine(core, getStore, registry, d.fetcher);
  if (d.startAutomation !== false) startJarvisAutomation(engine, registry);

  const staffAdmin = async (req: express.Request) => {
    const staff = await core.authorize(req);
    if (!staff.admin) fail('ADMIN_ONLY', 403);
    return staff.username;
  };

  /* ── shared handlers (actor resolution differs per mount) ─────── */

  const providerState = async (cfg: JarvisConfig) => {
    const [groq, openrouter, openai] = await Promise.all([
      todayUsage(core, 'groq'), todayUsage(core, 'openrouter'), todayUsage(core, 'openai'),
    ]);
    return {
      groq: {
        id: 'groq' as const, label: JARVIS_PROVIDERS.groq.label, role: 'primary' as const,
        configured: providerConfigured(cfg), model: cfg.model, usageToday: groq, cap: cfg.dailyCallCap,
      },
      openrouter: {
        id: 'openrouter' as const, label: JARVIS_PROVIDERS.openrouter.label, role: 'backup' as const,
        configured: backupConfigured(cfg, 'openrouter'), enabled: cfg.backup.openrouter.enabled,
        model: cfg.backup.openrouter.model, usageToday: openrouter, cap: cfg.backup.openrouter.dailyCallCap,
      },
      openai: {
        id: 'openai' as const, label: JARVIS_PROVIDERS.openai.label, role: 'backup' as const,
        configured: backupConfigured(cfg, 'openai'), enabled: cfg.backup.openai.enabled,
        model: cfg.backup.openai.model, usageToday: openai, cap: cfg.backup.openai.dailyCallCap,
      },
    };
  };

  const state = async () => {
    const cfg = await getJarvisConfig(getStore());
    const pending = (await listApprovals(core, 'pending')).length;
    const history: any = await monitorHistory(core);
    return {
      configured: providerConfigured(cfg),
      config: maskedJarvisConfig(cfg), freeModels: suggestedModels('groq'),
      providers: await providerState(cfg),
      suggestedModels: {
        groq: suggestedModels('groq'), openrouter: suggestedModels('openrouter'), openai: suggestedModels('openai'),
      },
      usage: { today: await todayUsage(core, 'groq'), cap: cfg.dailyCallCap },
      pendingApprovals: pending,
      skills: registry.catalog(),
      incidents: await listIncidents(core, 20),
      monitor: history.latest, briefsCount: (await core.list('jarvis-brief')).length,
    };
  };

  /** Merge incoming config; masked key placeholders keep the stored keys. */
  const mergeConfig = (previous: JarvisConfig, body: any): JarvisConfig => {
    const b = body || {};
    const backupIn = b.backup && typeof b.backup === 'object' ? b.backup : {};
    const backup: JarvisConfig['backup'] = {} as JarvisConfig['backup'];
    for (const id of BACKUP_PROVIDERS as Array<'openrouter' | 'openai'>) {
      const inc = backupIn[id] && typeof backupIn[id] === 'object' ? backupIn[id] : {};
      backup[id] = {
        enabled: inc.enabled === undefined ? previous.backup[id].enabled : inc.enabled === true,
        apiKey: mergeApiKey(String(inc.apiKey ?? '********'), previous.backup[id].apiKey),
        model: String(inc.model || previous.backup[id].model).slice(0, 160),
        dailyCallCap: Number.isFinite(Number(inc.dailyCallCap)) ? Number(inc.dailyCallCap) : previous.backup[id].dailyCallCap,
      };
    }
    return sanitizeJarvisConfig({ ...previous, ...b, apiKey: mergeApiKey(String(b.apiKey ?? '********'), previous.apiKey), backup });
  };

  const saveConfig = async (req: express.Request) => {
    const previous = await getJarvisConfig(getStore());
    const clean = mergeConfig(previous, req.body);
    await getStore().setSetting(JARVIS_CONFIG_KEY, JSON.stringify(clean));
    return maskedJarvisConfig(clean);
  };

  /** Graceful provider failures: a raw 5xx gets eaten by the edge proxy and
   *  the panel shows an HTML error page — return a readable Persian reply
   *  with the providerError code instead ( MESSAGE_EMPTY / SESSION_NOT_FOUND
   *  and other 4xx keep their normal error path ). */
  const providerHelp: Record<string, string> = {
    JARVIS_RATE_LIMITED: 'محدودیت نرخ موقت سرویس هوش مصنوعی — چند لحظه بعد دوباره امتحان کنید.',
    JARVIS_DAILY_CAP: 'سقف روزانهٔ فراخوانی‌های هوش مصنوعی پر شده است؛ فردا ریست می‌شود.',
    JARVIS_BAD_KEY: 'کلید API سرویس نامعتبر است — از تنظیمات جارویس کلید را بررسی کنید.',
    JARVIS_QUOTA_EXHAUSTED: 'اعتبار سرویس تمام شده است (مثلاً حساب OpenAI شارژ نشده) — از تنظیمات جارویس بررسی کنید.',
    JARVIS_NETWORK_ERROR: 'اتصال به سرویس هوش مصنوعی برقرار نشد؛ دوباره امتحان کنید.',
    JARVIS_PRIMARY_UNAVAILABLE: 'موتور اصلی (Groq) در دسترس نیست و این کار روی پشتیبان‌ها مجاز نیست؛ بعداً دوباره امتحان کنید.',
    JARVIS_PROVIDER_ERROR: 'سرویس هوش مصنوعی پاسخ نداد — احتمالاً مدل انتخابی نامعتبر یا موقتاً قطع است؛ از تنظیمات جارویس مدل دیگری (مثلاً openai/gpt-oss-120b) انتخاب کنید.',
  };

  const chat = async (req: express.Request, actor: string) => {
    try {
      return await engine.chat({
        sessionId: (req.body || {}).sessionId ? String((req.body).sessionId) : undefined,
        message: String((req.body || {}).message || ''),
        actor, language: String((req.body || {}).language || 'fa'),
      });
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code.startsWith('JARVIS_')) {
        return {
          sessionId: '', reply: providerHelp[code] || 'سرویس هوش مصنوعی موقتاً در دسترس نیست؛ دوباره امتحان کنید.',
          approvalsCreated: [], toolsUsed: [], providerError: code, usageToday: await todayUsage(core, 'groq'),
        };
      }
      throw e;
    }
  };

  const decide = async (req: express.Request, decidedBy: string) =>
    decideApproval(core, {
      id: String(req.params.id), action: String(req.params.action) === 'approve' ? 'approve' : 'reject',
      decidedBy, getStore, runDirect: (ctx, skillId, params) => registry.runDirect(ctx, skillId, params),
    });

  const monitorNow = async () => {
    const snap = await snapshot(core, d.fetcher);
    await recordSnapshot(core, snap).catch(() => {});
    return snap;
  };

  const briefs = async () => (await core.list<any>('jarvis-brief'))
    .map(r => ({ id: r.id, ...r.data }))
    .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 20);

  const models = async (req: express.Request) => {
    const provider = String((req.body || {}).provider || 'groq') as JarvisProviderId;
    if (!BACKUP_PROVIDERS.includes(provider as any) && provider !== 'groq') fail('INVALID_PROVIDER', 400);
    const cfg = await getJarvisConfig(getStore());
    const apiKey = provider === 'groq' ? cfg.apiKey : cfg.backup[provider as 'openrouter' | 'openai'].apiKey;
    return { provider, ...(await listProviderModels(provider, apiKey, d.fetcher)) };
  };

  /* ── Management App mount (OpsCore staff auth) ────────────────── */

  const M = '/api/management/jarvis';
  app.get(`${M}/state`, core.guard(), endpoint(async (_req, res) => res.json(await state())));
  app.put(`${M}/config`, endpoint(async (req, res) => { await staffAdmin(req); res.json(await saveConfig(req)); }));
  app.post(`${M}/models`, endpoint(async (req, res) => { await staffAdmin(req); res.json(await models(req)); }));
  app.post(`${M}/chat`, core.guard(), endpoint(async (req, res) => res.json(await chat(req, String((req as any).staff.username || 'staff')))));
  app.get(`${M}/sessions`, core.guard(), endpoint(async (_req, res) => res.json({ sessions: await engine.sessions() })));
  app.get(`${M}/sessions/:id`, core.guard(), endpoint(async (req, res) => {
    const s = await engine.session(String(req.params.id));
    if (!s) fail('NOT_FOUND', 404);
    res.json(s);
  }));
  app.get(`${M}/approvals`, core.guard(), endpoint(async (req, res) =>
    res.json({ items: await listApprovals(core, req.query.status ? String(req.query.status) : undefined) })));
  app.post(`${M}/approvals/:id/:action`, endpoint(async (req, res) => {
    const username = await staffAdmin(req);
    res.json(await decide(req, username));
  }));
  app.get(`${M}/monitor`, core.guard(), endpoint(async (_req, res) => res.json(await monitorNow())));
  app.get(`${M}/monitor/history`, core.guard(), endpoint(async (_req, res) => res.json(await monitorHistory(core))));
  app.get(`${M}/incidents`, core.guard(), endpoint(async (req, res) =>
    res.json({ items: await listIncidents(core, Number(req.query.limit) || 30) })));
  app.get(`${M}/briefs`, core.guard(), endpoint(async (_req, res) => res.json({ items: await briefs() })));
  app.post(`${M}/jobs/:id/run`, endpoint(async (req, res) => {
    await staffAdmin(req);
    res.json({ ok: true, result: await runJarvisJob(engine, registry, String(req.params.id)) });
  }));

  return { engine, registry };
}
