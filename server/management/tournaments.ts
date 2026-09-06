/**
 * Batch 7 — tournament management in the operations console.
 *
 * The website already owns tournament data (tournaments table + onsite orders of kind
 * 'tournament' for paid registrations). This service layers management features on top
 * WITHOUT a parallel data model:
 *   - check-in (attendance) of registered teams
 *   - knockout bracket generation with BYEs, match slots booked on stations
 *     (slot conflicts already enforced by bookings.assertStationFree via 'match-slot')
 *   - result entry with automatic advancement
 *   - walk-in registration paid through the shared cash/POS FinanceService
 */
import type express from 'express';
import type { Request, Response } from 'express';
import { OpsCore, endpoint, fail, newId, nowISO, parseJSON, stringValue } from './core';
import { assertStationFree } from './bookings';
import type { FinanceService } from './finance';

// ─── Batch 10: kinds, seasons, live pairing ─────────────────────────────────
export type TournamentKind = 'weekly' | 'special';
export type SeasonName = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export interface TournamentMeta {
  kind?: TournamentKind;          // default 'weekly'
  signupMode?: 'open' | 'info_only'; // special events are info_only (no registration)
  rules?: string;                 // per-event rules (Markdown/plain)
  prizes?: { first?: string; second?: string; third?: string };
  finalized?: boolean;            // champion decided & season points awarded
  pointsAwardedFor?: string;      // season id the points were written for (idempotency)
}

export interface SeasonStanding { playerKey: string; name: string; username?: string; points: number; wins: number; seconds: number; thirds: number; played: number; }
export interface SeasonRow {
  id: string; name: SeasonName; year: number; startsAt: string; endsAt: string;
  status: 'active' | 'archived';
  standings: Record<string, SeasonStanding>; // keyed by playerKey
}

export const WEEKLY_POINTS: Record<number, number> = { 1: 5, 2: 2, 3: 1 };
export const SPECIAL_POINTS: Record<number, number> = { 1: 10, 2: 4, 3: 2 };

/** Points for a final placement by tournament kind. */
export function pointsForPlacement(kind: TournamentKind, place: 1 | 2 | 3): number {
  return (kind === 'special' ? SPECIAL_POINTS : WEEKLY_POINTS)[place] || 0;
}

/** Season calendar for a Gregorian date (month 0-based): spring Mar-May, summer Jun-Aug, autumn Sep-Nov, winter Dec-Feb. */
export function seasonOf(date: Date): { name: SeasonName; year: number; startsAt: string; endsAt: string } {
  const m = date.getUTCMonth();
  let name: SeasonName; let startYear = date.getUTCFullYear();
  if (m >= 2 && m <= 4) name = 'SPRING';
  else if (m >= 5 && m <= 7) name = 'SUMMER';
  else if (m >= 8 && m <= 10) name = 'AUTUMN';
  else { name = 'WINTER'; if (m === 11) startYear = date.getUTCFullYear() + 1; } // Dec belongs to next year's winter
  const ranges: Record<SeasonName, [number, number]> = {
    SPRING: [2, 5], SUMMER: [5, 8], AUTUMN: [8, 11], WINTER: [11, 14],
  };
  const [sm, em] = ranges[name];
  const sy = name === 'WINTER' && m <= 1 ? startYear - 1 : startYear;
  const startsAt = new Date(Date.UTC(sy, sm, 1, 0, 0, 0)).toISOString();
  const endsAt = new Date(Date.UTC(sy + (em >= 12 ? 1 : 0), em % 12, 1, 0, 0, 0)).toISOString();
  return { name, year: sy, startsAt, endsAt };
}

export function seasonIdFor(date = new Date()): string {
  const s = seasonOf(date);
  return `season-${s.year}-${s.name}`;
}

/** Stable identity for a participant: online username wins; else normalized name+phone. */
export function playerKey(team: { captainUsername?: string; teamName?: string; phone?: string }): string {
  const u = (team.captainUsername || '').trim().toLowerCase();
  if (u) return `u:${u}`;
  const name = (team.teamName || '').trim().toLowerCase().replace(/\s+/g, '');
  const phone = (team.phone || '').replace(/\D/g, '');
  return `w:${name}|${phone.slice(-4)}`;
}

