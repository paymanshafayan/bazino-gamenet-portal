# طرح سیستم Affiliate Marketing اینستاگرام برای Bazino Pro — نسخهٔ ۲ (فلو جدید ساده‌شده)

**وضعیت:** فعال — فلو جدید از ۱۴۰۵/۰۶/۲۳ (2026-09-14) پیاده‌سازی شد و ۵۶۷/۵۶۷ تست سبز است  
**تغییر مهم نسبت به نسخهٔ ۱:** مسیر «دوست کد را کامنت کند و لینک بگیرد» بازنشسته شد. همکار مستقیماً لینک دعوت خصوصی می‌گیرد و خودش برای دوستانش می‌فرستد.  
**دامنه:** جذب فالوور، هدایت به سایت، ثبت‌نام با لینک همکار، کوپن دوست و کمیسیون همکار از پرداخت‌های بعدی  
**حساب:** `@bazinopro` — پورتال به Meta وصل نیست، فقط Zernio واسط PR/DM است

---

## ۱. قانون صداقت و فلو جدید

- اگر بخشی از طرح از نظر فنی/دسترسی/سیاست پلتفرم ممکن نباشد، پیش از اجرا با برچسب **محدودیت / خوداظهاری / شاهد غیرمستقیم** اعلام شود
- کمیسیون فقط برای **رزرو یا حضور پرداخت‌شدهٔ مشتری جدید** — Follow/Comment/Share به‌تنهایی کمیسیون ندارند
- Share فردی اینستاگرام با API تأیید نمی‌شود؛ در فلو جدید Share اجباری نیست و شاهد عملی، کلیک روی لینک و ثبت‌نام است
- **لینک دعوت خصوصی فقط برای همکار ارسال می‌شود**، نه برای دوست از طریق سیستم. همکار خودش لینک را برای دوستانش می‌فرستد

---

## ۲. کمپین «Invite Your Squad» — فلو جدید ساده‌شده (مصوب 2026-09-14)

### پیام راهنمای مصوب (partner1 — PR)

> پیج را فالو کن و بر روی دکمه «فالو دارم» بزن تا لینک دعوت اختصاصی خودت برات ارسال بشه. بعد این لینک را برای دوستات بفرست. دوستانت با ثبت‌نام از طریق این لینک، کوپن تخفیف دریافت می‌کنند و تو هم از این به بعد از هر بار پرداخت آن‌ها در Bazino کمیسیون دریافت می‌کنی.

ترجمه‌ها در `shared/publishing/messages.ts` — چهار زبان fa/tr/en/ru

### فلو ثبت‌شده (۸ مرحله)

1. **همکار کلمهٔ کلیدی مصوب را زیر پست کامنت می‌کند** — کلیدواژه‌ها: `آماده / Hazır / Ready / Готово` — تطبیق Whole Word یونیکد با ZWNJ
2. **پیام راهنمای بالا + دکمه «فالو دارم» برای او ارسال می‌شود** — `private_reply` به همان `commentId`، با dedup `fingerprint({account,comment,kind:'private_reply'})` → یک PR برای هر کامنت
3. **همکار پیج `@bazinopro` را Follow می‌کند**
4. **روی دکمه «فالو دارم» می‌زند** — event `message.received` با `postbackPayload` امضاشده `ig4.{id}.{nonce}.{hmacSHA256}` — `button` به `igUserId` مقید، replay ۳۰ روزه
5. **لینک دعوت اختصاصی برای همکار ارسال می‌شود** — DM به `conversationId` همان همکار: `POST /v1/inbox/conversations/{conv}/messages` — متن `partner2` حاوی `{{invite_url}}` که هنگام dispatch به `https://bazino.pro/ig/invite/{memberId}?token={hmac}` تبدیل می‌شود — توکن ۶۴ hex، HMAC با `invitationKey()` و `partner:{id}:{igUserId}:{campaign}:{media}:{linkExpiresAt}` — اعتبار ۳۶۵ روز
6. **همکار لینک را برای دوستانش می‌فرستد** — خارج از سیستم، دستی
7. **دوستان با ثبت‌نام از طریق لینک، کوپن تخفیف دریافت می‌کنند** — `GET /api/instagram/invites/:id?token=` → `click()` با dedup ۱۵ دقیقه‌ای IP+UA → `POST .../claim` با `consent + likeAttested + phoneVerifiedAt` → `claimAttribution(code=partnerCode, source='link')` → کوپن owner-bound `IG-{8hex}` با `maxUsage=1` — لینک همکار **قابل استفاده مجدد**: چند دوست می‌توانند همان لینک را claim کنند، هرکدام کوپن جدا
8. **همکار طبق شرایط و پرداخت موفق دوستان، کمیسیون دریافت می‌کند** — `onOrderPaid` فقط روی `reservation/tournament/session` با مبلغ مرجع پرداخت، مشتری جدید، یک صاحب کمیسیون، hold تا `refundDays`

