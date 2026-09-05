/**
 * ماشین حالت Friend Gate — بدون اتصال به Meta.
 * شاهد Share = کامنت کد یکتا زیر همان پست (`share_confirmed_by_friend_code`).
 * پیام ۱ = یک Private Reply؛ پیام ۲ = دایرکت بعد از دکمه (نه PR دوم).
 */
import { randomBytes } from 'crypto';
import type { AffiliateRow, CouponRow, IgEventRow, IgMediaRow, IgMemberRow, IDataStore } from '../dataProviders';
import { isValidCode, newAffId, normalizeCode } from './engine';
import {
  IG_MSG_LANGS, type IgMsgLang, knownCampaignIds, langFromCaptionVersion, readIgSettings,
} from './igSettings';

const iso = () => new Date().toISOString();

export function renderIgTemplate(tpl: string, vars: Record<string, string>): string {
  return String(tpl || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

export function generatePartnerCode(taken: Set<string>): string {
  for (let i = 0; i < 24; i++) {
    const n = 100000 + (randomBytes(3).readUIntBE(0, 3) % 900000);
    const s = String(n);
    if (!taken.has(s)) return s;
  }
  return String(Date.now()).slice(-6);
}

export function extractNumericCode(text: string): string | null {
  const m = String(text || '').match(/\b(\d{5,8})\b/);
  return m ? m[1] : null;
}

export function isKeywordComment(text: string, keyword: string): boolean {
  const kw = String(keyword || '').trim();
  if (!kw) return false;
  const body = String(text || '').replace(/@[A-Za-z0-9._]+/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const re = new RegExp(`(^|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`, 'i');
  return re.test(body);
}

export function validatePublishedMediaPayload(body: any): { ok: true; row: { media_id: string; media_type: 'post' | 'reel'; campaign_id: string; published_at: string; caption_version: string } } | { ok: false; status: number; code: string; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, status: 400, code: 'invalid_payload', error: 'invalid_payload' };
  const media_id = String(body.media_id || '').trim();
  if (!media_id || media_id.length > 80 || !/^[A-Za-z0-9._-]+$/.test(media_id)) {
    return { ok: false, status: 400, code: 'invalid_payload', error: 'media_id' };
  }
  const media_type = String(body.media_type || '').trim().toLowerCase();
  if (media_type !== 'post' && media_type !== 'reel') {
    return { ok: false, status: 400, code: 'invalid_payload', error: 'media_type' };
  }
  let published_at = body.published_at == null || body.published_at === '' ? iso() : String(body.published_at).trim();
  if (Number.isNaN(Date.parse(published_at))) {
    return { ok: false, status: 400, code: 'invalid_payload', error: 'published_at' };
  }
  published_at = new Date(published_at).toISOString();
  const campaign_id = body.campaign_id == null || body.campaign_id === '' ? '' : String(body.campaign_id).trim();
  const caption_version = body.caption_version == null || body.caption_version === '' ? '' : String(body.caption_version).trim().slice(0, 40);
  return { ok: true, row: { media_id, media_type: media_type as 'post' | 'reel', campaign_id, published_at, caption_version } };
}

export type IgOutbound = {
  kind: 'private_reply' | 'dm';
  commentId?: string;
  igUserId: string;
  text: string;
  buttons: Array<{ type: 'postback'; title: string; payload: string }>;
};

function pickLang(settings: Record<string, string>, captionVersion?: string): IgMsgLang {
  const cap = langFromCaptionVersion(captionVersion, (settings.ig_msg_lang as IgMsgLang) || 'tr');
  return IG_MSG_LANGS.includes(cap) ? cap : 'tr';
}

function msg(settings: Record<string, string>, key: 'partner1' | 'partner2' | 'friend' | 'invite' | 'btn', lang: IgMsgLang): string {
  if (key === 'btn') return settings[`ig_btn_follow_${lang}`] || settings.ig_btn_follow_tr;
  return settings[`ig_msg_${key}_${lang}`] || settings[`ig_msg_${key}_tr`] || '';
}

function vars(settings: Record<string, string>, lang: IgMsgLang, extra: Record<string, string> = {}): Record<string, string> {
  return {
    code: extra.code || '',
    follow_button: msg(settings, 'btn', lang),
    invite_url: extra.invite_url || '',
    coupon_line: extra.coupon_line || '',
    handle: extra.handle || '',
    campaign: extra.campaign || '',
  };
}

async function writeEvent(store: IDataStore, e: Partial<IgEventRow> & { kind: string }) {
  await store.createIgEvent({
    id: newAffId('IGE'),
    memberId: e.memberId || '',
    mediaId: e.mediaId || '',
    commentId: e.commentId || '',
    kind: e.kind,
    payload: e.payload || '',
    result: e.result || '',
    verificationMethod: e.verificationMethod || '',
    createdAt: iso(),
  });
}

export async function registerPublishedMedia(store: IDataStore, body: any, idempotencyKey: string): Promise<{ status: number; json: any }> {
  const parsed = validatePublishedMediaPayload(body);
  if (parsed.ok === false) return { status: parsed.status, json: { accepted: false, error: parsed.error, code: parsed.code } };
  const settings = await readIgSettings(store);
  if (parsed.row.campaign_id) {
    const known = knownCampaignIds(settings);
    if (!known.includes(parsed.row.campaign_id)) {
      return { status: 422, json: { accepted: false, error: 'campaign_not_found', code: 'campaign_not_found' } };
    }
  }
  const existing = await store.getIgMediaByMediaId(parsed.row.media_id);
  if (existing) {
    if (existing.mediaType !== parsed.row.media_type) {
      return { status: 409, json: { accepted: false, error: 'conflicting_media', code: 'conflicting_media', media_id: existing.mediaId, portal_media_id: existing.id } };
    }
    return {
      status: 200,
      json: { accepted: true, media_id: existing.mediaId, portal_media_id: existing.id, campaign_id: existing.campaignId || null, status: 'registered', duplicate: true },
    };
  }
  const row: IgMediaRow = {
    id: newAffId('IGM'),
    mediaId: parsed.row.media_id,
    mediaType: parsed.row.media_type,
    campaignId: parsed.row.campaign_id,
    publishedAt: parsed.row.published_at,
    captionVersion: parsed.row.caption_version,
    idempotencyKey: String(idempotencyKey || '').slice(0, 120),
    createdAt: iso(),
  };
  await store.upsertIgMedia(row);
  await writeEvent(store, { mediaId: row.mediaId, kind: 'media_registered', payload: JSON.stringify({ media_type: row.mediaType, campaign_id: row.campaignId }), result: 'ok', verificationMethod: 'ingest' });
  return {
    status: 200,
    json: { accepted: true, media_id: row.mediaId, portal_media_id: row.id, campaign_id: row.campaignId || null, status: 'registered' },
  };
}

async function ensureAffiliateForCode(store: IDataStore, code: string, name: string): Promise<void> {
  const n = normalizeCode(code);
  if (!isValidCode(n)) return;
  if (await store.getAffiliateByCode(n)) return;
  const now = iso();
  const row: AffiliateRow = {
    id: newAffId('AFF'), code: n, username: '', name: name || n, type: 'instagram', language: 'tr',
    destination: '/', parentId: '', status: 'active', newPct: -1, returnPct: -1, tournamentPct: -1, overridePct: -1,
    notes: 'ig-campaign', createdAt: now, updatedAt: now,
  };
  await store.createAffiliate(row);
}

export async function onCampaignComment(store: IDataStore, input: {
  mediaId: string; commentId: string; text: string; igUserId: string; igUsername: string;
}): Promise<{ ok: boolean; code?: string; outbound?: IgOutbound; member?: IgMemberRow; error?: string }> {
  const settings = await readIgSettings(store);
  if (settings.ig_program_open !== '1') return { ok: false, error: 'PROGRAM_CLOSED' };
  const media = await store.getIgMediaByMediaId(input.mediaId);
  if (!media) return { ok: false, error: 'MEDIA_UNKNOWN' };
  const dup = await store.getIgMemberByCommentId(input.commentId);
  if (dup) return { ok: true, code: 'idempotent', member: dup };

  const numeric = extractNumericCode(input.text);
  const partnerForCode = numeric ? await store.getIgMemberByPartnerCode(numeric) : undefined;
  if (numeric && partnerForCode && partnerForCode.role === 'partner' && partnerForCode.mediaId === input.mediaId) {
    const partner = partnerForCode;
    if (partner.igUserId && input.igUserId && partner.igUserId === input.igUserId) return { ok: false, error: 'SELF_CODE' };
    const lang = pickLang(settings, media.captionVersion);
    const now = iso();
    const friend: IgMemberRow = {
      id: newAffId('IGP'), role: 'friend', campaignId: partner.campaignId, mediaId: media.mediaId,
      commentId: input.commentId, igUserId: input.igUserId, igUsername: input.igUsername || '',
      partnerCode: numeric, parentMemberId: partner.id, affiliateCode: partner.affiliateCode || partner.partnerCode,
      status: 'friend_follow_pending', followMethod: '', shareStatus: 'share_confirmed_by_friend_code',
      couponCode: '', inviteUrl: '', createdAt: now, updatedAt: now,
    };
    await store.createIgMember(friend);
    await writeEvent(store, { memberId: friend.id, mediaId: media.mediaId, commentId: input.commentId, kind: 'friend_code_comment', result: 'share_confirmed_by_friend_code', verificationMethod: 'share_confirmed_by_friend_code', payload: numeric });
    const text = renderIgTemplate(msg(settings, 'friend', lang), vars(settings, lang, { code: numeric, handle: input.igUsername }));
    return {
      ok: true, member: friend,
      outbound: { kind: 'private_reply', commentId: input.commentId, igUserId: input.igUserId, text, buttons: [{ type: 'postback', title: msg(settings, 'btn', lang), payload: `ig_follow:${friend.id}` }] },
    };
  }

  const keyword = settings.ig_campaign_keyword || 'SQUAD';
  if (!isKeywordComment(input.text, keyword)) {
    if (numeric) return { ok: false, error: 'CODE_UNKNOWN' };
    return { ok: false, error: 'NO_MATCH' };
  }

  const taken = new Set((await store.listIgMembers()).filter(m => m.role === 'partner').map(m => m.partnerCode));
  for (const a of await store.listAffiliates()) taken.add(a.code);
  const code = generatePartnerCode(taken);
  await ensureAffiliateForCode(store, code, input.igUsername || code);
  const lang = pickLang(settings, media.captionVersion);
  const now = iso();
  const partner: IgMemberRow = {
    id: newAffId('IGP'), role: 'partner', campaignId: media.campaignId || knownCampaignIds(settings)[0] || 'SQUAD26',
    mediaId: media.mediaId, commentId: input.commentId, igUserId: input.igUserId, igUsername: input.igUsername || '',
    partnerCode: code, parentMemberId: '', affiliateCode: code, status: 'pr1_sent', followMethod: '',
    shareStatus: '', couponCode: '', inviteUrl: '', createdAt: now, updatedAt: now,
  };
  await store.createIgMember(partner);
  await writeEvent(store, { memberId: partner.id, mediaId: media.mediaId, commentId: input.commentId, kind: 'partner_comment', result: 'pr1_sent', verificationMethod: 'comment_id', payload: keyword });
  const text = renderIgTemplate(msg(settings, 'partner1', lang), vars(settings, lang, { code, handle: input.igUsername }));
  return {
    ok: true, member: partner,
    outbound: { kind: 'private_reply', commentId: input.commentId, igUserId: input.igUserId, text, buttons: [{ type: 'postback', title: msg(settings, 'btn', lang), payload: `ig_follow:${partner.id}` }] },
  };
}

export async function onFollowButton(store: IDataStore, memberId: string, followVerified: boolean): Promise<{ ok: boolean; outbound?: IgOutbound; member?: IgMemberRow; error?: string }> {
  const member = await store.getIgMemberById(memberId);
  if (!member) return { ok: false, error: 'NOT_FOUND' };
  const settings = await readIgSettings(store);
  const media = await store.getIgMediaByMediaId(member.mediaId);
  const lang = pickLang(settings, media?.captionVersion);
  const followMethod = followVerified ? 'follow_verified' : 'button_event_only';
  const now = iso();

  if (member.role === 'partner') {
    if (member.status === 'code_sent') return { ok: true, member };
    await store.updateIgMember(member.id, { status: 'code_sent', followMethod, updatedAt: now });
    await writeEvent(store, { memberId: member.id, mediaId: member.mediaId, kind: 'follow_button', result: 'code_sent', verificationMethod: followMethod });
    const text = renderIgTemplate(msg(settings, 'partner2', lang), vars(settings, lang, { code: member.partnerCode, handle: member.igUsername }));
    const updated = await store.getIgMemberById(member.id);
    return {
      ok: true, member: updated,
      outbound: { kind: 'dm', igUserId: member.igUserId, text, buttons: [] },
    };
  }

  if (member.role === 'friend') {
    if (member.status === 'gated_ok') return { ok: true, member };
    const base = String(settings.ig_invite_base_url || 'https://bazino.pro').replace(/\/$/, '');
    const ref = member.affiliateCode || member.partnerCode;
    const campaign = member.campaignId || 'SQUAD26';
    const inviteUrl = `${base}/?ref=${encodeURIComponent(ref)}&utm_source=instagram&utm_medium=affiliate&utm_campaign=${encodeURIComponent(campaign)}&partner_code=${encodeURIComponent(member.partnerCode)}`;
    let couponCode = '';
    let couponLine = '';
    const couponVal = Number(settings.ig_friend_coupon_value || 0);
    if (Number.isFinite(couponVal) && couponVal > 0) {
      couponCode = `SQUAD-${member.partnerCode}`;
      const exists = await store.getCouponByCode(couponCode);
      if (!exists) {
        const coupon: CouponRow = {
          code: couponCode,
          type: settings.ig_friend_coupon_type === 'fixed' ? 'fixed' : 'percent',
          value: couponVal,
          minOrder: 0,
          expiry: '',
          expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          maxUsageCount: 1,
          usageCount: 0,
          isActive: true,
          ownerUsername: '',
        };
        await store.createCoupon(coupon);
      }
      couponLine = lang === 'fa' ? `کد کوپن یک‌بارمصرف: ${couponCode}`
        : lang === 'ru' ? `Одноразовый купон: ${couponCode}`
        : lang === 'en' ? `One-time coupon: ${couponCode}`
        : `Tek kullanımlık kupon: ${couponCode}`;
    }
    await store.updateIgMember(member.id, { status: 'gated_ok', followMethod, inviteUrl, couponCode, updatedAt: now });
    await writeEvent(store, { memberId: member.id, mediaId: member.mediaId, kind: 'friend_gate_ok', result: 'gated_ok', verificationMethod: followMethod });
    const text = renderIgTemplate(msg(settings, 'invite', lang), vars(settings, lang, { code: member.partnerCode, invite_url: inviteUrl, coupon_line: couponLine }));
    const updated = await store.getIgMemberById(member.id);
    return { ok: true, member: updated, outbound: { kind: 'dm', igUserId: member.igUserId, text, buttons: [] } };
  }
  return { ok: false, error: 'BAD_ROLE' };
}

export function parseFollowPayload(payload: string): string | null {
  const m = String(payload || '').match(/^ig_follow:(.+)$/);
  return m ? m[1] : null;
}
