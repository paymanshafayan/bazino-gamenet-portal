# پلن رفع — نسخه‌ی دسکتاپ نرم‌افزار مدیریت

**وضعیت:** پیش‌نویس — منتظر «شروع کن». **هیچ کد محصولی هنوز تغییر نکرده است.**
تصاویر: `visual-testing/desktop-2026-09-02/`

---

## ۰. چطور بدون Electron تست شد (قانون ۲)

**پله‌ی ۱:** `npm i electron@33` → باینری از GitHub Releases می‌آید و
`objects.githubusercontent.com` بسته است. نصب شکست خورد.

**پله‌ی ۲:** بررسی شد که پروسه‌ی main الکترون دقیقاً چه می‌کند. `desktop-app/main.js` هیچ
منطق ویژه‌ای ندارد جز:

```js
process.chdir(app.getPath('userData'));
process.env.BAZINO_STATIC_ROOT = <bundle root>;
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = <از .jwt-secret یا تولید تصادفی>;
require('<bundle>/dist/server.cjs');          // همان بک‌اند سایت، درون‌پردازه
new BrowserWindow({width:1440, height:900}).loadURL('http://localhost:PORT/management-app');
```

چون Electron یک Node.js کامل + یک Chromium است و **هر دو را جداگانه داریم**، همین مسیر با
`desktop-app/scripts/run-headless-desktop.cjs` بازسازی شد و UI با Chromium در همان ابعاد
پنجره (۱۴۴۰×۹۰۰) عکس‌برداری شد. آنچه تست نشد فقط پوسته‌ی الکترون است (نوار عنوان، منو،
`dialog.showErrorBox`، `shell.openExternal`).

**پله‌ی ۳ لازم نشد** — نیازی به آپلود چیزی از طرف شما نبود.

---

## ۱. 🔴 نسخه‌ی دسکتاپ اصلاً بالا نمی‌آید

اولین اجرای واقعی این مسیر، بلافاصله مرد:

```
── شبیه‌سازی پروسه‌ی main الکترون ──
  cwd (userData)     : /home/user/.bazino-desktop-sim
  BAZINO_STATIC_ROOT : .../desktop-app/server-bundle
  NODE_ENV           : production
──────────────────────────────────
Critical server bootstrap error: Error: Cannot find module 'better-sqlite3'
Require stack:
- /home/user/.bazino-desktop-sim/server/dataProviders.ts
    at SqliteStore.connect (.../server-bundle/dist/server.cjs:181:22)
```

### ریشه

`server/dataProviders.ts:12`:

```ts
const require = createRequire(
  (typeof import.meta !== 'undefined' && import.meta.url)
    ? import.meta.url
    : path.join(process.cwd(), 'server', 'dataProviders.ts')   // ← fallback
);
```

در باندل CJS، esbuild `import_meta` را به `{}` تبدیل می‌کند، پس همیشه شاخه‌ی دوم اجرا می‌شود و
مسیر پایه‌ی حل‌کردن ماژول‌ها **از `process.cwd()`** ساخته می‌شود.

* **حالت co-located:** cwd = ریشه‌ی پروژه → `<root>/node_modules` پیدا می‌شود. **تصادفاً کار می‌کند.**
* **حالت دسکتاپ:** `main.js` عمداً و به‌درستی cwd را به پوشه‌ی داده‌ی کاربر می‌برد (تا دیتابیس از
  به‌روزرسانی‌ها جان سالم به‌در ببرد). حالا Node دنبال `<userData>/node_modules` می‌گردد که
  وجود ندارد → **اپ روی هر دستگاه واقعی می‌میرد.**

### تغییر پیشنهادی

در باندل CJS، `__filename` **در دسترس است** (خلاف چیزی که کامنت فعلی می‌گوید). ترتیب درست:

```ts
const require = createRequire(
  (typeof import.meta !== 'undefined' && (import.meta as any).url)
    ? (import.meta as any).url
    : (typeof __filename !== 'undefined')
      ? __filename                                   // ← باندل CJS: کنار همان node_modules
      : path.join(process.cwd(), 'server', 'dataProviders.ts')
);
```

