# MongoDB روی Railway — ران‌بوک رپلیکا-ست تک‌گره‌ای

**چرا رپلیکا-ست؟** تراکنش‌های چندسندی (`TRANSACTIONS_REQUIRED`) و change streamها بدون رپلیکا-ست کار نمی‌کنند. یک گره کافی است (`rs0`)؛ هدف HA نیست.

> **درس ۲۰۲۶-۰۹-۰۹ (حادثه واقعی):** ایمیج رسمی `mongo` وقتی `MONGO_INITDB_ROOT_USERNAME/PASSWORD` ست باشند، خودش `--auth` را به mongod اضافه می‌کند (سورس: `docker-entrypoint.sh` ایمیج 8.0، تابع `_mongod_hack_ensure_arg '--auth'`). و قانون mongod: **authorization + replica set بدون `--keyFile` = خطای `BadValue: security.keyFile is required...` و crash-loop** که دیپلوی را ساعت‌ها در `DEPLOYING` نگه می‌دارد و صف را قفل می‌کند. پس keyFile اجباری است، حتی برای تک‌گره.

## پیش‌نیازها

- سرویس Mongo از ایمیج `mongo:8.0` (قالب Railway) با Volume روی `/data/db`.
- متغیرهای `MONGO_INITDB_ROOT_USERNAME` و `MONGO_INITDB_ROOT_PASSWORD` ست باشند (قالب Railway خودش می‌سازد).

## قدم ۱ — ساخت محتوای keyFile (لوکال، یک‌بار)

```sh
openssl rand -base64 512
```

روی ویندوز (PowerShell، بدون نیاز به openssl — مستقیم می‌رود در clipboard):

```powershell
$b = New-Object byte[] 512; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b) | Set-Clipboard
```

خروجی (~۶۸۰ کاراکتر تک‌خطی، بدون فاصله/newline) را کپی کن. این **secret** است؛ در چت/CI نگذار.

## قدم ۲ — متغیر Railway

در سرویس Mongo → تب **Variables** اضافه کن:

```
MONGO_KEYFILE=<خروجی قدم ۱>
```

## قدم ۳ — Start Command (نسخهٔ v2 — آرگومان‌های شبکهٔ قالب حفظ شده)

> **چرا v2؟ (حادثهٔ ۲۰۲۶-۰۹-۰۹):** دستور v1 فقط `mongod --replSet rs0 --keyFile …` را اجرا می‌کرد، ولی دستور پیش‌فرض قالب Railway یعنی `mongod --ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false` را دور می‌انداخت. شبکهٔ داخلی Railway IPv6 است؛ بدون `--ipv6` نه پورتال می‌تواند وصل شود نه گره به PRIMARY می‌رسد. v2 هر دو را ترکیب می‌کند. (از `getCmdLineOpts` کانتینر سبز اثبات شد که دستور در حال اجرا مال قالب بود، نه ما.)

در سرویس Mongo → تب **Settings** → **Start Command** (جایگزین کامل دستور فعلی):

```sh
sh -c 'printf "%s" "$MONGO_KEYFILE" > /tmp/mongo-keyfile && chmod 600 /tmp/mongo-keyfile && chown mongodb:mongodb /tmp/mongo-keyfile && echo "TG-START wrapper ok, keyfile bytes: $(wc -c < /tmp/mongo-keyfile)"; exec /usr/local/bin/docker-entrypoint.sh mongod --replSet rs0 --keyFile /tmp/mongo-keyfile --ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false'
```

> ⚠️ **کپی تمیز، مهم:** حتماً با دکمهٔ copy بالای بلاک کد کپی کن و کل فیلد Railway را select-all + delete کن بعد paste. اگر از متن رندرشده (چت/مرورگر) کپی کنی ممکن است خراب شود: `&gt;` به‌جای `>`، `&amp;&amp;` به‌جای `&&`، یا لینک‌شدن `docker-entrypoint.sh`. بعد از paste چک کن هیچ‌کدام از این‌ها نباشند: `&gt;` `&amp;` `[` `]` `(http`. (حادثهٔ واقعی ۲۰۲۶-۰۹-۰۹: همین خرابی کپی باعث ماندن `BadValue` شد.)

چرا این شکلی است:

