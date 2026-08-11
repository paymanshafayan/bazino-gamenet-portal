# 🎯 پرامت آماده: نصب اسکیل UI/UX Pro Max + بهبود UI پروژه بازینو

> این پرامت را در ابتدای چت جدید (با هر دستیار AI) کپی کن.
> کاری که انجام میدهد دقیقاً همان کاری است که قبلاً انجام شد: نصب اسکیل + اعمال قوانین UX روی تمها.

---

```
نقش تو: مهندس ارشد UI/UX + توسعه‌دهنده‌ی فول‌استک روی ریپو bazino-gamenet-portal.
دو کار انجام بده: (۱) اسکیل «UI/UX Pro Max» را نصب کن، (۲) با استفاده از آن، UI پروژه را بهبود بده.
دقیقاً مراحل زیر را دنبال کن و در پایان خلاصه‌ی تغییرات را بده.

─── کار ۱: نصب اسکیل (دقیقاً این مراحل) ───

1. ریپوی اسکیل را بررسی کن (فقط برای برداشتن نسخه‌ی کامل):
   git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/ui-ux-pro-max-skill

2. اسکیل را با CLI رسمی نصب کن:
   npx --yes ui-ux-pro-max-cli init --ai claude
   (اگر ابزار دیگری می‌خواهم بگویم: --ai cursor | --ai windsurf | --ai gemini؛
    برای نصب سراسری روی همه‌ی پروژه‌ها: --global اضافه کن.)

3. نسخه‌ی نصب‌شده از npm قدیمی‌تر است (67 استایل) — آن را با نسخه‌ی کامل‌تر ریپوی
   گیت‌هاب (v2.14.1 = 84 استایل، 192 پالت، 74 فونت) جایگزین کن:
   rm -rf .claude/skills/ui-ux-pro-max
   cp -r /tmp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max .claude/skills/ui-ux-pro-max

4. اگر اسکیل‌های اختصاصی بازینو (bazino-verify-build, bazino-gtmetrix,
   bazino-mirror-flutter, bazino-change-domain) در .claude/skills/ وجود دارند،
   آن‌ها را برای هر پلتفرم جدید هم کپی کن.

5. تست نصب — باید نتیجه برگردد (مثلاً Pixel Art):
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "gaming" --domain style --max-results 1

─── کار ۲: بهبود UI با استفاده از اسکیل (دقیقاً این مراحل) ───

1. قوانین UX را از خود اسکیل بپرس:
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux --max-results 3
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "touch target" --domain ux --max-results 3
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "animation motion" --domain ux --max-results 2
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "cyberpunk neon gaming" --domain color --max-results 2

2. تم‌های فعلی را تحلیل کن: src/themes/*.css
   (dark-gold, cyberpunk-cyan, geco-purple, gaming-amp, console-grid) + src/index.css

3. کنتراست WCAG همه‌ی رنگ‌های تم‌ها را با اسکریپت پایتون بررسی کن:
   نسبت ≥4.5:1 برای متن عادی، ≥3:1 برای متن بزرگ.

4. این بهبودها را اعمال کن — بدون تغییر هویت بصری هیچ تم:
   • :focus-visible سراسری + حلقه‌ی فوکوس با رنگ اختصاصی هر تم (قانون Focus Visibility)
   • @media (prefers-reduced-motion: reduce) برای غیرفعال‌کردن انیمیشن‌ها (قانون Reduced Motion)
   • @media (pointer: coarse) برای حداقل هدف لمسی ۴۴×۴۴px (قانون Touch Target Size)
   • اصلاح کنتراست متن‌های کمرنگ (مثلاً gray-500 → gray-400 روی زمینه‌ی تیره)
   • اصلاح alt="" روی تصاویر معنادار (قانون Alt Text)
   • اگر لازم شد، فاصله‌ی 8px بین عناصر تعاملی (قانون Touch Spacing)

5. اگر فایل‌های مشترک تغییر کردند، به flutter_app/ هم mirror کن
   (index.css و کامپوننت‌های مشترک؛ توجه: flutter_app ساختار تم جداگانه‌ای دارد).

6. تست و بیلد:
   npm run lint
   npx tsx scripts/verify-themes.ts
   rm -rf dist && npx vite build
   cd flutter_app && npx tsc --noEmit && rm -rf dist && npx vite build

7. commit و push روی برنچ فعلی با پیام واضح.

─── معیارهای موفقیت ───
• اسکیل نصب شده و search.py جواب می‌دهد.
• همه‌ی تست‌ها و بیلدها سبز هستند (lint + verify-themes + vite build در هر دو نسخه).
• کنتراست متن‌های عادی همه‌ی تم‌ها ≥4.5:1.
• فوکوس کیبورد در همه‌ی تم‌ها دیده می‌شود.
• prefers-reduced-motion رعایت می‌شود.
• ظاهر/هویت بصری تم‌ها (رنگ‌ها، clip-path ها، فونت‌ها) عوض نشده.
• flutter_app همگام است.
• درخت git بعد از push پاک است.

─── نکات مهم ───
• به هویت بصری هر تم دست نزن مگر اینکه کنتراست/دسترس‌پذیری مشکل واقعی داشته باشد.
• RTL (فارسی) و فونت Vazirmatn حفظ شوند.
• اگر قبلاً اسکیل نصب شده، دوباره نصب نکن — فقط وضعیت را بررسی و ادامه بده.
• خارج از اسکوپ UI هیچ تغییری اعمال نکن.
```

---

## نمونهی استفاده

این پرامت را میتوانید با یک جملهی اضافهی کوتاه سفارشی کنید:

- «...و این بار روی تم Cyberpunk Cyan تمرکز کن» 
- «...برای Gemini هم نصب کن»
- «...فقط تحلیل کن، تغییر اعمال نکن»

## چرا این پرامت جواب میدهد؟

| بخش | دلیل |
|---|---|
| دستورات دقیق clone/install | دستیار دقیقاً همان مسیر رسمی را میرود، نه حدس |
| ارتقا به v2.14.1 | نسخهی npm ناقص است؛ نسخهی گیتهاب کامل (84 استایل) |
| پرسیدن قوانین از خود اسکیل | دستیار بهجای حافظه، از دیتابیس اسکیل تصمیم میگیرد |
| تحلیل کنتراست با اسکریپت | تصمیمها عددی و WCAG-مستند میشوند، نه سلیقهای |
| «بدون تغییر هویت بصری» | جلوگیری از بازطراحی خودسرانهی تمها |
| تست + mirror + commit | کار همیشه سبز و همگام میماند |
