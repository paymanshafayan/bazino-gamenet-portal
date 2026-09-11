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
  listGroqModels, FREE_GROQ_MODELS, todayUsage, JARVIS_CONFIG_KEY,
} from './config';
import { JarvisEngine } from './agent';
import { createSkillRegistry } from './skills';
import { createApproval, listApprovals, decideApproval } from './approvals';
import { snapshot, recordSnapshot, monitorHistory } from './monitor';
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

  const state = async () => {
    const cfg = await getJarvisConfig(getStore());
    const pending = (await listApprovals(core, 'pending')).length;
    const history: any = await monitorHistory(core);
    return {
      configured: providerConfigured(cfg),
      config: maskedJarvisConfig(cfg), freeModels: FREE_GROQ_MODELS,
      usage: { today: await todayUsage(core), cap: cfg.dailyCallCap },
      pendingApprovals: pending,
      skills: registry.catalog(),
      monitor: history.latest, briefsCount: (await core.list('jarvis-brief')).length,
    };
  };

  const saveConfig = async (req: express.Request) => {
    const previous = await getJarvisConfig(getStore());
    const incoming = sanitizeJarvisConfig({ ...previous, ...(req.body || {}) });
    const clean = { ...incoming, apiKey: mergeApiKey(String((req.body || {}).apiKey ?? '********'), previous.apiKey) };
    await getStore().setSetting(JARVIS_CONFIG_KEY, JSON.stringify(clean));
    return maskedJarvisConfig(clean);
  };

  const chat = async (req: express.Request, actor: string) =>
    engine.chat({
      sessionId: (req.body || {}).sessionId ? String((req.body).sessionId) : undefined,
      message: String((req.body || {}).message || ''),
      actor, language: String((req.body || {}).language || 'fa'),
    });

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

  /* ── Management App mount (OpsCore staff auth) ────────────────── */

  const M = '/api/management/jarvis';
  app.get(`${M}/state`, core.guard(), endpoint(async (_req, res) => res.json(await state())));
  app.put(`${M}/config`, endpoint(async (req, res) => { await staffAdmin(req); res.json(await saveConfig(req)); }));
  app.post(`${M}/models`, endpoint(async (req, res) => {
    await staffAdmin(req);
    const cfg = await getJarvisConfig(getStore());
    res.json({ models: await listGroqModels(cfg.apiKey, d.fetcher) });
  }));
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
  app.get(`${M}/briefs`, core.guard(), endpoint(async (_req, res) => res.json({ items: await briefs() })));
  app.post(`${M}/jobs/:id/run`, endpoint(async (req, res) => {
    await staffAdmin(req);
    res.json({ ok: true, result: await runJarvisJob(engine, registry, String(req.params.id)) });
  }));

  return { engine, registry };
}
