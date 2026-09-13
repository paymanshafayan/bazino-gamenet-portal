/**
 * Jarvis approval queue — "the agent proposes, the human approves".
 * Sensitive skills land here from chat/automation; an admin approves or
 * rejects; only then does the handler run (audited with the deciding admin).
 */
import { OpsCore, fail, nowISO } from '../management/core';
import { randomUUID } from 'node:crypto';

export interface JarvisApproval {
  id: string; skillId: string; title: string; params: any; risk: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string; note?: string;
  createdAt: string; decidedBy?: string; decidedAt?: string;
  result?: any; error?: string;
}

const MAX_PENDING = 50;

export async function createApproval(core: OpsCore, a: {
  skillId: string; title: string; params: any; risk: string; requestedBy: string; note?: string;
}): Promise<JarvisApproval> {
  const pending = (await core.list<JarvisApproval>('jarvis-approval')).filter(r => r.data.status === 'pending');
  if (pending.length >= MAX_PENDING) fail('JARVIS_APPROVAL_QUEUE_FULL', 409);
  const row: JarvisApproval = {
    id: `jap-${randomUUID().slice(0, 12)}`, skillId: String(a.skillId).slice(0, 60),
    title: String(a.title || a.skillId).slice(0, 160), params: a.params || {},
    risk: String(a.risk || 'sensitive'), status: 'pending',
    requestedBy: String(a.requestedBy || 'jarvis').slice(0, 80), note: String(a.note || '').slice(0, 500),
    createdAt: nowISO(),
  };
  await core.save('jarvis-approval', row.id, row, 0);
  return row;
}

export async function listApprovals(core: OpsCore, status?: string, limit = 50) {
  const rows = (await core.list<JarvisApproval>('jarvis-approval'))
    .map(r => ({ id: r.id, version: r.version, ...r.data }))
    .filter(r => !status || r.status === status)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, Math.min(Math.max(limit, 1), 100));
  return rows;
}

export async function decideApproval(core: OpsCore, d: {
  id: string; action: 'approve' | 'reject'; decidedBy: string;
  runDirect: (ctx: { core: OpsCore; store: any; actor: string }, skillId: string, params: any) => Promise<{ ok: boolean; summary: string; data?: any }>;
  getStore: () => any;
}): Promise<JarvisApproval> {
  const existing = await core.read<JarvisApproval>('jarvis-approval', d.id);
  if (!existing) fail('NOT_FOUND', 404);
  if (existing.data.status !== 'pending') fail('JARVIS_APPROVAL_ALREADY_DECIDED', 409);
  if (d.action === 'reject') {
    const rejected = { ...existing.data, status: 'rejected' as const, decidedBy: d.decidedBy, decidedAt: nowISO() };
    await core.save('jarvis-approval', existing.id, rejected, existing.version);
    return rejected;
  }
  let result: any = null, error = '';
  try {
    result = await d.runDirect({ core, store: d.getStore(), actor: d.decidedBy }, existing.data.skillId, existing.data.params);
    if (!result?.ok) error = result?.summary || 'SKILL_FAILED';
  } catch (e: any) {
    error = /^[A-Z0-9_]+$/.test(e?.code || '') ? e.code : 'SKILL_FAILED';
  }
  const approved = {
    ...existing.data, status: 'approved' as const, decidedBy: d.decidedBy, decidedAt: nowISO(),
    result: result?.ok ? { summary: result.summary, data: result.data } : undefined, error: error || undefined,
  };
  await core.save('jarvis-approval', existing.id, approved, existing.version);
  if (error) fail(error, 409);
  return approved;
}
