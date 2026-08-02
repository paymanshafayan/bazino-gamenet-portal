// BAZINO PRO Desktop — Electron main process.
//
// This does NOT talk to a remote server for its core operation — it runs the exact same
// Node.js/Express backend (server.ts, built to server.cjs) as the online site, IN-PROCESS,
// with its own local SQLite database. That backend already serves the Management App UI
// at /management-app, so this window just points at that local URL. The Management App's
// own "Web Sync" screen (تنظیمات tab) is what optionally connects this local instance to
// the REAL website's server over the internet, to pull/push things like online
// reservations — see src/utils/syncClient.ts and server.ts's /api/sync/* routes.
//
// See ../PUBLISH_AND_DATABASE_GUIDE.md and ./README.md before building a real installer —
// this couldn't be built or run in the sandbox this was written in (no Electron/network).

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const PORT = process.env.BAZINO_DESKTOP_PORT || '3000';
let mainWindow;

/** Path to the bundled server.cjs — differs between `npm start` (dev) and a packaged build. */
function resolveServerBundlePath() {
  return path.join(resolveServerBundleRoot(), 'dist', 'server.cjs');
}

/**
 * Root folder that mirrors the actual root project's build output layout:
 *   <root>/dist/server.cjs, <root>/dist/(site assets), <root>/Management App/Bazino/dist/,
 *   <root>/node_modules/ (production deps — server.cjs was bundled with --packages=external)
 * Packaged: electron-builder copies ./server-bundle → resources/server (see package.json).
 * Dev: `npm run prepare-server-bundle` copies the real root project's build output here.
 */
function resolveServerBundleRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, 'server-bundle');
}

/**
 * Starts the real backend IN-PROCESS (Electron's main process is a full Node.js runtime,
 * so we can just `require()` the server bundle directly — no separate `node` executable to
 * locate, no child-process/IPC plumbing needed).
 *
 * `server/dataProviders.ts` resolves `install-config.json` and the default SQLite file
 * relative to `process.cwd()`, so we `chdir` into Electron's per-user app-data folder FIRST
 * — that folder survives app updates/reinstalls, unlike the installed app directory itself
 * (which may be read-only and gets wiped on upgrade). Static assets (the built site +
 * Management App) are NOT under that data folder, so we point `BAZINO_STATIC_ROOT` back at
 * the actual bundle location before requiring server.cjs — see server.ts for the other half
 * of this.
 */
function startEmbeddedServer() {
  const dataDir = app.getPath('userData');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.chdir(dataDir);

  process.env.BAZINO_STATIC_ROOT = resolveServerBundleRoot();
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.PORT = PORT;
  // JWT_SECRET: generate + persist a random one on first run if the user hasn't set one,
  // so tokens stay valid across restarts without shipping an insecure hardcoded default.
  const secretFile = path.join(dataDir, '.jwt-secret');
  if (!process.env.JWT_SECRET) {
    if (fs.existsSync(secretFile)) {
      process.env.JWT_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
    } else {
      const generated = require('crypto').randomBytes(32).toString('hex');
      fs.writeFileSync(secretFile, generated, { mode: 0o600 });
      process.env.JWT_SECRET = generated;
    }
  }

  const serverPath = resolveServerBundlePath();
  if (!fs.existsSync(serverPath)) {
    dialog.showErrorBox(
      'فایل سرور پیدا نشد',
      `${serverPath}\n\nقبل از اجرا، دستور "npm run prepare-server-bundle" را در پوشه‌ی desktop-app اجرا کنید (یا برای build نهایی، از "npm run dist" استفاده کنید). راهنمای کامل: desktop-app/README.md`
    );
    app.quit();
    return false;
  }

  require(serverPath); // executes server.ts's own app.listen(...) — same code as the website
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'BAZINO PRO — نرم‌افزار مدیریت گیم‌نت',
    backgroundColor: '#141229',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}/management-app`);

  // Open real external links (e.g. anything the Web Sync screen links out to) in the
  // system browser instead of navigating this window away from the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (startEmbeddedServer() === false) return;
  // Give Express a brief moment to finish binding the port before pointing a window at it.
  // (A production version of this could instead poll http://localhost:PORT until it
  // responds — kept simple here since this whole file is unverified/untested; see README.)
  setTimeout(createWindow, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