| جزء | دلیل |
|---|---|
| `sh -c '…'` | فایل کلید باید **قبل** از بالا آمدن mongod از روی env ساخته شود |
| `/tmp/mongo-keyfile` | ephemeral؛ هر بوت از نو ساخته می‌شود، پس تنها منبع حقیقت همان Variable است |
| `chmod 600` | mongod فایل با دسترسی بازتر را رد می‌کند (`permissions too open`) |
| `chown mongodb:mongodb` | entrypoint با gosu به کاربر `mongodb` دانگرید می‌کند؛ فایل باید برایش خوانا باشد |
| صدا زدن صریح `docker-entrypoint.sh` | خودش `--auth` (چون root vars ست‌اند) و `--bind_ip_all` را اضافه می‌کند — **پس ما `--auth` نمی‌نویسیم** (آرگومان تکراری برای mongod خطاست) |
| `--replSet rs0` | نام ست؛ قدم ۵ باید همین باشد |
| `--ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false` | **حفظ عین آرگومان‌های شبکهٔ قالب Railway** — حذفشان = قطع اتصال داخلی (IPv6) و نرسیدن به PRIMARY |
| `echo "TG-START …"` | خودتشخیصی دائمی: فقط **طول** فایل کلید را چاپ می‌کند (نه secret). اگر این خط در لاگ دیپلوی نباشد یعنی wrapper اصلاً اجرا نشده |

## قدم ۴ — دیپلوی مجدد

- اگر دیپلوی قبلی در `DEPLOYING` گیر کرده: منوی **⋮** همان دیپلوی → **Remove** (قفل صف را باز می‌کند).
- ذخیره Start Command خودش دیپلوی جدید می‌سازد؛ اگر نه: **⋮** → Redeploy.
- در **Deploy Logs** باید ببینی: بالا آمدن تمیز، `Waiting for connections`، و **بدون** خطای `BadValue`. (قبل از `rs.initiate` گره در حالت STARTUP می‌ماند — طبیعی است.)

## قدم ۵ — `rs.initiate` (تب Console سرویس Mongo)

⚠️ **فقط وقتی این قدم را اجرا کن که دیپلوی سبز و لاگ بدون `BadValue` باشد** (قدم ۴). اجرای زودهنگام خطای `This node was not started with replication enabled` می‌دهد چون کانتینرِ در حال اجرا هنوز با start command قدیمی بالاست.

هاست داخلی را از مقدار `MONGO_URL` بخوان — **فقط قسمت `host:port`** (بعد از `@`)، نه کل URL:

```
MONGO_URL = mongodb://mongo:PASSWORD@mongodb.railway.internal:27017
                                        ╰─────────┬─────────╯
                                              همین تکه
```

به‌جای `INTERNAL_HOST` بگذار:

```sh
mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin --host 127.0.0.1 \
  --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "INTERNAL_HOST:27017" }] })'
```

راستی‌آزمایی (همان Console):

```sh
mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin --host 127.0.0.1 \
  --eval 'printjson({ myState: rs.status().myState, setName: rs.conf()._id })'
```

✅ موفق = `{ myState: 1, setName: "rs0" }` (یعنی PRIMARY). بعد از این، تست تراکنش استودیو + `webhook.test` را اجرا کن.

## قدم ۶ — راستی‌آزمایی آرگومان‌های mongod (اختیاری ولی مفید)

اگر خواستی مطمئن شوی کانتینرِ در حال اجرا واقعاً با `--replSet` و `--keyFile` بالاست (نه start command قدیمی):

```sh
mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin --host 127.0.0.1 \
  --eval 'JSON.stringify(db.adminCommand("getCmdLineOpts").argv)'
```

باید `--replSet`, `rs0`, `--keyFile`, `/tmp/mongo-keyfile` را در خروجی ببینی. اگر نبود → قدم ۳ ذخیره/اعمال نشده؛ برگرد به عیب‌یابی.
> ⚠️ **سبز بودن سرویس ≠ اجرای دستور جدید:** اگر دیپلوی جدید کرش کند، Railway دیپلوی سالم قبلی را زنده نگه می‌دارد و سرویس «سبز» می‌ماند. پس بعد از هر تغییر، حتماً (۱) لاگ **دیپلوی جدید** را از خط اول بخوان (باید خط `TG-START` را داشته باشد)، (۲) با همین دستور `getCmdLineOpts` چک کن کانتینرِ فعلی واقعاً با `--replSet` بالاست. اگر argv دستور قالب (`--ipv6 …` بدون `--replSet`) را نشان داد یعنی هنوز روی دیپلوی قدیمی هستی و دیپلوی جدید کرش کرده — لاگ کامل دیپلوی جدید را از خط اول بررسی کن.

