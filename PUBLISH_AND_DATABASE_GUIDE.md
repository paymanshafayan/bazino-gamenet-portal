# راهنمای پابلیش سایت و تنظیمات پایگاه داده — BAZINO PRO

این راهنما مخصوص **سایت اصلی** (React + بک‌اند واقعی Node.js/Express، به‌همراه **Management App** که داخل همون بک‌اند سرو می‌شه) است — یعنی همون چیزی که با `npm run build && npm start` از ریشه‌ی پروژه اجرا می‌شه.

> برای انتشار **اپلیکیشن موبایل فلاتر** در گوگل‌پلی/اپ‌استور، به `PUBLISHING_GUIDE.md` و `CLOUD_BUILD_GUIDE.md` مراجعه کنید — این‌ها موضوع جدایی هستن و این فایل تکرارشون نمی‌کنه.

---

## ۱. معماری خلاصه (قبل از هر کاری این رو بدونید)

فقط **یک** برنامه‌ی Node.js واقعاً اجرا می‌شه (`server.ts` → build شده به `dist/server.cjs`) که همزمان:
- API بک‌اند رو روی `/api/*` سرو می‌کنه،
- فایل‌های build شده‌ی **سایت اصلی** (React، از پوشه‌ی `dist/`) رو روی مسیر ریشه (`/`) سرو می‌کنه،
- فایل‌های build شده‌ی **Management App** (از `Management App/Bazino/dist/`) رو روی مسیر `/management-app` سرو می‌کنه،
- روی پورت مشخص‌شده با `0.0.0.0` گوش می‌ده (یعنی از بیرون هم در دسترسه، نه فقط localhost).

پس برای پابلیش، فقط کافیه این یک برنامه رو روی یک سرور (VPS، یا هر پلتفرم هاستینگ Node.js) بالا بیارید؛ نیازی به دو تا سرور جدا برای فرانت‌اند و بک‌اند نیست.

---

## ۲. متغیرهای محیطی (Environment Variables)

یک فایل `.env` در **ریشه‌ی پروژه** بسازید (از روی `.env.example` کپی کنید) و مقادیر واقعی رو جایگزین کنید. `dotenv` قبلاً به‌عنوان dependency نصب بود ولی هیچ‌جا واقعاً import نمی‌شد — این نشست به `server.ts` اضافه شد (`import "dotenv/config"` در همون خط اول)، پس از این به بعد فایل `.env` واقعاً خونده می‌شه.

| متغیر | الزامی؟ | توضیح | مقدار پیش‌فرض اگه ست نشه |
|---|---|---|---|
| `JWT_SECRET` | **بله، حتماً قبل از پروداکشن** | برای امضای توکن‌های ورود (سایت + اپ Flutter). یک رشته‌ی تصادفی طولانی بسازید، مثلاً: `openssl rand -hex 32` | یک مقدار **ناامن** ثابت در کد (`bazino-dev-insecure-secret-change-me`) — اگه عوضش نکنید، هرکسی می‌تونه توکن جعل کنه! |
| `PORT` | نه | پورتی که سرور روش گوش می‌ده (فقط وقتی `NODE_ENV=production` باشه اعمال می‌شه) | `3000` |
| `NODE_ENV` | توصیه‌شده | باید `production` باشه در سرور واقعی (فایل‌های build شده‌ی static رو سرو می‌کنه، نه dev server ویت) | خالی (حالت dev) |
| `GEMINI_API_KEY` | نه (اختیاری) | برای فعال شدن دستیار هوشمند Jarvis با هوش مصنوعی واقعی Gemini و ترجمه‌ی خودکار (`/api/admin/translate`). بدونش، این فیچرها به یک fallback مبتنی بر کلمه‌کلیدی برمی‌گردن، بقیه‌ی سایت عادی کار می‌کنه. | — |

نمونه‌ی `.env`:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=یک-رشته-تصادفی-خیلی-طولانی-اینجا-بذارید
GEMINI_API_KEY=AIza...   # اختیاری
```

⚠️ **هرگز فایل `.env` رو commit نکنید** — از قبل در `.gitignore` هست (`.env*`).

---

## ۳. مراحل Build و اجرا (روی سرور واقعی)

```bash
# ۱. نصب پکیج‌های ریشه‌ی پروژه
npm install

# ۲. build کامل (سایت اصلی + Management App + باندل نهایی سرور)
#    این یک دستور، هر سه بخش رو خودش می‌سازه (از جمله cd کردن به
#    Management App/Bazino و npm install/build کردنش)
npm run build

# ۳. اجرا (پروداکشن واقعی)
NODE_ENV=production npm start
```

بعد از این، کل سایت (سایت اصلی + `/management-app`) روی `http://آدرس‌سرور:PORT` در دسترسه.

