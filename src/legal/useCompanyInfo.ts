import { useEffect, useState } from 'react';
import type { CompanyInfo } from './legalContent';

let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export async function loadSiteSettings(force = false): Promise<Record<string, string>> {
  if (cache && !force) return cache;
  if (!inflight) {
    inflight = fetch('/api/settings').then(r => r.ok ? r.json() : {}).catch(() => ({})).then((j) => { cache = j || {}; inflight = null; return cache!; });
  }
  return inflight;
}

export function invalidateSiteSettings() { cache = null; }

export function companyInfoFrom(s: Record<string, string>): CompanyInfo {
  return {
    company: s.company_legal_name || 'Bazino Gaming Lounge',
    address: s.club_address || '',
    email: s.company_email || '',
    phone: s.company_landline || s.club_phone || '',
    taxNo: s.company_tax_no || '',
    site: typeof window !== 'undefined' ? window.location.host : 'bazino',
  };
}

export function useSiteSettings(): Record<string, string> | null {
  const [s, setS] = useState<Record<string, string> | null>(cache);
  useEffect(() => { let alive = true; loadSiteSettings().then(v => { if (alive) setS(v); }); return () => { alive = false; }; }, []);
  return s;
}

export function useCompanyInfo(): { info: CompanyInfo; settings: Record<string, string> | null } {
  const settings = useSiteSettings();
  return { info: companyInfoFrom(settings || {}), settings };
}
