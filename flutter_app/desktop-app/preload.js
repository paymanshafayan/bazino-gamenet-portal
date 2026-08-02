// Intentionally minimal: the Management App communicates with its embedded backend purely
// via normal fetch() calls to http://localhost:PORT — no need to expose any special
// Electron/Node APIs into the page. This file exists only because `contextIsolation: true`
// (the secure default) still needs a valid preload script path configured.
