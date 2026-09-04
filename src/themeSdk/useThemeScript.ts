/**
 * بارگذاری theme.js قالب فعال (یک‌بار در سطح App) و اعلام آمادگی به همه‌ی ThemeRegionها.
 *
 * - با تعویض/آپدیت قالب، همه‌ی کامپوننت‌های قالب قبلی از رجیستری پاک می‌شوند.
 * - `?v=installedAt` جلوی کش کهنه‌ی مرورگر را می‌گیرد.
 * - اگر قالب theme.js نداشته باشد (CSS-only) بلافاصله ready=true.
 */
import { useEffect, useState } from 'react';
import { unregisterAllComponents, listRegisteredComponents } from './sdk';

export interface ThemeScriptSource {
  cssUrl: string;
  installedAt?: number;
  hasComponentJs?: boolean;
}

export interface ThemeScriptState {
  ready: boolean;
  error: string | null;
  registered: string[];
}

export function useThemeScript(source: ThemeScriptSource | null): ThemeScriptState {
  const key = source ? `${source.cssUrl}@${source.installedAt || 0}@${source.hasComponentJs === false ? 0 : 1}` : '';
  const [state, setState] = useState<ThemeScriptState>({ ready: !source, error: null, registered: [] });

  useEffect(() => {
    unregisterAllComponents();
    if (!source || source.hasComponentJs === false) {
      setState({ ready: true, error: null, registered: [] });
      return;
    }
    let cancelled = false;
    setState({ ready: false, error: null, registered: [] });
    const script = document.createElement('script');
    const base = source.cssUrl.replace(/\/theme\.css$/, '/theme.js');
    script.src = source.installedAt ? `${base}?v=${Math.floor(source.installedAt)}` : base;
    script.async = true;
    script.dataset.bazinoTheme = '1';
    script.onload = () => {
      if (cancelled) return;
      const registered = listRegisteredComponents();
      if (registered.length === 0) {
        console.warn('[ThemeSDK] theme.js loaded but did not register any component:', script.src);
      }
      setState({ ready: true, error: null, registered });
    };
    script.onerror = () => {
      if (cancelled) return;
      console.error('[ThemeSDK] Failed to load theme.js:', script.src);
      setState({ ready: true, error: 'theme.js failed to load', registered: [] });
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