## عیب‌یابی سریع

| علامت | علت | درمان |
|---|---|---|
| `BadValue: security.keyFile is required…` + ری‌استارت مکرر | قدم ۲/۳ انجام نشده یا Start Command قدیمی است | قدم ۲ و ۳ را بازبینی کن؛ دیپلوی گیرکرده را Remove کن |
| `permissions on keyfile are too open` | `chmod 600` جا افتاده | Start Command را عیناً از قدم ۳ کپی کن |
| `keyFile must not be empty` / `too short` | `MONGO_KEYFILE` خالی یا چندخطی شده | Variable را تک‌خطی و کامل paste کن |
| دیپلوی جدید در `QUEUED` می‌ماند | دیپلوی قبلی هنوز «فعال» است | Remove دیپلوی گیرکرده (قدم ۴) |
| `MongoServerError: ... not primary` در اپ | قدم ۵ انجام نشده | `rs.initiate` + راستی‌آزمایی |
| `This node was not started with replication enabled` | `rs.initiate` زود اجرا شده؛ کانتینر فعلی بدون `--replSet` بالاست | اول قدم ۴ را سبز کن (Start Command جدید + Redeploy)، بعد قدم ۵ |
| `host` اشتباه در `rs.initiate` (کل MONGO_URL) | باید فقط `host:port` باشد | مثلاً `mongodb.railway.internal:27017` بدون `mongodb://` و یوزر/پسورد |
| `init process complete` در **هر** دیپلوی تکرار می‌شود | احتمالاً Volume روی `/data/db` وصل نیست → دیتا و کانفیگ RS با هر ری‌استارت می‌پرد | Settings → Volumes: یک Volume به `/data/db` وصل کن و Redeploy |
| دیپلوی جدید هم همان `BadValue` را می‌دهد | Start Command جدید ذخیره/اعمال نشده (متن Settings را عیناً با قدم ۳ مقایسه کن) | اصلاح + Redeploy؛ مطمئن شو روی **همان سرویس Mongo** تغییر دادی |
| paste دستور جدید «فرقی ندارد» و تیک save روشن نمی‌شود | یعنی فیلد **از قبل** عین همین متن را دارد — چیز خرابی نیست | فقط **Redeploy** بزن تا دیپلوی تازه با همین کانفیگ بوت شود |
| دیپلوی سبز است ولی لاگ هنوز `BadValue` قدیمی را نشان می‌دهد | خط‌های مانده از دیپلوی قبلی (لاگ کهنه) | به ID دیپلوی + timestamp خط‌ها دقت کن؛ ملاک بج سبز + قدم ۶ (`getCmdLineOpts`) است |
| در چت `&gt;` و `&amp;` و لینک `http://docker-entrypoint.sh` دیده می‌شود | آرتیفکت نمایشی چت است (escape شدن `>` و `&` + autolink پسوند `.sh`)؛ متن واقعی کپی‌شده تمیز است | نادیده بگیر؛ ملاک فقط متن داخل فیلد Railway است |

## قدم ۷ — عیب‌یابی تشخیصی: وقتی با کانفیگ صحیح هم `BadValue` می‌ماند

اگر Start Command عین قدم ۳، `MONGO_KEYFILE` ست، و Volume وصل است ولی دیپلوی تازه هم `BadValue` می‌دهد، یعنی یکی از این سه حالت است و باید تفکیک شود:

1. start command اصلاً اجرا نمی‌شود (دیپلوی با snapshot قدیمی/سرویس اشتباه بوت می‌شود)،
2. اجرا می‌شود ولی `MONGO_KEYFILE` در runtime خالی است (typo در نام variable یا مقدار خالی)،
3. اجرا می‌شود و کلید هم هست ولی خطا می‌ماند (پارادوکس → اسکالیشن به پشتیبانی Railway).

