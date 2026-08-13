/**
 * ═══════════════════════════════════════════════════════════════════════════
 * محیط DOM برای تست کامپوننت‌ها
 *
 * یک DOM واقعی (jsdom) می‌سازد و کامپوننت‌ها را از طریق همان Vite‌ای بارگذاری
 * می‌کند که خودِ اپ استفاده می‌کند — پس alias‌ها (`react` → `preact/compat`)،
 * import‌های CSS و asset‌ها دقیقاً مثل production حل می‌شوند.
 *
 * چرا jsdom و نه فقط render-to-string: می‌خواهیم رفتار واقعی را ببینیم
 * (کلیک، تغییر state، useEffect)، نه صرفاً خروجی HTML اولیه را.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { JSDOM } from 'jsdom';
import type { ViteDevServer } from 'vite';

let dom: JSDOM;
let vite: ViteDevServer;
let React: any;
let actFn: any;

/** globalهایی که کامپوننت‌ها انتظارشان را دارند از پنجرهٔ jsdom تأمین می‌شوند. */
const GLOBAL_KEYS = [
  'window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLAnchorElement',
  'HTMLImageElement', 'Node', 'Element', 'Event', 'CustomEvent', 'MouseEvent',
  'KeyboardEvent', 'getComputedStyle', 'requestAnimationFrame',
  'cancelAnimationFrame', 'localStorage', 'sessionStorage', 'MutationObserver',
  'DOMParser', 'XMLSerializer', 'Image', 'FormData', 'Blob', 'URL',
];

/** یک بار در ابتدای فایل تست صدا زده می‌شود. */
export async function setupDom(): Promise<void> {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/',
    pretendToBeVisual: true,
  });

  const g: any = globalThis;
  const w: any = dom.window;

  for (const key of GLOBAL_KEYS) {
    if (w[key] === undefined) continue;
    try { g[key] = w[key]; }
    catch { Object.defineProperty(g, key, { value: w[key], configurable: true, writable: true }); }
  }
  // در Node 22 این‌ها فقط getter دارند و انتساب ساده خطا می‌دهد.
  for (const key of ['navigator', 'location']) {
    Object.defineProperty(g, key, { value: w[key], configurable: true, writable: true });
  }

  // IntersectionObserver در jsdom وجود ندارد. PerformanceGuards نبودش را
  // تشخیص می‌دهد و بلافاصله mount می‌کند — همان مسیری که می‌خواهیم تست شود.
  // تست‌هایی که رفتار lazy را می‌خواهند، خودشان mock را نصب می‌کنند.
  delete g.IntersectionObserver;

  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
    logLevel: 'error',
    cacheDir: 'node_modules/.vite-uitests',
    optimizeDeps: { noDiscovery: true },
    // Vite's SSR loader would otherwise hand out SEPARATE instances of preact,
    // preact/compat and preact/jsx-runtime. Components compiled with the JSX
    // runtime would then produce Fragments/contexts that the renderer from
    // `preact/compat` does not recognise ("Invalid type passed to
    // createElement"), and context lookups would silently miss. Forcing them
    // through the SSR pipeline keeps a single shared instance of each.
    ssr: {
      noExternal: ['preact', 'preact/compat', 'preact/hooks', 'preact/jsx-runtime', 'lucide-react'],
    },
  });

  // 'react' از طریق alias به preact/compat می‌رسد — همان چیزی که اپ استفاده می‌کند.
  React = await vite.ssrLoadModule('react');
  ({ act: actFn } = await vite.ssrLoadModule('preact/test-utils') as any);
}

export async function teardownDom(): Promise<void> {
  if (vite) await vite.close();
  if (dom) dom.window.close();
}

/** بارگذاری یک ماژول از پروژه با همان قواعد Vite. */
export function loadModule(path: string): Promise<any> {
  return vite.ssrLoadModule(path);
}

export function getReact(): any { return React; }
export function getWindow(): any { return dom.window; }
export function getDocument(): any { return dom.window.document; }

