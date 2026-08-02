# Handoff: Flutter web app on port 8081

Date: 2026-08-01
Project: bazino_app
Status: Web app verified working at http://localhost:8081/

## Summary
The Flutter web app is working correctly when launched with the web-server device on port 8081.
This handoff is intended to avoid repeating the same local web-runtime debugging in the future.

## What was done
- Verified that the Flutter web build succeeds.
- Ran the app using Flutter's web-server mode on port 8081.
- Served the built web output locally so the app could be opened in the browser.
- Confirmed that the app is accessible through the browser at http://localhost:8081/.

## Commands to run the app on port 8081
From the project root:

```powershell
flutter build web --debug
flutter run -d web-server --web-hostname 0.0.0.0 --web-port 8081
```

Then open:

```text
http://localhost:8081/
```

## Alternative: serve the already-built web output
If you only want to open the existing build output without launching Flutter again:

```powershell
py -m http.server 8081 --directory build/web
```

Then open:

```text
http://localhost:8081/
```

## Important notes
- The issue was not in the application code itself; the problem was related to the local web runtime/port binding environment.
- Port 8081 was chosen because the default/local web route was not reliable in this environment.
- If the browser shows a blank page, wait a few seconds and refresh.
- Keep the terminal running while the app is open.

## Windows-specific note
On Windows, use `py` instead of `python` if the `python` alias is not available.

## Troubleshooting
If the app does not open:
1. Confirm that the project was built with `flutter build web --debug`.
2. Confirm that the server is running from the project root.
3. Confirm that port 8081 is not blocked by a firewall or already occupied by another process.
4. If needed, try a different port such as 8082 or 9090.
