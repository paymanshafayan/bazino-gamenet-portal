# Flutter CI report — admin_app

- commit: `24d8b20bcf30e90aa0fc82ae21c07315ff77ff6f`
- branch: `arena/01a089a9-bazino-gamenet-portal`
- run:    34740661755
- date:   2026-09-13 05:35 UTC

## flutter --version
```
Flutter 3.47.4 • channel stable • https://github.com/flutter/flutter.git
Framework • revision 9584c6713b (2 days ago) • 2026-09-10 15:25:10 -0700
Engine • hash 0e228ec8c8d2abc9fcf1d053e8a40665bb859ec7 (revision 06a2e2a110) (9 days ago) • 2026-09-03 16:07:13.000Z
Tools • Dart 3.13.3 • DevTools 2.60.0
```
**exit 0 — OK**

## flutter pub get
```
Resolving dependencies...
Because bazino_admin_app depends on flutter_localizations from sdk which depends on intl ^0.20.3, intl ^0.20.3 is required.
So, because bazino_admin_app depends on intl ^0.19.0, version solving failed.


You can try the following suggestion to make the pubspec resolve:
* Try upgrading your constraint on intl: flutter pub add intl:^0.20.3
Failed to update packages.
```
**exit 1 — FAILED**

## flutter analyze
```
Resolving dependencies...
Because bazino_admin_app depends on flutter_localizations from sdk which depends on intl ^0.20.3, intl ^0.20.3 is required.
So, because bazino_admin_app depends on intl ^0.19.0, version solving failed.


You can try the following suggestion to make the pubspec resolve:
* Try upgrading your constraint on intl: flutter pub add intl:^0.20.3
Failed to update packages.
```
**exit 1 — FAILED**

## flutter test
```
Resolving dependencies...
Because bazino_admin_app depends on flutter_localizations from sdk which depends on intl ^0.20.3, intl ^0.20.3 is required.
So, because bazino_admin_app depends on intl ^0.19.0, version solving failed.


You can try the following suggestion to make the pubspec resolve:
* Try upgrading your constraint on intl: flutter pub add intl:^0.20.3
Failed to update packages.
```
**exit 1 — FAILED**

## flutter build web
```
Resolving dependencies...
Because bazino_admin_app depends on flutter_localizations from sdk which depends on intl ^0.20.3, intl ^0.20.3 is required.
So, because bazino_admin_app depends on intl ^0.19.0, version solving failed.


You can try the following suggestion to make the pubspec resolve:
* Try upgrading your constraint on intl: flutter pub add intl:^0.20.3
Failed to update packages.
```
**exit 1 — FAILED**

## flutter build apk
```
Resolving dependencies...
Because bazino_admin_app depends on flutter_localizations from sdk which depends on intl ^0.20.3, intl ^0.20.3 is required.
So, because bazino_admin_app depends on intl ^0.19.0, version solving failed.


You can try the following suggestion to make the pubspec resolve:
* Try upgrading your constraint on intl: flutter pub add intl:^0.20.3
Failed to update packages.
```
**exit 1 — FAILED**

## Summary
```
flutter --version=0
flutter pub get=1
flutter analyze=1
flutter test=1
flutter build web=1
flutter build apk=1
```

web size: 
apk size: 
