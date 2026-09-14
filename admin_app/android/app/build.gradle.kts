import java.util.Base64

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "pro.bazino.admin"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // شناسهٔ رسمی انتشار بازینو (اپ ادمین (ایزوله از اپ مشتری pro.bazino.app))
        applicationId = "pro.bazino.admin"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            // امضای release از متغیرهای محیطی/رازهای CI می‌آید:
            //   BAZINO_ANDROID_KEYSTORE_B64  — فایل keystore به base64
            //   BAZINO_ANDROID_KEY_ALIAS / BAZINO_ANDROID_KEY_PASSWORD / BAZINO_ANDROID_STORE_PASSWORD
            // اگر ست نشده باشند (بیلد محلی/CI بدون راز)، مثل قبل با کلید debug امضا می‌شود
            // تا APK قابل نصب بماند — کلید واقعی را فقط GitHub Secrets نگه می‌دارد.
            val keystoreB64 = System.getenv("BAZINO_ANDROID_KEYSTORE_B64")
            if (keystoreB64 != null && keystoreB64.isNotEmpty()) {
                val keystoreFile = File(rootProject.layout.buildDirectory.asFile.get(), "bazino-release.keystore")
                keystoreFile.parentFile.mkdirs()
                keystoreFile.writeBytes(Base64.getDecoder().decode(keystoreB64))
                storeFile = keystoreFile
                keyAlias = System.getenv("BAZINO_ANDROID_KEY_ALIAS") ?: "bazino"
                keyPassword = System.getenv("BAZINO_ANDROID_KEY_PASSWORD") ?: ""
                storePassword = System.getenv("BAZINO_ANDROID_STORE_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        release {
            val hasReleaseKey = System.getenv("BAZINO_ANDROID_KEYSTORE_B64")?.isNotEmpty() == true
            signingConfig = if (hasReleaseKey) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
