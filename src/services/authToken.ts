/**
 * ═══════════════════════════════════════════════════════════════════════════
 * نگه‌دارندهٔ توکن احراز هویت (Auth token store)
 *
 * سرور برای مسیرهای مدیریتی (`/api/admin/*`) یک JWT واقعی می‌خواهد و دیگر به
 * تنظیم مشترک و قدیمیِ `activeUsername` اعتماد نمی‌کند — چون آن تنظیم روی نصب
 * تازه با مقدار "admin" پر می‌شود و باعث می‌شد هر بازدیدکنندهٔ ناشناس «مدیر»
 * دیده شود.
 *
 * این ماژول توکن را نگه می‌دارد و آن را به‌صورت خودکار روی همهٔ درخواست‌های
 * same-origin به `/api/**` سوار می‌کند، تا هیچ‌کدام از ده‌ها فراخوانی موجود
 * لازم نباشد دستی تغییر کند (و فراخوانی‌های آینده هم خودبه‌خود پوشش داده شوند).
 * ═══════════════════════════════════════════════════════════════════════════
 */

const STORAGE_KEY = 'bazino.authToken';

let inMemoryToken: string | null = null;

/** خواندن توکن ذخیره‌شده (localStorage ممکن است در حالت خصوصی در دسترس نباشد). */
export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    inMemoryToken = localStorage.getItem(STORAGE_KEY);
  } catch {
    inMemoryToken = null;
  }
  return inMemoryToken;
}

/** ذخیرهٔ توکن پس از ورود/ثبت‌نام موفق. */
export function setAuthToken(token: string | null | undefined): void {
  inMemoryToken = token || null;
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* دسترسی به localStorage ممکن نیست — همان توکن در حافظه کافی است */
  }
}

/** پاک کردن توکن هنگام خروج. */
export function clearAuthToken(): void {
  setAuthToken(null);
}

/** آیا این آدرس یک مسیر API از همین مبدأ است؟ */
function isSameOriginApiUrl(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
    } catch {
      return false;
    }
  }
  return false;
}

let installed = false;

/**
 * یک بار در شروع برنامه صدا زده می‌شود: `fetch` سراسری را می‌پوشاند تا هدر
 * Authorization روی درخواست‌های API این دامنه اضافه شود. توکن به هیچ مبدأ
 * دیگری فرستاده نمی‌شود، و هدرِ صریحِ خودِ فراخوان بازنویسی نمی‌شود.
 */
export function installAuthFetchInterceptor(): void {
  // Patch the fetch that callers actually reach. `globalThis` is the correct
  // target: in a browser it IS `window`, and under a test DOM the two objects
  // can differ, in which case patching only `window` would silently miss every
  // call made through the bare `fetch(...)` binding.
  const scope: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
  if (installed || !scope || typeof scope.fetch !== 'function') return;
  installed = true;

  const originalFetch = scope.fetch.bind(scope);

  const patched = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = getAuthToken();
    if (!token) return originalFetch(input as any, init);

    const url =
      typeof input === 'string' ? input :
      input instanceof URL ? input.toString() :
      (input as Request).url;

    if (!isSameOriginApiUrl(url)) return originalFetch(input as any, init);

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    return originalFetch(input as any, { ...init, headers });
  };

  scope.fetch = patched;
  // Keep window.fetch in sync when it is a distinct object (test DOMs), so code
  // that explicitly calls `window.fetch(...)` is intercepted too.
  if (typeof window !== 'undefined' && (window as any) !== scope) {
    (window as any).fetch = patched;
  }
}

/** فقط برای تست‌ها: اجازهٔ نصب دوبارهٔ interceptor روی یک fetch تازه. */
export function __resetAuthFetchInterceptorForTests(): void {
  installed = false;
}