### تست سریع محلی قبل از پابلیش
```bash
npm run dev
```
این حالت dev (با Vite HMR) رو بالا میاره، مناسب برای تست قبل از build نهایی — ولی خودِ dev server نباید در پروداکشن واقعی استفاده بشه، حتماً از `npm run build && npm start` استفاده کنید.

---

## ۴. تنظیمات پایگاه داده (Database)

پروژه از **سه نوع دیتابیس** پشتیبانی می‌کنه و انتخاب بین اون‌ها کاملاً runtime هست (نیازی به تغییر کد نیست):

| نوع | برای چه حالتی مناسبه | نیاز به سرور جدا؟ |
|---|---|---|
| **SQLite** (پیش‌فرض) | راه‌اندازی سریع، تک‌سروری، بدون نیاز به دیتابیس جدا | نه — یک فایل محلی |
| **SQL Server** | اگه از قبل SQL Server دارید یا سازمانی کار می‌کنید | بله |
| **MongoDB** | اگه ترجیح NoSQL دارید یا از MongoDB Atlas استفاده می‌کنید | بله (یا سرویس ابری) |

### روش اول (ساده‌ترین): استفاده از SQLite — کاری لازم نیست بکنید
اگه هیچ کاری نکنید، سرور خودش با **SQLite** بالا میاد و یک فایل `bazino.sqlite3` در ریشه‌ی پروژه می‌سازه. برای شروع سریع یا یک گیم‌نت کوچیک، این کاملاً کافیه.

⚠️ فقط مطمئن شید فولدری که سرور توش اجرا می‌شه (`process.cwd()`) قابل‌نوشتنه، و این فایل رو **بک‌آپ منظم** بگیرید (مورد ۲۳ چک‌لیست پروژه — بک‌آپ خودکار Management App جداست و این فایل SQLite رو پوشش نمی‌ده).

### روش دوم: از طریق ویزارد نصب داخل خود سایت (توصیه‌شده برای SQL Server/MongoDB)
سایت یک صفحه‌ی نصب اولیه داره (endpoint های `GET /api/install/status` و `POST /api/install/setup`) که وقتی برای اولین بار بالا میاد، از شما نوع دیتابیس + اطلاعات اتصال + حساب مدیر کل رو می‌گیره و خودش:
1. به دیتابیس وصل می‌شه،
2. اگه دیتابیس وجود نداشت، می‌سازتش،
3. جدول‌ها/کالکشن‌ها رو می‌سازه،
4. یک فایل `install-config.json` در ریشه‌ی پروژه ذخیره می‌کنه (این فایل تنظیمات رو برای اجراهای بعدی نگه می‌داره).

⚠️ `install-config.json` هم مثل `.env`، از قبل توی `.gitignore` هست — چون شامل رمز عبور دیتابیسه، **هرگز commit نکنید**.

### روش سوم: ساخت دستی `install-config.json`
اگه می‌خواید بدون رفتن به صفحه‌ی نصب، مستقیم فایل رو بسازید، این فرمت رو در ریشه‌ی پروژه قرار بدید:

**برای SQL Server:**
```json
{
  "isInstalled": true,
  "dbType": "sqlserver",
  "dbConfig": {
    "host": "آدرس-سرور-یا-IP",
    "port": 1433,
    "dbName": "BazinoDb",
    "username": "sa",
    "password": "رمز-عبور-واقعی",
    "encrypt": true,
    "trustServerCertificate": true
  }
}
```

**برای MongoDB:**
```json
{
  "isInstalled": true,
  "dbType": "mongodb",
  "dbConfig": {
    "host": "آدرس-سرور-یا-IP",
    "port": 27017,
    "dbName": "bazino",
    "username": "کاربر-دیتابیس",
    "password": "رمز-عبور-واقعی"
  }
}
```
یا به‌جای `dbConfig`، می‌تونید مستقیم یک `connectionString` بدید (مثلاً برای MongoDB Atlas):
```json
{
  "isInstalled": true,
  "dbType": "mongodb",
  "connectionString": "mongodb+srv://user:pass@cluster.mongodb.net/bazino"
}
```

**برای SQLite (صریح، اختیاری):**
```json
{ "isInstalled": true, "dbType": "sqlite" }
```
(این عملاً همون پیش‌فرضه؛ نیازی به این فایل برای SQLite ندارید مگه بخواید مسیر فایل رو صریح مشخص کنید.)

### جابه‌جایی بین دیتابیس‌ها بعداً
فقط کافیه `install-config.json` رو با تنظیمات جدید عوض کنید (یا از صفحه‌ی نصب دوباره استفاده کنید) و سرور رو ری‌استارت کنید — کد جدول‌ها رو خودش در دیتابیس جدید می‌سازه. **توجه: این کار داده‌های دیتابیس قبلی رو منتقل نمی‌کنه** — اگه نیاز به migration دارید، باید جدا export/import کنید.

---

## ۵. قرار گرفتن پشت دامنه‌ی واقعی + HTTPS (Reverse Proxy)