`__filename` به `<bundle>/dist/server.cjs` اشاره می‌کند و Node از آنجا به بالا
`<bundle>/node_modules` را پیدا می‌کند — مستقل از اینکه cwd کجاست.

> باید با `typeof __filename !== 'undefined'` محافظت شود تا خروجی ESM نشکند.

---

## ۲. 🟡 ساخت باندل بدون اینترنت ممکن نیست

`prepare-server-bundle.js:71` داخل پوشه‌ی bundle `npm install --omit=dev` می‌زند، که برای
`better-sqlite3` کامپایل native و دسترسی به `nodejs.org` می‌خواهد:

```
gyp http GET https://nodejs.org/download/release/v22.22.3/node-v22.22.3-headers.tar.gz
attempt 1 failed with ECONNRESET
❌ npm install در پوشه‌ی bundle شکست خورد.
```

در حالی که ریشه‌ی پروژه از قبل `node_modules` کامل و کامپایل‌شده دارد.

**تغییر پیشنهادی:** اگر `<root>/node_modules` موجود بود، همان کپی شود و `npm install` فقط
به‌عنوان fallback اجرا شود. اگر کامپایل لازم شد، از الگوی اثبات‌شده‌ی این پروژه استفاده شود:
`npx node-gyp rebuild --release --nodedir=/usr/local` (هدرهای Node از قبل روی ایمیج هستند).

---

## ۳. 🟡 آدرس LAN در هدر هاردکد است

`Management App/Bazino/src/components/Header.tsx:69`:

```tsx
آفلاین LAN: 192.168.1.100:3000
```

عددی ثابت که هیچ ربطی به آدرس و پورت واقعی سرور ندارد. در تست، سرور دسکتاپ روی `3100` بود و
هدر همچنان `3000` نشان می‌داد. برای اپراتوری که می‌خواهد از دستگاه دیگری به سرور وصل شود، این
عدد گمراه‌کننده است.

**تغییر پیشنهادی:** آدرس واقعی از `window.location.host` خوانده شود، و اگر سرور IP شبکه‌ی محلی را
می‌داند، از یک endpoint سبک گرفته شود؛ در غیر این صورت همان host فعلی نمایش داده شود.

---

## ۴. آنچه سالم بود (با شواهد)

| مورد | نتیجه |
|---|---|
| سرور درون‌پردازه با دیتابیس مستقل | ✅ `bazino.sqlite3` + WAL در پوشه‌ی داده ساخته شد |
| تولید و ماندگاری `JWT_SECRET` | ✅ فایل `.jwt-secret` با مجوز `600` و ۶۴ کاراکتر |
| سرو شدن UI از باندل | ✅ `GET /management-app` → ۲۰۰ روی پورت دسکتاپ |
| استقلال از سرور سایت | ✅ دو نمونه هم‌زمان روی ۳۰۰۰ و ۳۱۰۰ بدون تداخل |
| رندر در ابعاد واقعی پنجره (۱۴۴۰×۹۰۰) | ✅ بدون overflow افقی |
| خطاهای console | ✅ **صفر** |
| درخواست‌های ناموفق شبکه | ✅ **صفر** (بیلد production دیگر فونت گوگل ندارد) |
| هر ۶ زبانه + مودال «همگام وب» (۵ تب) | ✅ درست رندر شدند |
| تشخیص حالت co-located | ✅ «همین سرور (حالت محلی/co-located)» |

---

## ۵. معیار پذیرش

1. `run-headless-desktop.cjs` **بدون هیچ symlink یا دستکاری** بالا بیاید.
2. `prepare-server-bundle.js` بدون اینترنت کامل شود.
3. هدر، host و پورت واقعی را نشان دهد.
4. سایت co-located بدون رگرسیون: `npm test` سبز و بوت عادی سالم.
5. عکس‌برداری دوباره در ۱۴۴۰×۹۰۰ با صفر خطای console.

---

## ۶. همچنان تست‌نشده

پوسته‌ی خودِ Electron: نوار عنوان، `autoHideMenuBar`، `dialog.showErrorBox` وقتی باندل نیست،
`setWindowOpenHandler` برای لینک‌های خارجی، و ساخت نصب‌کننده با `electron-builder`.
این‌ها فقط روی ماشینی با Electron قابل آزمودن‌اند.
