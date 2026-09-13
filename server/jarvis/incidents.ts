/**
 * Jarvis incident log — how the admin is REPORTED when the provider chain
 * degrades (operator rule: when Groq hits its request cap, non-support
 * features must pause AND the admin must be informed).
 *
 * Incident types:
 *   GROQ_UNAVAILABLE      Groq could not answer (rate limit / daily cap /
 *                          network / bad key) → fallback engaged
 *   BACKUP_ACTIVE         a backup provider (support-only) served a chat turn
 *                          or an automation job
 *   SUPPORT_ONLY_BLOCKED  a non-support action/job was REFUSED because only
 *                          backups were available
 *   BACKUP_FAILED         a backup provider itself failed or hit its own cap
 *
 * Same-type incidents for the same provider are de-duplicated within a
 * cooldown window (a `count` is bumped instead), so a rate-limited burst does
 * not flood the log. Everything lives in ONE rolling ops-record (the same
 * pattern as the monitor history) — the ops store has no row delete.
 */
import { OpsCore, nowISO } from '../management/core';

export type JarvisIncidentType = 'GROQ_UNAVAILABLE' | 'BACKUP_ACTIVE' | 'SUPPORT_ONLY_BLOCKED' | 'BACKUP_FAILED';

export interface JarvisIncident {
  id: string;
  ts: string;
  type: JarvisIncidentType;
  provider: string;
  message: string;
  meta?: any;
  /** How many times this incident repeated inside the cooldown window. */
  count?: number;
  lastAt?: string;
}

const KIND = 'jarvis-incident';
const LOG_ID = 'jarvis-incident-log';
const MAX_ROWS = 200;
const COOLDOWN_MS = 10 * 60 * 1000;
let seq = 0;

export async function recordIncident(core: OpsCore, inc: {
  type: JarvisIncidentType; provider: string; message: string; meta?: any;
}): Promise<JarvisIncident | null> {
  try {
    const row = await core.read<{ incidents: JarvisIncident[] }>(KIND, LOG_ID);
    const incidents = row?.data?.incidents || [];
    // De-duplicate the same type+provider inside the cooldown window.
    const recent = [...incidents]
      .filter(i => i.type === inc.type && String(i.provider) === inc.provider)
      .sort((a, b) => String(b.lastAt || b.ts).localeCompare(String(a.lastAt || a.ts)))[0];
    if (recent && Date.now() - Date.parse(String(recent.lastAt || recent.ts)) < COOLDOWN_MS) {
      recent.count = (recent.count || 1) + 1;
      recent.lastAt = nowISO();
      recent.meta = inc.meta ?? recent.meta;
      await core.save(KIND, LOG_ID, { incidents, updatedAt: nowISO() }, row?.version || 0);
      return recent;
    }
    const fresh: JarvisIncident = {
      id: `jinc-${Date.now().toString(36)}-${++seq}`, ts: nowISO(), lastAt: nowISO(),
      type: inc.type, provider: String(inc.provider).slice(0, 40),
      message: String(inc.message).slice(0, 500), meta: inc.meta, count: 1,
    };
    incidents.push(fresh);
    await core.save(KIND, LOG_ID, { incidents: incidents.slice(-MAX_ROWS), updatedAt: nowISO() }, row?.version || 0);
    return fresh;
  } catch { /* incidents must never break the agent */ return null; }
}

export async function listIncidents(core: OpsCore, limit = 30): Promise<JarvisIncident[]> {
  const row = await core.read<{ incidents: JarvisIncident[] }>(KIND, LOG_ID);
  return (row?.data?.incidents || [])
    .slice()
    .sort((a, b) => String(b.lastAt || b.ts).localeCompare(String(a.lastAt || a.ts)))
    .slice(0, Math.min(Math.max(limit, 1), 100));
}
