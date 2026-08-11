# 🧠 Skills — اسکیل‌های Claude Code پروژه بازینو

این پوشه (`/.claude/skills/`) اسکیل‌های پروژه است — در **فرمت رسمی Claude
Code** (هر اسکیل یک پوشه با `SKILL.md` + frontmatter YAML و زیرپوشه‌های
`references/`, `scripts/`, `data/`).

## چطور نصب شد؟

- پکیج **UI/UX Pro Max** (v2.14.1) از
  [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
  با دستور رسمی نصب شد:
  `npx ui-ux-pro-max-cli init --ai claude` — سپس محتوای اسکیل اصلی از
  نسخه‌ی کامل‌تر ریپوی گیتهاب (84 styles) جایگزین و `.claude-plugin/`
  (پلاگین مارکت) اضافه شد.
- اسکیل‌های اختصاصی بازینو (`bazino-*`) از پوشه‌ی قبلی `skills/` به همین
  فرمت رسمی تبدیل و منتقل شدند.

## فهرست اسکیل‌ها

### از پکیج UI/UX Pro Max (طراحی عمومی)
| Skill | کاربرد |
|---|---|
| `ui-ux-pro-max` | دیتابیس طراحی: 84 استایل، 192 پالت رنگ، 74 جفت فونت، 98 قانون UX، 22 ستک (شامل Flutter/React/Tailwind) — جستجو با `python3 .claude/skills/ui-ux-pro-max/scripts/search.py` |
| `design` | طراحی لوگو، آیکون، بنر، CIP، اسلاید |
| `design-system` | تولید و اعتبارسنجی توکن‌های طراحی |
| `brand` | مدیریت برند (لوگو، رنگ، صدا، چک‌لیست تأیید) |
| `ui-styling` | شاد‌سی‌ان/تیلویند، تم، دارک‌مود، دسترس‌پذیری |
| `banner-design` | بنر در اندازه‌های مختلف |
| `slides` | اسلاید/پرزنتیشن |

### اختصاصی بازینو
| Skill | کاربرد |
|---|---|
| `bazino-verify-build` | تایپ‌چک + تست قالب + بیلد + بوت تست قبل از commit |
| `bazino-gtmetrix` | رفع مشکلات عملکرد GTmetrix (کد اسپلیتینگ، WebP، lazy، کش) |
| `bazino-mirror-flutter` | mirror تغییرات وب به `flutter_app/` |
| `bazino-change-domain` | تغییر دامنه‌ی API سرور در کل پروژه |

## استفاده

- **Claude Code:** اسکیل‌ها در `/.claude/skills/` (همین پوشه) + **سراسری** در
  `~/.claude/skills/` (همه‌ی پروژه‌ها) نصب شده‌اند.
- **Cursor:** نسخه‌ی همین اسکیل‌ها در `/.cursor/skills/` نصب شده.
- **Windsurf:** نسخه‌ی همین اسکیل‌ها در `/.windsurf/skills/` نصب شده.
- **Gemini CLI:** نسخه‌ی همین اسکیل‌ها در `/.gemini/skills/` نصب شده (با دستور
  `npx ui-ux-pro-max-cli init --ai gemini`).
- بعد از هر نصب، ابزار را Restart کنید.
- **انسان‌ها:** هر `SKILL.md` را مستقیم بخوانید و مراحلش را دنبال کنید.

## پلتفرم‌های دیگر

این پکیج برای ۱۹ پلتفرم پشتیبانی دارد (Copilot, Codex, Gemini, RooCode,
Continue, Trae و...). اگر ابزار دیگری استفاده می‌کنید، در ریشه‌ی پروژه:
`npx ui-ux-pro-max-cli init --ai <platform>` (مثلاً `--ai gemini`).
برای نصب سراسری: `--global` اضافه کنید.

## نکته‌ها

- اسکریپت‌های پایتون اسکیل‌ها به `python3` نیاز دارند (روی سرور CI موجود است).
- اگر نسخه‌ی جدیدی از پکیج UI/UX Pro Max منتشر شد: در ریشه‌ی پروژه
  `npx ui-ux-pro-max-cli update --ai claude` را اجرا کنید.
- این پوشه در ریپو commit شده تا همه‌ی توسعه‌دهنده‌ها تجربه‌ی یکسان داشته باشند.