### موارد حذف‌شده (بازنشسته از 2026-09-14)

- ❌ ارسال پیام و پست توسط سیستم برای دوست
- ❌ کامنت‌کردن کد شناسایی همکار توسط دوست (`share_confirmed_by_friend_code` دیگر تولید نمی‌شود — اگر کامنت ۶رقمی بیاید `friend_flow_retired`)
- ❌ دریافت لینک دعوت توسط دوست از سیستم
- ❌ ارسال لینک دعوت فقط پس از کامنت کد دوست

### سطح‌های اثبات (جدید)

| سطح | چه چیزی سنجیده می‌شود | کاربرد |
|---|---|---|
| ۱ Campaign | `comments` کلیدی + `reach` | جذابیت پست |
| ۲ Partner Comment | `commentId` + PR موفق | شروع فلو |
| ۳ Button Tap | `message.received` با payload امضاشده | تأیید Follow (verified یا button_event_only) |
| ۴ Link Sent | DM لینک به همکار | همکار آمادهٔ دعوت |
| ۵ Referral Click | کلیک یکتا روی `/ig/invite` با dedup IP+UA ۱۵m | علاقه دوست |
| ۶ Qualified | ثبت‌نام + کوپن + `claimAttribution` | صلاحیت پاداش |
| ۷ Paid | رزرو/حضور پرداخت‌شده از همان کد | کمیسیون |

---

## ۳. ساختار شناسه و لینک (جدید)

| نوع | نمونه | کاربرد |
|---|---|---|
| کد همکار | `123456` (۶رقمی) | یکتا، تولید با `randomInt(100000,1000000)` + چک DB |
| لینک خصوصی همکار | `https://bazino.pro/ig/invite/IG4-XXXX?token=64hex` | HMAC-SHA256، ۳۶۵ روز اعتبار، reusable |
| لینک عمومی | `https://bazino.pro/?ref=123456` | fallback برای Bio/Story |
| کوپن دوست | `IG-A1B2C3D4` | owner-bound به username دوست، ۱ بار مصرف |

- لینک خصوصی همکار در `pub-outbox` فقط به‌صورت `{{invite_url}}` ذخیره می‌شود، نه URL واقعی — URL واقعی فقط هنگام dispatch ساخته می‌شود و در لاگ/لیست ادمین نمایش داده نمی‌شود
- `partner1` اجازه ندارد حاوی `invite_url` یا `/ig/invite/` باشد (`PRIVATE_LINK_FORBIDDEN`) — `partner2` مجاز است

---

## ۴. مدل پاداش و کمیسیون (بدون تغییر منطق مالی)

| رویداد | وضعیت | پیشنهاد |
|---|---|---|
| Follow/Comment/Button | محرک | بدون کمیسیون |
| Click لینک | تعامل | بدون کمیسیون |
| اولین رزرو/حضور پرداخت‌شده مشتری جدید | واجد شرایط | ۱۰٪ خالص |
| بازگشتی | مشروط | ۵٪ تا ۳۰ روز (نیازمند تأیید مالی) |
| لغو/بازپرداخت/تست/تکراری | رد | ۰ |

- `Pending` تا `refundDays` (۷ روز) → تأیید دستی نمی‌تواند hold را دور بزند → `approved` → تسویه ماهانه به کیف پول (نه نقد فیزیکی)
- یک تراکنش یک صاحب کمیسیون

---

## ۵. منطق Attribution (جدید — ساده‌شده)

- آخرین لینک معتبر همکار پیش از رزرو (ثبت سروری `pub-click` + `attribution`) — تا `attributionDays` (۳۰ روز)
- کد دستی فرم بر لینک مقدم، اما اگر نامعتبر باشد به قبلی برنمی‌گردد
- یک کاربر نمی‌تواند در یک کمپین از دو همکار مختلف claim کند (`CAMPAIGN_ALREADY_CLAIMED`) — اما چند کاربر مختلف می‌توانند از یک همکار claim کنند (reusable link)
- کارکنان/ادمین/خودارجاعی → بدون کمیسیون

---

## ۶. قیف محتوایی (جدید)

