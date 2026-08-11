# CI Workflow (راه‌اندازی دستی)

فایل `build-test.workflow.yml` ورک‌فلو تست و بیلد بک‌اند + فرانت‌اند است:

- تایپ‌چک (tsc) + تست‌های موتور قالب/ذخیره‌ساز قالب
- بیلد فرانت‌اند (Vite) + بررسی خروجی dist/
- بیلد بک‌اند (esbuild → dist/server.cjs) + بوت production + تست API

## چرا دستی؟

اکانت GitHub (GitHub App) که این مخزن را push می‌کند، **permission
«workflows» ندارد** — بنابراین GitHub از push هر فایلی داخل `.github/workflows/`
جلوگیری می‌کند (خطای `refusing to allow a GitHub App to create or update
workflow ... without workflows permission`). فایل ورک‌فلو آماده است ولی باید
یک‌بار به‌صورت دستی فعال شود.

## فعال‌سازی (یک بار)

```bash
cp ci/build-test.workflow.yml .github/workflows/build-test.yml
git add .github/workflows/build-test.yml
git commit -m "ci: enable backend & frontend build+test workflow"
git push origin main
```

بعد از این push، ورک‌فلو روی هر push/PR به `main` اجرا می‌شود.