سرور مستقیماً HTTP ساده روی `0.0.0.0:PORT` گوش می‌ده، بدون HTTPS داخلی. برای یک دامنه‌ی واقعی با گواهی SSL، از یک reverse proxy جلوش استفاده کنید (رایج‌ترین روش):

**نمونه‌ی تنظیمات Nginx** (با دامنه‌ی واقعی پروژه، `xerxes.biz`، به‌عنوان مثال):
```nginx
server {
    listen 80;
    server_name xerxes.biz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # برای WebSocket چت زنده (/api/chat/ws)
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
بعد با [Certbot](https://certbot.eff.org) گواهی SSL رایگان بگیرید (`certbot --nginx -d xerxes.biz`).

⚠️ خط‌های `Upgrade`/`Connection` رو حتماً بذارید — بدونشون چت زنده (WebSocket) از کار می‌افته.

---

## ۶. نگه‌داشتن سرور روشن (Process Manager)

اجرای مستقیم `npm start` با بسته شدن ترمینال متوقف می‌شه. برای پروداکشن واقعی از [PM2](https://pm2.keymetrics.io) استفاده کنید:

```bash
npm install -g pm2
NODE_ENV=production pm2 start dist/server.cjs --name bazino-pro
pm2 save
pm2 startup   # سرور رو طوری تنظیم می‌کنه که بعد از ری‌استارت سیستم هم خودکار بالا بیاد
```

مشاهده‌ی لاگ‌ها: `pm2 logs bazino-pro` — ری‌استارت بعد از تغییر کد: `npm run build && pm2 restart bazino-pro`.

---

## ۷. چک‌لیست امنیتی قبل از رفتن به پروداکشن واقعی

- [ ] `JWT_SECRET` واقعی و تصادفی در `.env` ست شده (نه مقدار پیش‌فرض ناامن کد).
- [ ] `NODE_ENV=production` ست شده.
- [ ] `.env` و `install-config.json` و `bazino.sqlite3` هیچ‌کدوم commit نشدن (چک `.gitignore`).
- [ ] دامنه پشت HTTPS واقعی هست (نه HTTP ساده).
- [ ] بک‌آپ منظم از دیتابیس واقعی (SQL Server/MongoDB) یا فایل `bazino.sqlite3` گرفته می‌شه.
- [ ] رمزهای عبور دیتابیس در `install-config.json` قوی و واقعی هستن، نه نمونه.
- [ ] بعد از `npm install`، پکیج‌های جدید `postcss` و `@csstools/postcss-oklab-function` هم نصب شدن (برای رفع باگ رنگ oklch روی Safari قدیمی — به `HANDOFF_CONTINUE_HERE.md` بخش ۴.۱/۴.۲ مراجعه کنید).

---

## ۸. مشکلات رایج (Troubleshooting)

| علامت | علت احتمالی | راه‌حل |
|---|---|---|
| صفحه‌ی کاملاً خالی روی مرورگر/موبایل قدیمی | باگ شناخته‌شده‌ی `build.target` — قبلاً در همین نشست رفع شد | مطمئن شید از build جدید استفاده می‌کنید (`vite.config.ts` باید `target: 'es2018'` داشته باشه) |
| رنگ‌ها روی Safari/iOS قدیمی‌تر از ۱۶.۴ درست نیستن | Tailwind v4 پیش‌فرض `oklch()` تولید می‌کنه | مطمئن شید `postcss.config.js` وجود داره و `npm install` بعد از این تغییر اجرا شده |
| اتصال به SQL Server/MongoDB برقرار نمی‌شه | فایروال، یا اطلاعات اتصال اشتباه در `install-config.json` | با یک ابزار جدا (مثل `mssql`/`mongosh`) اول خودِ اتصال رو مستقل از سایت تست کنید |
| چت زنده/WebSocket کار نمی‌کنه پشت دامنه | تنظیمات reverse proxy ناقصه | مطمئن شید هدرهای `Upgrade`/`Connection` در Nginx ست شدن (بخش ۵) |
| بعد از ری‌استارت سرور، دیتابیس SQLite خالی شده | `bazino.sqlite3` روی یک دیسک/فولدر غیرپایدار (مثل بعضی پلتفرم‌های سرورلس که فایل‌سیستم رو ری‌ست می‌کنن) ذخیره شده | یا از SQL Server/MongoDB خارجی استفاده کنید، یا مطمئن شید هاست شما یک volume دائمی برای فایل SQLite می‌ده |

---

*این راهنما بر اساس بررسی مستقیم کد واقعی پروژه (`server.ts`, `server/dataProviders.ts`, `package.json`) نوشته شده، نه حدس. با این‌حال، چون در محیط sandbox این نشست شبکه/دیتابیس واقعی در دسترس نبود، هیچ‌کدوم از این مراحل روی یک سرور واقعی تست نشدن — قبل از اتکای کامل، یک‌بار کامل روی یک سرور تست/staging امتحان کنید.*
