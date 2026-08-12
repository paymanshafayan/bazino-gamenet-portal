# آیکون‌های دسکتاپ

آیکون‌های نصاب BAZINO PRO در همین پوشه قرار دارند (تولید شده از `logo-1024.png`):

| فایل | پلتفرم | سایزها |
|---|---|---|
| `icon.ico` | ویندوز | ۲۵۶/۱۲۸/۶۴/۴۸/۳۲/۱۶ |
| `icon.icns` | مک | ۱۰۲۴/۵۱۲/۲۵۶/۱۲۸/۶۴/۳۲/۱۶ (PNG-based icns) |
| `icon.png` | لینوکس | ۵۱۲×۵۱۲ |
| `logo-1024.png` | منبع | ۱۰۲۴×۱۰۲۴ (لوگوی مربعی اصلی — برای بازتولید آیکون‌ها) |

### بازتولید آیکون‌ها (اگر لوگو تغییر کرد)

```bash
# PNG لینوکس
convert logo-1024.png -resize 512x512 icon.png
# ICO ویندوز (چندرزولوشنی)
convert logo-1024.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
# ICNS مک — از طریق اسکریپت پایتون (icns header + PNG های هر سایز):
#   convert logo-1024.png -resize <size>x<size> /tmp/icon_<size>.png
#   سپس هر PNG را با تایپ icp4..ic10 داخل کانتینر icns بچینید (کد در تاریخچه‌ی git)
```

> نکته: `icon.icns` به‌صورت PNG-based ساخته شده (تایپ‌های `icp4`..`ic10`) که macOS 10.7+ پشتیبانی می‌کند — برای سازگاری حداکثری با مک‌های خیلی قدیمی می‌توانید با `iconutil`/`electron-icon-builder` نسخه‌ی icns با `ic07`/`ic08`/`ic09` کامل بسازید.
