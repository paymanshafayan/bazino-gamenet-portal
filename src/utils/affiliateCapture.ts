/** ضبط لینک ?ref= و شناسهٔ بازدیدکننده — مستقل از قالب. */
export const REF_KEY = 'bz_ref';
export const VID_KEY = 'bz_vid';

export function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch { return ''; }
}

export function storedRef(): string {
  try { return (localStorage.getItem(REF_KEY) || '').trim(); } catch { return ''; }
}

export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const u = new URL(window.location.href);
    const ref = (u.searchParams.get('ref') || '').trim();
    if (!ref) return;
    localStorage.setItem(REF_KEY, ref.toUpperCase());
    fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: ref, path: u.pathname, visitorId: getVisitorId() }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

export function claimStoredRef(): void {
  const code = storedRef();
  if (!code) return;
  fetch('/api/affiliate/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, visitorId: getVisitorId() }),
  }).catch(() => {});
}