/** اجرای یک به‌روزرسانی و flush کردن effectها. */
export async function act(fn: () => void | Promise<void>): Promise<void> {
  await actFn(async () => { await fn(); });
}

export interface Mounted {
  /** ریشه‌ای که کامپوننت داخلش رندر شده */
  container: any;
  html(): string;
  text(): string;
  find(selector: string): any;
  findAll(selector: string): any[];
  /** پیدا کردن اولین المانی که متن داده‌شده را دارد */
  findByText(needle: string): any;
  click(target: string | any): Promise<void>;
  unmount(): Promise<void>;
}

/** رندر یک کامپوننت داخل یک container تازه و برگرداندن ابزارهای بازرسی. */
export async function mount(component: any, props: any = {}, ...children: any[]): Promise<Mounted> {
  const doc = dom.window.document;
  const container = doc.createElement('div');
  doc.body.appendChild(container);

  await act(async () => {
    React.render(React.createElement(component, props, ...children), container);
  });

  const api: Mounted = {
    container,
    html: () => container.innerHTML,
    text: () => container.textContent ?? '',
    find: (sel: string) => container.querySelector(sel),
    findAll: (sel: string) => Array.from(container.querySelectorAll(sel)),
    findByText: (needle: string) =>
      (Array.from(container.querySelectorAll('*')) as any[])
        .filter(el => (el.textContent ?? '').includes(needle))
        .pop() ?? null,
    click: async (target: string | any) => {
      const el = typeof target === 'string' ? container.querySelector(target) : target;
      if (!el) throw new Error(`click(): no element for ${String(target)}`);
      await act(async () => {
        el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      });
    },
    unmount: async () => {
      await act(async () => { React.render(null, container); });
      container.remove();
    },
  };
  return api;
}

/** نصب یک IntersectionObserver قلابی که کنترل دستی دارد. */
export function installIntersectionObserver(): { triggerAll: (isIntersecting?: boolean) => void } {
  const instances: Array<{ cb: Function; el: any; io: any }> = [];
  class FakeIO {
    cb: Function;
    disconnected = false;
    constructor(cb: Function) { this.cb = cb; }
    observe(el: any) { instances.push({ cb: this.cb, el, io: this }); }
    unobserve(el: any) {
      for (let i = instances.length - 1; i >= 0; i--) {
        if (instances[i].io === this && instances[i].el === el) instances.splice(i, 1);
      }
    }
    // A real observer stops delivering callbacks after disconnect(); the double
    // must honour that, otherwise "fire once" behaviour looks like a bug.
    disconnect() {
      this.disconnected = true;
      for (let i = instances.length - 1; i >= 0; i--) {
        if (instances[i].io === this) instances.splice(i, 1);
      }
    }
  }
  (globalThis as any).IntersectionObserver = FakeIO as any;
  (dom.window as any).IntersectionObserver = FakeIO as any;

  return {
    triggerAll(isIntersecting = true) {
      // snapshot: a callback may disconnect its observer while we iterate
      for (const { cb, el, io } of [...instances]) {
        if (io.disconnected) continue;
        cb([{ isIntersecting, target: el, intersectionRatio: isIntersecting ? 1 : 0 }]);
      }
    },
  };
}

/** حذف IntersectionObserver (حالت پیش‌فرض تست‌ها). */
export function removeIntersectionObserver(): void {
  delete (globalThis as any).IntersectionObserver;
  delete (dom.window as any).IntersectionObserver;
}

/** جایگزینی موقت fetch برای کامپوننت‌هایی که داده می‌گیرند. */
export function stubFetch(handler: (url: string, init?: any) => any) {
  const calls: Array<{ url: string; init?: any }> = [];
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    calls.push({ url, init });
    const result = await handler(url, init);
    if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        json: async () => result.body,
        text: async () => JSON.stringify(result.body),
      } as any;
    }
    return {
      ok: true, status: 200,
      json: async () => result,
      text: async () => JSON.stringify(result),
    } as any;
  };
  return calls;
}
