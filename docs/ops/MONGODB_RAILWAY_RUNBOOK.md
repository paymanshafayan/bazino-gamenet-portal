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

## قدم ۳ — Start Command

در سرویس Mongo → تب **Settings** → **Start Command** (جایگزین کامل دستور فعلی):

```sh
sh -c 'printf "%s" "$MONGO_KEYFILE" > /tmp/mongo-keyfile && chmod 600 /tmp/mongo-keyfile && chown mongodb:mongodb /tmp/mongo-keyfile; exec /usr/local/bin/docker-entrypoint.sh mongod --replSet rs0 --keyFile /tmp/mongo-keyfile'
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
| در چت `&gt;` و `&amp;` و لینک `http://docker-entrypoint.sh` دیده می‌شود | آرتیفکت نمایشی چت است (escape شدن `>` و `&` + autolink پسوند `.sh`)؛ متن واقعی کپی‌شده تمیز است | نادیده بگیر؛ ملاک فقط متن داخل فیلد Railway است |
