/**
 * قرارداد «آزمایشگاه اپ» — امولاتور وب روی Appetize.io
 *
 * سرور APK را با متد URL به Appetize می‌سپارد و فقط کلید عمومی (publicKey)
 * برگردانده می‌شود؛ توکن API هرگز به کلاینت نمی‌رسد.
 */

export interface AppetizeAppInfo {
  publicKey: string;
  platform: string;
  note: string;
  source: string;
  updatedAt: string;
  embedUrl: string;
}

/** GET /api/appetize/active — عمومی */
export interface AppetizeActive {
  active: boolean;
  app: AppetizeAppInfo | null;
}

/** GET /api/admin/appetize/status — فقط ادمین */
export interface AppetizeStatus {
  configured: boolean;
  tokenHint: string;
  app: AppetizeAppInfo | null;
  apkAvailable: boolean;
  apkSize: number;
}