export interface TeamRegistration {
  teamName: string; captainUsername?: string; captainName?: string; phone?: string;
  paid: boolean; paidAmount: number; orderId?: string; checkedIn: boolean;
  seed: number; createdAt: string; createdBy: string;
}
export interface BracketMatch {
  id: string; round: number; position: number; /** 0-based position within round */
  teamA?: string; /** team key (id) */ teamB?: string;
  scoreA?: number; scoreB?: number;
  winnerId?: string; status: 'pending' | 'ready' | 'playing' | 'done';
  stationId?: string; systemId?: string | null; startsAt?: string; endsAt?: string;
  note?: string;
}

export class TournamentService {
  constructor(public core: OpsCore, public finance: FinanceService) {}

  /** In-process pub/sub for live bracket updates (SSE). Single-server is enough. */
  private listeners = new Map<string, Set<(version: number) => void>>();
  subscribe(tournamentId: string, fn: (version: number) => void): () => void {
    if (!this.listeners.has(tournamentId)) this.listeners.set(tournamentId, new Set());
    this.listeners.get(tournamentId)!.add(fn);
    return () => { this.listeners.get(tournamentId)?.delete(fn); };
  }
  private emit(tournamentId: string, version: number) {
    this.listeners.get(tournamentId)?.forEach(fn => { try { fn(version); } catch { /* ignore */ } });
  }

  /** Read the tournament meta overlay (kind/rules/prizes), merged over sane defaults. */
  metaFrom(overlayData: any = {}): Required<Pick<TournamentMeta, 'kind' | 'signupMode'>> & TournamentMeta {
    const kind: TournamentKind = overlayData.kind === 'special' ? 'special' : 'weekly';
    return {
      kind,
      signupMode: overlayData.signupMode === 'info_only' ? 'info_only' : (kind === 'special' ? 'info_only' : 'open'),
      rules: overlayData.rules || '',
      prizes: overlayData.prizes || {},
      finalized: !!overlayData.finalized,
      pointsAwardedFor: overlayData.pointsAwardedFor,
    };
  }

  async currentSeason(): Promise<{ id: string; row: SeasonRow }> {
    const id = seasonIdFor();
    const s = seasonOf(new Date());
    const rec = await this.core.read<SeasonRow>('season', id);
    let row = rec?.data;
    if (!row) {
      row = { id, name: s.name, year: s.year, startsAt: s.startsAt, endsAt: s.endsAt, status: 'active', standings: {} };
      const saved = await this.core.save('season', id, row, 0);
      row = saved.data;
    }
    return { id, row: row! };
  }

