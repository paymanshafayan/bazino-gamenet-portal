---
name: bazino-change-domain
description: Change the API server domain across the whole Bazino Pro project: kApiBaseUrl in flutter_app/lib/api_config.dart (with trailing-slash normalization), Web Sync modal placeholder in Management App (both copies), and docs (ARCHITECTURE, PUBLISH_AND_DATABASE_GUIDE, SESSION_SUMMARY). Use when the user announces a new server/domain.
metadata:
  author: bazino
  version: "1.0.0"
---

# bazino-change-domain

## هدف
تغییر آدرس سرور API در کل پروژه: اپ فلاتر (`kApiBaseUrl`)، اپ مدیریت
(Web Sync)، و اسناد. مثال انجامشده: `xerxes.biz` → `bazino.pro`.

## زمان استفاده
وقتی کاربر دامنه/آدرس جدید سرور را اعلام میکند.

## مراحل

### ۱. پیدا کردن همهی ارجاعها
```bash
grep -rn "OLD_DOMAIN" --include="*.dart" --include="*.ts" --include="*.tsx" \
  --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v "\.git/" | grep -v dist/
```
نقاط استاندارد:
- `flutter_app/lib/api_config.dart` — `defaultValue` (مهمترین)
- `Management App/Bazino/src/components/WebSyncModal.tsx` — متن راهنما + placeholder
- `Management App/Bazino/src/types.ts`, `utils/syncClient.ts` — کامنتها
- نسخههای کپی داخل `flutter_app/Management App/` (ممکن است دامنهی قدیمیتری داشته باشند!)
- `ARCHITECTURE.md`, `PUBLISH_AND_DATABASE_GUIDE.md`, `SESSION_SUMMARY.md`

### ۲. ویرایش api_config.dart
```dart
const String _kApiBaseUrlConfigured = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://NEW_DOMAIN/',   // با اسلش هم امن است
);
// kApiBaseUrl بهصورت خودکار اسلش انتهایی را حذف میکند (normalization)
```

### ۳. جایگزینی در بقیهی فایلها
- WebSyncModal / types / syncClient (هر دو نسخه) — جایگزین سادهی رشته
- ARCHITECTURE.md — بهروزرسانی «دامنهی فعلی» + افزودن دامنهی قبلی به تاریخچه
- PUBLISH_AND_DATABASE_GUIDE.md — `server_name` و `certbot -d`
- SESSION_SUMMARY.md — افزودن بخش جدید ثبت تغییر (بخشهای قدیمی را دست نزن)

### ۴. بررسی نهایی
```bash
grep -rn "OLD_DOMAIN" ... # باید فقط در بخشهای تاریخی SESSION_SUMMARY/ARCHITECTURE باشد
```

## معیار موفقیت
- `defaultValue` در api_config.dart = دامنهی جدید
- هیچ ارجاع فعال (کد) به دامنهی قبلی نمانده
- تاریخچهی دامنه در ARCHITECTURE.md بهروز است

## نکتهها
- بدون اسلش انتهایی در `kApiBaseUrl` نهایی (نرمال میشود).
- `wss://` چت خودکار از روی `kApiBaseUrl` ساخته میشود — نیازی به تغییر جداگانه نیست.
- مقدار `APP_URL` در `.env` سرور را هم بررسی کن (برای لینکهای خودارجاعی).
