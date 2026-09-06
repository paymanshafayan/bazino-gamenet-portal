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
import { OpsCore, endpoint, fail, newId, nowISO, parseJSON, stringValue } from './core';
import { assertStationFree } from './bookings';
import type { FinanceService } from './finance';

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
    return this.core.command(actor, b.idempotencyKey, 'tournament-register', b, async () => {
      const id = stringValue(b.tournamentId, 100, true);
      const store = this.core.store;
      const row = await store.getTournamentById(id);
      if (!row) fail('NOT_FOUND', 404);
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
    return this.core.command(actor, b.idempotencyKey, 'tournament-checkin', b, async () => {
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
    return this.core.command(actor, b.idempotencyKey, 'tournament-bracket', b, async () => {
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

  /** Book a station/time for a match (uses the same slot conflict guard as bookings). */
  async scheduleMatch(actor: string, b: any) {
    return this.core.command(actor, b.idempotencyKey, 'match-schedule', b, async () => {
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
    return this.core.command(actor, b.idempotencyKey, 'match-result', b, async () => {
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
      return this.core.save('tournament', tournamentId, { ...overlay.data, bracket }, overlay.version);
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
}

export function registerTournaments(app: express.Express, service: TournamentService) {
  const { core } = service, base = '/api/management';
  app.get(`${base}/tournaments`, core.guard('tournaments'), endpoint(async (_req, res) => res.json(await service.list())));
  app.get(`${base}/tournaments/:id`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.view(String(req.params.id)))));
  app.post(`${base}/tournaments/:id/register`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.registerWalkIn((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/checkin`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.checkIn((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/bracket`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.generateBracket((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id }))));
  app.post(`${base}/tournaments/:id/matches/:mid/schedule`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.scheduleMatch((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id, matchId: req.params.mid }))));
  app.post(`${base}/tournaments/:id/matches/:mid/result`, core.guard('tournaments'), endpoint(async (req, res) => res.json(await service.enterResult((req as any).staff.username, { ...(req.body || {}), tournamentId: req.params.id, matchId: req.params.mid }))));
}