| مرحله | CTA | شاخص |
|---|---|---|
| جذب | Follow + کامنت کلیدواژه | Comments, Follows |
| فعال‌سازی | تپ دکمه | Button taps, PR sent |
| دریافت لینک | DM لینک به همکار | Link sent |
| اشتراک‌گذاری | همکار لینک را برای دوستان می‌فرستد | Clicks |
| تبدیل | ثبت‌نام با لینک + کوپن | Leads, Coupons |
| درآمد | پرداخت | Paid, Commission |

---

## ۷. شفافیت تبلیغاتی

- محتوای دارای کمیسیون = branded content → نیازمند Paid Partnership label در صورت شمول
- همکار نباید وعدهٔ قطعی/جایزهٔ تأییدنشده دهد

---

## ۸. معماری فنی — فلو جدید

```
Manus -> POST /api/integrations/instagram/published-media {media_id} -> registry approved
Zernio -> POST /api/webhooks/zernio {comment.received: nativeId, commentId, authorId, text, createdAt} 
  -> HMAC raw body + accountId==cfg.zernioAccountId + nativeId==registry.nativeId
  -> ingest dedup (eventId+hash) -> queue priority 0
  -> processInbox: campaigns.dispatch
    -> onComment: keyword? WholeWord fa/tr/en/ru? repeat? -> create partner member (IG4) + affiliate code + PR guide (partner1) + button signed
  -> sendOutbox: beforeSend eligible? -> prepareMessage? (PR keeps guide) -> Zernio PR /v1/inbox/comments/{media}/{comment}/private-reply

Partner taps button -> Zernio -> message.received {button=signed, conversationId, authorId}
  -> memberForButton verifies HMAC + nonce + 30d expiry + author match
  -> follow lookup (Zernio /follow-status) outside tx
  -> onMessage: follow? -> status link_ready + linkExpiresAt 365d + DM partner_link (partner2 placeholder)
  -> sendOutbox: prepareMessage replaces {{invite_url}} with /ig/invite/{id}?token={hmac} -> DM /v1/inbox/conversations/{conv}/messages

Friend -> GET /ig/invite/{partnerId}?token= -> info() + click() dedup IP+UA 15m
Friend -> POST /ig/invite/{partnerId}/claim {token, consent, likeAttested, handle} -> phoneVerified + staff check + claimKey {campaign,username} -> claimAttribution + coupon IG-... + audit
Friend -> reservation with referralCode=partnerCode -> onOrderPaid -> pending commission -> approve after refund window -> monthly wallet settlement
```

**نکات امنیتی:**
- `partner1` هرگز لینک ندارد — `PRIVATE_LINK_FORBIDDEN` در `saveCampaign`
- لینک فقط در DM همکار، با `{{invite_url}}` که هنگام ارسال جایگزین می‌شود — در DB فقط placeholder
- دکمه `ig4.{id}.{nonce}.{sig}` — `sig = HMAC-SHA256(invitationKey, button:{id.nonce}:{igUserId}:{campaign}:{media})`
- لینک `HMAC-SHA256(invitationKey, partner:{id}:{igUserId}:{campaign}:{media}:{linkExpiresAt})`
- `outboundEnabled` باید true باشد وگرنه صف در queued می‌ماند
- `pub-outbox` متن کامل خصوصی را لاگ نمی‌کند — `report()` فقط status/stage/evidence

---

## ۹. تست‌ها (فلو جدید — 2026-09-14)

- `publishing.test.mts` ۵۱/۵۱: PR بدون لینک، numeric code → `friend_flow_retired`, DM حاوی `/ig/invite/?token=`, reusable link (چند دوست یک لینک), `CAMPAIGN_ALREADY_CLAIMED` برای یک user با دو partner مختلف
- کل سوئیت ۵۶۷/۵۶۷ سبز

---

## ۱۰. References

[1] Private Replies — یک PR برای هر کامنت، مهلت ۷ روز  
[2] Branded content — افشای همکاری  
[3] Meta Business — Paid partnership  
[4] Webhooks — comment.received + message.received  
[5] Media Insights — shares کلی، نه فردی  
[6] Collaboration updates

---

## تاریخچه

- **نسخه ۱ (تا 2026-09-07):** همکار کد می‌گرفت، دوست کد را کامنت می‌کرد، سیستم به دوست لینک می‌داد — `share_confirmed_by_friend_code`
- **نسخه ۲ (2026-09-14):** همکار مستقیماً لینک reusable می‌گیرد، دوست از طریق لینک ثبت‌نام می‌کند — ساده‌تر، بدون نیاز به کامنت دوست — پیاده‌سازی در `server/affiliate/campaignV4.ts` + `friendGate.ts`