**تست تفکیک (موقت):** Start Command را با این نسخهٔ تشخیصی جایگزین کن (فقط **طول** کلید را چاپ می‌کند، نه خود secret):

```sh
sh -c 'echo "TG-DIAG wrapper running, MONGO_KEYFILE bytes: $(printf "%s" "$MONGO_KEYFILE" | wc -c)"; printf "%s" "$MONGO_KEYFILE" > /tmp/mongo-keyfile && chmod 600 /tmp/mongo-keyfile && chown mongodb:mongodb /tmp/mongo-keyfile; echo "TG-DIAG keyfile bytes: $(wc -c < /tmp/mongo-keyfile)"; exec /usr/local/bin/docker-entrypoint.sh mongod --replSet rs0 --keyFile /tmp/mongo-keyfile'
```

بعد برای اینکه Railway حتماً یک دیپلوی **کاملاً تازه** با snapshot فعلی تنظیمات بسازد (نه restart دیپلوی قبلی)، در Variables یک متغیر اضافه کن:

```
REDEPLOY_TRIGGER=1
```

(مقدارش مهم نیست؛ عوض شدن Variables دیپلوی جدید می‌سازد. بعداً می‌توانی پاکش کنی.)

**خوانش لاگ دیپلوی جدید:**

| آنچه در لاگ می‌بینی | نتیجه |
|---|---|
| هیچ خط `TG-DIAG` نیست | حالت ۱: start command اجرا نمی‌شود → پرامپ اسکالیشن (قدم ۸) |
| `MONGO_KEYFILE bytes: 0` | حالت ۲: variable خالی/اشتباه است → املای نام و مقدار را اصلاح کن، بعد به قدم ۳ برگرد |
| `bytes: ~684` ولی باز `BadValue` | حالت ۳: پارادوکس → لاگ کامل را نگه دار و پرامپ اسکالیشن (قدم ۸) |

بعد از رفع مشکل، Start Command تشخیصی را با نسخهٔ تمیز قدم ۳ جایگزین کن (خط‌های `TG-DIAG` دیگر لازم نیستند).

## قدم ۸ — پرامپ اسکالیشن به پشتیبانی Railway (انگلیسی، آمادهٔ paste)

اگر به حالت ۱ یا ۳ رسیدی، متن زیر را (با پر کردن `[…]`) در کانال پشتیبانی Railway (Help widget داشبورد / Discord `#support` / `station.railway.com`) paste کن:

```text
Subject: Custom Start Command seemingly not applied — mongo:8.0 crash-loops with
"BadValue: security.keyFile is required when authorization is enabled with replica sets"

Setup:
- Railway service from Docker image `mongo:8.0` (service name: [MongoDB]),
  project: […], environment: [production], region: […].
- Volume attached at `/data/db`. `MONGO_INITDB_ROOT_USERNAME/PASSWORD` are set
  (so the official image entrypoint auto-adds `--auth`).
- Custom Start Command (saved in Settings, verified — re-pasting shows no diff):
  sh -c 'printf "%s" "$MONGO_KEYFILE" > /tmp/mongo-keyfile && chmod 600
  /tmp/mongo-keyfile && chown mongodb:mongodb /tmp/mongo-keyfile;
  exec /usr/local/bin/docker-entrypoint.sh mongod --replSet rs0
  --keyFile /tmp/mongo-keyfile'
- `MONGO_KEYFILE` variable is set (~684-char base64, single line).

Expected: mongod boots with `--replSet rs0 --keyFile /tmp/mongo-keyfile --auth`.

Actual: EVERY deployment (including brand-new ones, e.g. [0b638f53…]) crashes
within seconds with:
  BadValue: security.keyFile is required when authorization is enabled with replica sets
The container restart-loops, the deployment stays in "Initializing/Deploying"
for hours, and queued deployments block behind it ("Waiting for previous deployment").

Diagnostic: I temporarily used a Start Command that echoes a marker line
(`TG-DIAG …`) before exec. The marker lines [DO / DO NOT] appear in the fresh
deployment's logs (full log attached: […]).

Question: is the Custom Start Command actually executed for these deployments?
If yes, why would mongod see `--replSet`+`--auth` but not `--keyFile`?
How can I force a deployment to use the current settings snapshot?

Attachments: full Deploy Logs of deployment […], screenshot of Settings → Start Command.
```
