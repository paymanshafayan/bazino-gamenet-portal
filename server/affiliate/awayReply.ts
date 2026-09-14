/**
 * Away auto-reply engine — records inbound Instagram DMs ('ig-inbox') and,
 * when the away policy allows, enqueues exactly one language-matched reply
 * through the existing durable outbox. No direct provider calls: the reply is
 * a normal outbox row (idempotent, expiring, admin-visible in Events/outbox).
 */
import { OpsCore, fingerprint, nowISO } from '../management/core';
import { DurableQueue, type InboxEvent } from '../publishing/queue';
import {
  DEFAULT_AWAY_SETTINGS, decideAwayReply, detectAwayLanguage, dateKeyInZone,
  sanitizeAwaySettings, type AwaySettings,
} from './awayPolicy';

const SETTING_KEY = 'ig_away_settings';

export interface IgInboxRecord {
  accountId: string;
  conversationId: string;
  authorId: string;
  username: string;
  text: string;
  language: string;
  receivedAt: string;
  messageId: string;
  replied: boolean;
  replyLanguage?: string;
  replyOutboxId?: string;
  reason?: string;
}

export class AwayReplier {
  constructor(public core: OpsCore, public queue: DurableQueue) {}

  async settings(): Promise<AwaySettings> {
    const raw = await this.core.store.getSetting(SETTING_KEY);
    if (!raw) return { ...DEFAULT_AWAY_SETTINGS };
    try { return sanitizeAwaySettings(JSON.parse(raw)); } catch { return { ...DEFAULT_AWAY_SETTINGS }; }
  }

  async saveSettings(raw: any): Promise<AwaySettings> {
    const clean = sanitizeAwaySettings(raw);
    await this.core.store.setSetting(SETTING_KEY, JSON.stringify(clean));
    return clean;
  }

  async list(limit = 100) {
    const rows = await this.core.list<IgInboxRecord>('ig-inbox');
    return rows
      .map(r => ({ id: r.id, ...r.data }))
      .sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)))
      .slice(0, Math.min(Math.max(limit, 1), 200));
  }

  /** Called for every inbound message.received. Records it; replies when allowed. */
  async recordAndMaybeReply(e: InboxEvent, campaignHandled: boolean): Promise<{ recorded: boolean; replied: boolean; reason: string }> {
    if (e.direction === 'outgoing') return { recorded: false, replied: false, reason: 'outgoing' };
    if (e.platform && e.platform !== 'instagram') return { recorded: false, replied: false, reason: 'not_instagram' };
    if (!e.conversationId || !e.authorId) return { recorded: false, replied: false, reason: 'missing_ids' };
    const id = fingerprint({ conversation: e.conversationId, message: e.messageId || '', author: e.authorId, text: e.text || '', ts: e.timestamp });
    if (await this.core.read('ig-inbox', id)) return { recorded: false, replied: false, reason: 'duplicate' };

    const text = String(e.text || '').slice(0, 600);
    const record: IgInboxRecord = {
      accountId: e.accountId, conversationId: e.conversationId, authorId: e.authorId,
      username: String(e.username || '').slice(0, 80), text,
      language: detectAwayLanguage(text), receivedAt: e.createdAt || e.timestamp || nowISO(),
      messageId: String(e.messageId || ''), replied: false, reason: '',
    };

    const settings = await this.settings();
    const now = new Date();
    const rows = await this.core.list<IgInboxRecord>('ig-inbox');
    const todayKey = dateKeyInZone(now, settings.timezone);
    const decision = decideAwayReply({
      settings, now, direction: e.direction, platform: e.platform, text: e.text,
      conversationId: e.conversationId, authorId: e.authorId, campaignHandled,
      repliesToday: rows.filter(r => r.data.replied && dateKeyInZone(new Date(String(r.data.receivedAt)), settings.timezone) === todayKey).length,
      lastReplyAt: rows
        .filter(r => r.data.replied && r.data.conversationId === e.conversationId)
        .map(r => String(r.data.receivedAt)).sort().pop() || null,
    });

    if (decision.reply) {
      const outboxId = await this.queue.enqueue({
        kind: 'dm', accountId: e.accountId, mediaId: '', memberId: `away:${id}`,
        recipientId: e.authorId, conversationId: e.conversationId,
        text: settings.messages[decision.language!], buttons: [],
        expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
      }, 'away_reply');
      await this.core.save('ig-inbox', id, { ...record, replied: true, replyLanguage: decision.language, replyOutboxId: outboxId, reason: decision.reason }, 0);
      return { recorded: true, replied: true, reason: decision.reason };
    }
    await this.core.save('ig-inbox', id, { ...record, reason: decision.reason }, 0);
    return { recorded: true, replied: false, reason: decision.reason };
  }
}
