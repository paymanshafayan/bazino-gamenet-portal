# راهنمای جامع انتشار اپلیکیشن موبایل Bazino Arena در گوگل پلی و اپ استور

این راهنما مراحل دقیق و گام به گام تنظیمات، امضای دیجیتال (Signing) و خروجی گرفتن نهایی (Build Release) از پروژه فلاتر را برای عرضه رسمی در **Google Play Store** و **Apple App Store** آموزش می‌دهد.

---

## بخش اول: آماده‌سازی مشترک پروژه فلاتر

قبل از اقدام به خروجی گرفتن برای هر پلتفرم، مطمئن شوید که اطلاعات پایه زیر در فایل `/flutter_app/pubspec.yaml` به درستی تنظیم شده باشد:

```yaml
name: bazino_app
description: "Bazino Esports Lounge Hub with Jarvis Smart Assistant."
version: 1.0.0+1 # شماره نسخه (مثال: نسخه 1.0.0 ساخت شماره 1)
```

هر بار که نسخه جدیدی به مارکت‌ها ارائه می‌دهید، باید شماره ساخت را افزایش دهید (مثلاً `1.0.0+2`).

---

## بخش دوم: راهنمای گام به گام انتشار در گوگل پلی (Android)

گوگل پلی برای دریافت خروجی به یک فایل باندل با فرمت `AAB` (Android App Bundle) نیاز دارد که با یک کلید معتبر امضا شده باشد.

### ۱. ساخت کلید امضای دیجیتال (Upload Key & Keystore)
یک ترمینال در سیستم عامل خود باز کرده و دستور زیر را برای تولید فایل کلید اجرا کنید:

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
* **توضیح:** این دستور یک فایل به نام `upload-keystore.jks` در پوشه کاربری شما با آلیاس `upload` می‌سازد. رمز عبوری که وارد می‌کنید را حتماً یادداشت کنید.

### ۲. پیکربندی امضا در فلاتر (Configuration)
یک فایل به نام `key.properties` در آدرس `/flutter_app/android/` ایجاد کنید و مقادیر زیر را در آن قرار دهید:

```properties
storePassword=رمز_عبور_شما
keyPassword=رمز_عبور_کلید_شما
keyAlias=upload
storeFile=/آدرس/کامل/فایل/upload-keystore.jks
```

### ۳. بروزرسانی فایل `build.gradle` اندروید
فایل `/flutter_app/android/app/build.gradle` را ویرایش کرده تا از کلید شما استفاده کند:

```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile = file(keystoreProperties['storeFile'])
                storePassword = keystoreProperties['storePassword']
                keyAlias = keystoreProperties['keyAlias']
                keyPassword = keystoreProperties['keyPassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true // بهینه‌سازی و فشرده‌سازی کدها
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### ۴. گرفتن خروجی نهایی باندل اندروید (AAB)
دستور زیر را در پوشه روت پروژه فلاتر اجرا کنید:

```bash
flutter build appbundle --release
```
* **مسیر فایل خروجی:** `/flutter_app/build/app/outputs/bundle/release/app-release.aab`
* این فایل را در پنل **Google Play Console** آپلود کنید.

---

## بخش ۲.۵: خروجی گرفتن فایل نصب مستقیم اندروید (APK) برای تست یا دانلود مستقیم

اگر می‌خواهید اپلیکیشن را مستقیماً روی گوشی خود یا دیگران نصب و تست کنید (بدون نیاز به گوگل پلی)، به فایل با پسوند `.apk` نیاز دارید.

### چرا این خروجی باید روی کامپیوتر شخصی شما گرفته شود؟
محیط ابری پیش‌نمایش (Sandbox Container) یک محیط ایزوله وب‌محور برای کدنویسی، ویرایش و کامپایل کدهای وب (React/TypeScript) است و ابزارهای بسیار سنگین توسعه موبایل مانند **Android SDK**، **Java Development Kit (JDK)** و کامپایلر بومی اندروید (Gradle) روی آن نصب نیستند. بنابراین فرآیند بیلد نهایی موبایل باید روی کامپیوتر محلی شما انجام شود.

### دستور گرفتن فایل APK:
کافیست پروژه را دانلود کرده و در خط فرمان (Terminal) سیستم خود، دستور زیر را در پوشه پروژه اجرا کنید:

```bash
flutter build apk --release
```

* **مسیر فایل خروجی:** `/flutter_app/build/app/outputs/flutter-apk/app-release.apk`
* شما می‌توانید این فایل را مستقیماً از طریق تلگرام، ایمیل یا کابل روی هر گوشی اندرویدی انتقال داده و نصب کنید! 📱

---

## بخش سوم: راهنمای گام به گام انتشار در اپ استور (iOS)

اپل برای خروجی گرفتن به سیستم عامل macOS، نرم‌افزار Xcode و یک حساب کاربری Apple Developer (دارای حق عضویت سالانه) نیاز دارد.

### ۱. تنظیم باندل آیدی (Bundle Identifier)
پوشه `/flutter_app/ios` را در نرم‌افزار **Xcode** باز کنید. در بخش **General**، شناسه یکتای اپلیکیشن خود را مشخص کنید (مثال: `com.bazino.app`).

### ۲. تنظیم حساب برنامه نویسی و امضا (Signing & Capabilities)
در تب **Signing & Capabilities** در Xcode:
1. تیک گزینه **Automatically manage signing** را بزنید.
2. حساب برنامه نویسی (Team) خود را انتخاب کنید.
3. مطمئن شوید که پروفایل‌های امضا (Provisioning Profiles) بدون خطا تولید شده‌اند.

### ۳. بررسی دسترسی‌ها در `Info.plist`
به دلیل استفاده از میکروفون در دستیار صوتی جارویس، حتماً کلیدهای زیر در فایل `/flutter_app/ios/Runner/Info.plist` فعال باشند (قبلاً توسط ما تنظیم شده است):

```xml
<key>NSMicrophoneUsageDescription</key>
<string>GameNet Jarvis requires access to the microphone to capture your voice commands.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>GameNet Jarvis requires Speech Recognition permission to transcribe your voice commands.</string>
```

### ۴. گرفتن خروجی نهایی iOS (IPA Archive)
ابتدا دستور زیر را در پوشه روت پروژه فلاتر اجرا کنید:

```bash
flutter build ipa --release
```

سپس:
1. نرم‌افزار Xcode را باز کرده و از منوی بالا به مسیر **Product > Archive** بروید.
2. پس از اتمام آرشیو، پنجره **Organizer** باز می‌شود.
3. روی دکمه **Distribute App** کلیک کرده و گزینه **App Store Connect** را برای آپلود مستقیم به پنل اپل انتخاب کنید.
4. پس از آپلود، از طریق پنل **App Store Connect** اقدام به ثبت درخواست انتشار (Submit for Review) کنید.

---

## بخش چهارم: چک لیست نهایی قبل از انتشار
- [ ] تست اتصال اپلیکیشن موبایل به سرور بک‌اند واقعی در حالت ریلیز (بررسی آدرس‌های API در محیط اینترنت واقعی).
- [ ] چک کردن دسترسی میکروفون گوشی در زمان اجرای اولیه دستیار صوتی جارویس.
- [ ] طراحی آیکون‌ها و صفحات معرفی سایزهای مختلف گوشی و تبلت جهت آپلود در مارکت‌ها.
- [ ] ترجمه و تهیه توضیحات اپلیکیشن به زبان‌های فارسی و انگلیسی.

*موفق باشید! در صورت نیاز به هرگونه تغییر یا سوال فنی، در خدمتم.* 🚀