  async setMeta(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `tournament-meta-${b.tournamentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'tournament-meta', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const row = await this.core.store.getTournamentById(id);
      if (!row) fail('NOT_FOUND', 404);
      const overlay = await this.core.read('tournament', id);
      const data: any = { teams: [], bracket: [], ...(overlay?.data || {}) };
      if (b.kind === 'weekly' || b.kind === 'special') data.kind = b.kind;
      if (b.signupMode === 'open' || b.signupMode === 'info_only') data.signupMode = b.signupMode;
      if (b.rules !== undefined) data.rules = stringValue(b.rules, 4000);
      if (b.prizes !== undefined) {
        const p = b.prizes || {};
        data.prizes = {
          first: stringValue(p.first, 120), second: stringValue(p.second, 120), third: stringValue(p.third, 120),
        };
      }
      const saved = await this.core.save('tournament', id, data, overlay?.version ?? 0);
      return { meta: this.metaFrom(data), version: saved.version };
    });
  }



  /** Merge base tournament row (store) with ops overlay (registrations, bracket). */
  async view(id: string) {
    const store = this.core.store;
    const row = await store.getTournamentById(id);
    if (!row) fail('NOT_FOUND', 404);
    const overlay = await this.core.read('tournament', id);
    const teams: TeamRegistration[] = overlay?.data?.teams || [];
    const bracket: BracketMatch[] = overlay?.data?.bracket || [];
    // Registrations sourced from paid tournament orders online, if not yet imported.
    const orders = (await store.listOnsiteOrders({ kind: 'tournament' }))
      .filter(o => parseJSON(o.payload).tournamentId === id);
    const known = new Set(teams.map(t => t.teamName));
    for (const o of orders) {
      const p = parseJSON(o.payload);
      const name = p.team?.name || stringValue(p.teamName, 120);
      if (!name || known.has(name)) continue;
      teams.push({ teamName: name, captainUsername: o.username || undefined, captainName: p.team?.captain, phone: p.team?.phone, paid: o.status === 'settled', paidAmount: o.amount, orderId: o.id, checkedIn: false, seed: teams.length + 1, createdAt: o.createdAt, createdBy: 'online' });
      known.add(name);
    }
    return {
      id: row.id, title: row.titleFa || row.title, game: row.game, startDate: row.startDate,
      registrationFee: row.registrationFee, maxTeams: row.maxTeams, status: row.status,
      registeredTeamsCount: row.registeredTeamsCount,
      teams: teams.sort((a, b) => a.seed - b.seed),
      bracket,
      version: overlay?.version || 0,
    };
  }

  async list() {
    const store = this.core.store;
    const rows = await store.listTournaments();
    const out = [];
    for (const t of rows) {
      const overlay = await this.core.read('tournament', t.id);
      out.push({
        id: t.id, title: t.titleFa || t.title, game: t.game, startDate: t.startDate,
        registrationFee: t.registrationFee, maxTeams: t.maxTeams, status: t.status,
        registeredTeamsCount: t.registeredTeamsCount,
        teamCount: (overlay?.data?.teams || []).length,
        checkedIn: (overlay?.data?.teams || []).filter((x: TeamRegistration) => x.checkedIn).length,
        bracketDone: (overlay?.data?.bracket || []).filter((m: BracketMatch) => m.status === 'done').length,
        bracketTotal: (overlay?.data?.bracket || []).length,
        version: overlay?.version || 0,
      });
    }
    return out.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
  }

  /** Register a walk-in team and create a collectable order (cash/POS at settle). */
  async registerWalkIn(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `tournament-register-${b.tournamentId||b.matchId||''}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'tournament-register', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const store = this.core.store;
      const row = await store.getTournamentById(id);
      if (!row) fail('NOT_FOUND', 404);
      const meta = this.metaFrom((await this.core.read('tournament', id))?.data);
      if (meta.signupMode === 'info_only') fail('REGISTRATION_CLOSED', 409); // special events are info-only
      const teamName = stringValue(b.teamName, 120, true);
      const overlay = await this.core.read('tournament', id);
      const teams: TeamRegistration[] = overlay?.data?.teams || [];
      if (teams.some(t => t.teamName === teamName)) fail('TEAM_EXISTS', 409);
      if (teams.length >= row.maxTeams) fail('TOURNAMENT_FULL', 409);
      const username = stringValue(b.username, 100);
      if (username && !(await store.getUserByUsername(username))) fail('USER_NOT_FOUND', 404);
      const fee = Number(row.registrationFee) || 0;
      const team: TeamRegistration = {
        teamName, captainUsername: username || undefined, captainName: stringValue(b.captainName, 120),
        phone: stringValue(b.phone, 30), paid: fee === 0, paidAmount: 0,
        checkedIn: false, seed: teams.length + 1, createdAt: nowISO(), createdBy: actor,
      };
      teams.push(team);
      await this.core.save('tournament', id, { ...(overlay?.data || {}), teams }, overlay?.version ?? 0);
      // Create an onsite order so collection goes through the single cash/POS receipt flow.
      let orderId: string | undefined;
      if (fee > 0) {
        orderId = newId('OS');
        const time = nowISO();
        await store.createOnsiteOrder({ id: orderId, kind: 'tournament', username: username || '', amount: fee, status: 'pending_onsite', dueAt: '', payload: JSON.stringify({ tournamentId: id, team: { name: teamName, captain: team.captainName, phone: team.phone }, amount: fee, _ops: { source: 'onsite', customerName: teamName, createdBy: actor } }), description: `Turnuva: ${row.titleFa || row.title} — ${teamName}`, result: '{}', createdAt: time, updatedAt: time, settledAt: '', settledBy: '' });
      }
      return { team: { ...team, orderId }, orderId };
    });
  }

  /** Mark an order settled externally (called right after finance.settle by UI) OR update paid. */
  async markPaid(actor: string, tournamentId: string, teamName: string, orderId?: string) {
    const overlay = await this.core.read('tournament', tournamentId);
    if (!overlay) fail('NOT_FOUND', 404);
    const teams: TeamRegistration[] = overlay.data.teams || [];
    const t = teams.find(x => x.teamName === teamName);
    if (!t) fail('NOT_FOUND', 404);
    t.paid = true; t.orderId = orderId || t.orderId;
    await this.core.save('tournament', tournamentId, { ...overlay.data, teams }, overlay.version);
    return { success: true };
  }

  async checkIn(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `tournament-checkin-${b.tournamentId||b.matchId||''}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'tournament-checkin', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const overlay = await this.core.read('tournament', id);
      if (!overlay) fail('NOT_FOUND', 404);
      const teams: TeamRegistration[] = overlay.data.teams || [];
      const t = teams.find(x => x.teamName === stringValue(b.teamName, 120, true));
      if (!t) fail('NOT_FOUND', 404);
      if (!t.paid) fail('PAYMENT_REQUIRED', 409);
      t.checkedIn = b.checkedIn !== false;
      return this.core.save('tournament', id, { ...overlay.data, teams }, overlay.version);
    });
  }

  /** Generate a single-elimination bracket from checked-in teams, with BYEs. */
  async generateBracket(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `tournament-bracket-${b.tournamentId||b.matchId||''}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'tournament-bracket', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const overlay = await this.core.read('tournament', id);
      if (!overlay) fail('NOT_FOUND', 404);
      const present = (overlay.data.teams || []).filter((t: TeamRegistration) => t.checkedIn && t.paid);
      if (present.length < 2) fail('NOT_ENOUGH_TEAMS', 409);
      // Shuffle by seed order unless reseed requested; deterministic from seeds.
      const seeds = present.map((t: TeamRegistration) => t.teamName);
      const size = 2 ** Math.ceil(Math.log2(seeds.length));
      // Standard BYE placement.
      const positions: (string | null)[] = new Array(size).fill(null);
      for (let i = 0; i < size; i++) positions[i] = i < seeds.length ? seeds[i] : null;
      const bracket: BracketMatch[] = [];
      let round = 1;
      let current = positions;
      let pos = 0;
      while (current.length > 1) {
        const next: (string | null)[] = [];
        for (let i = 0; i < current.length; i += 2) {
          const a = current[i], c = current[i + 1] ?? null;
          const match: BracketMatch = { id: newId('MT'), round, position: pos++, status: 'pending', teamA: a || undefined, teamB: c || undefined };
          // BYE: single team advances automatically.
          if (a && !c) { match.status = 'done'; match.winnerId = a; next.push(a); }
          else if (!a && c) { match.status = 'done'; match.winnerId = c; next.push(c); }
          else if (!a && !c) { next.push(null); }
          else { match.status = 'ready'; next.push(null); }
          bracket.push(match);
        }
        current = next;
        round++;
      }
      return this.core.save('tournament', id, { ...overlay.data, bracket }, overlay.version);
    });
  }

  /**
   * Manual pairing entered live on tournament day. The admin types/picks the round-1
   * pairings in the console; the bracket is (re)built from them immediately and the
   * public TV view updates without a refresh. `pairs` = [[nameA, nameB], ...] in
   * display order. A pair with one empty slot is a BYE. Names are matched to the
   * registered teams by normalized teamName (case/space insensitive).
   */
  async pairMatches(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `tournament-pair-${b.tournamentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'tournament-pair', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const row = await this.core.store.getTournamentById(id);
      if (!row) fail('NOT_FOUND', 404);
      const overlay = await this.core.read('tournament', id);
      const teams: TeamRegistration[] = overlay?.data?.teams || [];
      const rawPairs: any[] = Array.isArray(b.pairs) ? b.pairs : [];
      if (rawPairs.length < 1) fail('INVALID_PAIRS', 400);
      const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, '');
      const byName = new Map(teams.map(t => [norm(t.teamName), t.teamName]));
      const resolve = (v: unknown): string | null => {
        const n = norm(String(v ?? ''));
        if (!n) return null;
        if (byName.has(n)) return byName.get(n)!;
        // allow a brand-new player typed at the desk (no pre-registration)
        const exact = String(v).trim();
        if (exact) byName.set(n, exact);
        return exact;
      };
      const resolved: Array<[string | null, string | null]> = rawPairs
        .map(p => [resolve(Array.isArray(p) ? p[0] : p?.a), resolve(Array.isArray(p) ? p[1] : p?.b)] as [string | null, string | null]);
      // Validate: no real team used twice, cap at bracket size 32.
      const used = new Set<string>();
      for (const [a, c] of resolved) {
        for (const t of [a, c]) {
          if (t) { const k = norm(t); if (used.has(k)) fail('TEAM_REPEATED', 409); used.add(k); }
        }
      }
      const participants = resolved.flatMap(p => p).filter(Boolean).length;
      const byes = resolved.filter(([a, c]) => !a || !c).length;
      const effectivePlayers = participants; // each bye still occupies a slot
      if (effectivePlayers < 2 && byes < 1) fail('NOT_ENOUGH_TEAMS', 409);
      const size = Math.min(32, 2 ** Math.ceil(Math.log2(Math.max(2, resolved.length * 2 - byes))));
      // Build round-1 positions in the given order; pad with null slots to `size`.
      const positions: (string | null)[] = new Array(size).fill(null);
      let idx = 0;
      for (const [a, c] of resolved) {
        if (idx >= size) break;
        positions[idx++] = a;
        if (idx < size) positions[idx++] = c;
      }
      const bracket: BracketMatch[] = [];
      let round = 1; let current = positions; let pos = 0;
      while (current.length > 1) {
        const next: (string | null)[] = [];
        for (let i = 0; i < current.length; i += 2) {
          const a = current[i], c = current[i + 1] ?? null;
          const match: BracketMatch = { id: newId('MT'), round, position: pos++, status: 'pending', teamA: a || undefined, teamB: c || undefined };
          if (a && !c) { match.status = 'done'; match.winnerId = a; next.push(a); }
          else if (!a && c) { match.status = 'done'; match.winnerId = c; next.push(c); }
          else if (!a && !c) next.push(null);
          else { match.status = 'ready'; next.push(null); }
          bracket.push(match);
        }
        current = next; round++;
      }
      const data = { teams, ...(overlay?.data || {}), bracket };
      const saved = await this.core.save('tournament', id, data, overlay?.version ?? 0);
      this.emit(id, saved.version);
      return saved;
    });
  }

  /**
   * Finalize a tournament: decide champion/runner-up/third from the bracket and award
   * season points atomically and idempotently (once per season). Safe to re-run.
   */
  async finalize(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `tournament-finalize-${b.tournamentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'tournament-finalize', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const overlay = await this.core.read('tournament', id);
      if (!overlay) fail('NOT_FOUND', 404);
      const row = await this.core.store.getTournamentById(id);
      if (!row) fail('NOT_FOUND', 404);
      const bracket: BracketMatch[] = overlay.data.bracket || [];
      if (!bracket.length) fail('BRACKET_MISSING', 409);
      void 0;
      const finalRound = Math.max(...bracket.map(m => m.round));
      const finalMatch = bracket.find(m => m.round === finalRound && m.status === 'done');
      if (!finalMatch || !finalMatch.winnerId) fail('FINAL_NOT_DONE', 409);
      const champion = finalMatch.winnerId;
      const runnerUp = finalMatch.teamA === champion ? finalMatch.teamB : finalMatch.teamA;
      // Third place = the two losers of the penultimate (semi) round share 3rd-place points.
      const semiRound = finalRound - 1;
      const semiLosers = bracket.filter(m => m.round === semiRound && m.status === 'done' && m.winnerId)
        .map(m => (m.teamA === m.winnerId ? m.teamB : m.teamA)).filter(Boolean) as string[];

      const meta = this.metaFrom(overlay.data);
      const { id: sid, row: season } = await this.currentSeason();
      const standings: Record<string, SeasonStanding> = { ...(season.standings || {}) };
      const teams: TeamRegistration[] = overlay.data.teams || [];
      const teamByName = new Map(teams.map(t => [t.teamName, t]));
      const ensure = (name: string): SeasonStanding => {
        const t = teamByName.get(name);
        const key = playerKey({ teamName: name, captainUsername: t?.captainUsername, phone: t?.phone });
        if (!standings[key]) standings[key] = { playerKey: key, name, username: t?.captainUsername, points: 0, wins: 0, seconds: 0, thirds: 0, played: 0 };
        const st = standings[key]; if (!st.username && t?.captainUsername) st.username = t.captainUsername;
        st.played += 0; // played counted separately below
        return st;
      };
      // Award only if not already awarded for this season (idempotent).
      const awarded = !!overlay.data.pointsAwardedFor;
      if (!awarded) {
        const addPoints = (name: string | undefined, place: 1 | 2 | 3) => {
          if (!name) return;
          const st = ensure(name);
          const pts = pointsForPlacement(meta.kind, place);
          st.points += pts;
          if (place === 1) st.wins += 1; else if (place === 2) st.seconds += 1; else st.thirds += 1;
        };
        addPoints(champion, 1);
        addPoints(runnerUp, 2);
        for (const loser of semiLosers) addPoints(loser, 3);
        // Count tournament participation for every team that reached the bracket.
        const names = new Set<string>([champion, runnerUp as string, ...semiLosers].filter(Boolean));
        for (const n of names) { const st = ensure(n as string); st.played += 1; }
        season.standings = standings;
        const srec = await this.core.read('season', sid);
        await this.core.save('season', sid, season, srec?.version ?? 0);
      }
      const data = { ...overlay.data, finalized: true, pointsAwardedFor: sid };
      const saved = await this.core.save('tournament', id, data, overlay.version);
      this.emit(id, saved.version);
      return { champion, runnerUp, third: semiLosers, season: sid, pointsAwarded: !awarded };
    });
  }

  /** Book a station/time for a match (uses the same slot conflict guard as bookings). */
  async scheduleMatch(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `match-schedule-${b.tournamentId||b.matchId||''}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'match-schedule', b, async () => {
      const tournamentId = stringValue(b.tournamentId, 100, true);
      const matchId = stringValue(b.matchId, 100, true);
      const overlay = await this.core.read('tournament', tournamentId);
      if (!overlay) fail('NOT_FOUND', 404);
      const bracket: BracketMatch[] = overlay.data.bracket || [];
      const m = bracket.find(x => x.id === matchId);
      if (!m) fail('NOT_FOUND', 404);
      const stationId = stringValue(b.stationId, 100, true);
      const station = await this.core.read('station', stationId);
      if (!station || !station.data.active) fail('STATION_NOT_REGISTERED', 409);
      const startsAt = b.startsAt ? new Date(b.startsAt).toISOString() : nowISO();
      const endsAt = b.endsAt ? new Date(b.endsAt).toISOString() : new Date(Date.parse(startsAt) + 30 * 60000).toISOString();
      // Conflict check through the shared guard (reservations, sessions, other matches).
      const { assertStationFree } = await import('./bookings');
      await assertStationFree(this.core, station.data.systemId, startsAt, endsAt, undefined, undefined, m.id);
      m.stationId = stationId; m.systemId = station.data.systemId; m.startsAt = startsAt; m.endsAt = endsAt; m.status = 'playing';
      const slot = await this.core.read('match-slot', m.id);
      await this.core.save('match-slot', m.id, { tournamentId, stationId: station.id, systemId: station.data.systemId, startsAt, endsAt, status: 'playing' }, slot?.version || 0);
      return this.core.save('tournament', tournamentId, { ...overlay.data, bracket }, overlay.version);
    });
  }

  /** Enter a result; winner advances to the next round. */
  async enterResult(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey || `match-result-${b.tournamentId||b.matchId||''}-${Date.now()}-${Math.random().toString(36).slice(2)}`, 'match-result', b, async () => {
      const tournamentId = stringValue(b.tournamentId, 100, true);
      const matchId = stringValue(b.matchId, 100, true);
      const overlay = await this.core.read('tournament', tournamentId);
      if (!overlay) fail('NOT_FOUND', 404);
      const bracket: BracketMatch[] = overlay.data.bracket || [];
      const m = bracket.find(x => x.id === matchId);
      if (!m || !m.teamA || !m.teamB) fail('MATCH_NOT_READY', 409);
      const scoreA = Number(b.scoreA), scoreB = Number(b.scoreB);
      if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA === scoreB) fail('INVALID_SCORE');
      m.scoreA = scoreA; m.scoreB = scoreB; m.status = 'done';
      m.winnerId = scoreA > scoreB ? m.teamA : m.teamB;
      // Advance winner into the next round's slot.
      const roundMatches = bracket.filter(x => x.round === m.round).sort((x, y) => x.position - y.position);
      const idx = roundMatches.indexOf(m);
      const nextRound = bracket.filter(x => x.round === m.round + 1).sort((x, y) => x.position - y.position);
      const nextMatch = nextRound[Math.floor(idx / 2)];
      if (nextMatch) {
        if (idx % 2 === 0) nextMatch.teamA = m.winnerId; else nextMatch.teamB = m.winnerId;
        if (nextMatch.teamA && nextMatch.teamB) nextMatch.status = 'ready';
      }
      const slot = await this.core.read('match-slot', m.id);
      if (slot) await this.core.save('match-slot', m.id, { ...slot.data, status: 'done' }, slot.version);
      const saved = await this.core.save('tournament', tournamentId, { ...overlay.data, bracket }, overlay.version);
      this.emit(tournamentId, saved.version);
      return saved;
    });
  }

  async champion(id: string): Promise<string | null> {
    const overlay = await this.core.read('tournament', id);
    const bracket: BracketMatch[] = overlay?.data?.bracket || [];
    if (!bracket.length) return null;
    const finalRound = Math.max(...bracket.map(m => m.round));
    const final = bracket.find(m => m.round === finalRound && m.status === 'done');
    return final?.winnerId || null;
  }

  // ─── Public read models (website tournaments page; staff-token free) ──────
  private async mergedTournaments() {
    const store = this.core.store;
    const rows = await store.listTournaments();
    const out = [];
    for (const t of rows) {
      const overlay = await this.core.read('tournament', t.id);
      out.push({ row: t, overlay });
    }
    return out.sort((a, b) => String(b.row.startDate).localeCompare(String(a.row.startDate)));
  }

  async publicList() {
    const merged = await this.mergedTournaments();
    return merged.map(({ row: t, overlay }) => {
      const meta = this.metaFrom(overlay?.data);
      const teams: TeamRegistration[] = overlay?.data?.teams || [];
      const bracket: BracketMatch[] = overlay?.data?.bracket || [];
      const liveState = bracket.some(m => m.status === 'playing' || m.status === 'ready')
        ? 'live' : bracket.length && bracket.every(m => m.status === 'done') ? 'past' : 'upcoming';
      return {
        id: t.id, title: t.titleFa || t.title, game: t.game, startDate: t.startDate,
        registrationFee: t.registrationFee, maxTeams: t.maxTeams,
        registeredTeamsCount: t.registeredTeamsCount, status: t.status,
        kind: meta.kind, signupMode: meta.signupMode, prizes: meta.prizes,
        teamCount: teams.length, checkedIn: teams.filter(x => x.checkedIn).length,
        bracketTotal: bracket.length, bracketDone: bracket.filter(m => m.status === 'done').length,
        liveState, finalized: meta.finalized,
        version: overlay?.version || 0,
      };
    });
  }

  async publicBracket(id: string) {
    const store = this.core.store;
    const row = await store.getTournamentById(id);
    if (!row) fail('NOT_FOUND', 404);
    const overlay = await this.core.read('tournament', id);
    const meta = this.metaFrom(overlay?.data);
    const teams: TeamRegistration[] = (overlay?.data?.teams || []).slice().sort((a, b) => a.seed - b.seed);
    const bracket: BracketMatch[] = overlay?.data?.bracket || [];
    const rounds = [...new Set(bracket.map(m => m.round))].sort((a, b) => a - b)
      .map(r => bracket.filter(m => m.round === r).sort((a, b) => a.position - b.position));
    return {
      id: row.id, title: row.titleFa || row.title, game: row.game, startDate: row.startDate,
      registrationFee: row.registrationFee, maxTeams: row.maxTeams,
      kind: meta.kind, signupMode: meta.signupMode, rules: meta.rules, prizes: meta.prizes,
      teams: teams.map(t => ({ teamName: t.teamName, captainName: t.captainName, checkedIn: t.checkedIn, paid: t.paid, seed: t.seed })),
      bracket, rounds, version: overlay?.version || 0, finalized: meta.finalized,
      champion: await this.champion(id),
    };
  }

  async publicSeason() {
    const { id, row } = await this.currentSeason();
    const standings = Object.values(row.standings || {}).sort((a, b) => b.points - a.points || b.wins - a.wins);
    const now = Date.now();
    const daysLeft = Math.max(0, Math.ceil((Date.parse(row.endsAt) - now) / 86400000));
    return {
      id, name: row.name, year: row.year, startsAt: row.startsAt, endsAt: row.endsAt, daysLeft,
      standings, top3: standings.slice(0, 3),
      scoring: { weekly: { 1: 5, 2: 2, 3: 1 }, special: { 1: 10, 2: 4, 3: 2 } },
    };
  }

  /** Career + current-season stats for an online player (by username). */
  async playerStats(username: string) {
    const seasons = await this.core.list<SeasonRow>('season');
    let championships = 0, secondPlaces = 0, thirdPlaces = 0, tournaments = 0, seasonPoints = 0;
    for (const s of seasons) {
      for (const st of Object.values(s.data.standings || {})) {
        if (st.username === username || st.playerKey === `u:${username.toLowerCase()}`) {
          championships += st.wins; secondPlaces += st.seconds; thirdPlaces += st.thirds; tournaments += st.played;
          if (s.data.status === 'active') seasonPoints += st.points;
        }
      }
    }
    return { available: tournaments > 0 || championships > 0, username, championships, secondPlaces, thirdPlaces, tournaments, seasonPoints };
  }
}

/**
 * Public (no staff token) read routes for the website tournaments page: events feed,
 * per-kind card lists, live bracket with version, event rules, season ranking, and a
 * player's tournament stats. Plus an SSE stream that pushes a bracket version bump.
 */
export function registerPublicTournamentRoutes(app: express.Express, service: TournamentService) {
  const wrap = (fn: (req: Request, res: Response) => Promise<any>) => endpoint(fn);

  app.get('/api/tournaments/events', wrap(async (_req, res) => {
    const [list, season] = await Promise.all([service.publicList(), service.publicSeason()]);
    const weekly = list.filter(t => t.kind === 'weekly');
    const special = list.filter(t => t.kind === 'special');
    // Featured live/upcoming bracket: a tournament with a bracket in progress, else nearest.
    const live = [...list].sort((a, b) => {
      const la = a.bracketTotal ? 1 : 0, lb = b.bracketTotal ? 1 : 0;
      if (lb !== la) return lb - la;
      return String(b.startDate).localeCompare(String(a.startDate));
    })[0] || null;
    res.json({
      weekly, special, season,
      live: live ? { id: live.id, title: live.title, game: live.game, version: live.version, bracketTotal: live.bracketTotal || 0 } : null,
    });
  }));

  app.get('/api/tournaments/cards/:kind', wrap(async (req, res) => {
    const kind = req.params.kind === 'special' ? 'special' : 'weekly';
    const list = (await service.publicList()).filter(t => t.kind === kind);
    res.json(list);
  }));

  app.get('/api/tournaments/:id/live', wrap(async (req, res) => {
    res.json(await service.publicBracket(String(req.params.id)));
  }));

  app.get('/api/tournaments/:id/rules', wrap(async (req, res) => {
    const v = await service.publicBracket(String(req.params.id));
    res.json({ id: v.id, title: v.title, kind: v.kind, rules: v.rules, prizes: v.prizes, signupMode: v.signupMode });
  }));

  app.get('/api/season-ranking', wrap(async (_req, res) => res.json(await service.publicSeason())));

  app.get('/api/player/tournament-stats', wrap(async (req, res) => {
    // Username may come from the site session token if present; else ?username=
    const username = String((req as any).authUsername || req.query.username || '').trim();
    if (!username) return res.json({ available: false, championships: 0, secondPlaces: 0, tournaments: 0, seasonPoints: 0 });
    res.json(await service.playerStats(username));
  }));

  // Live bracket push: SSE. Emits the new overlay version whenever pairing/results change.
  app.get('/api/tournaments/:id/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    const unsub = service.subscribe(String(req.params.id), (version) => {
      res.write(`event: bracket-update\ndata: ${JSON.stringify({ version })}\n\n`);
    });
    const ka = setInterval(() => res.write(': keepalive\n\n'), 25000);
    req.on('close', () => { clearInterval(ka); unsub(); });
  });
}

export function registerTournaments(app: express.Express, service: TournamentService) {
  const { core } = service, base = '/api/management';
  app.get(`${base}/tournaments`, core.guard('tournaments'), endpoint(async (_req, res) => res.json(await service.list())));
  app.get(`${base}/tournaments/:id`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.view(String(req.params.id)))));
  app.post(`${base}/tournaments/:id/register`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.registerWalkIn((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/checkin`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.checkIn((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/bracket`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.generateBracket((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/meta`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.setMeta((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/pair`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.pairMatches((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/finalize`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.finalize((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/matches/:mid/schedule`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.scheduleMatch((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id, matchId: req.params.mid }))));
  app.post(`${base}/tournaments/:id/matches/:mid/result`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.enterResult((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id, matchId: req.params.mid }))));
}
