export type MobileAppStoreKind =
  | 'google-play'
  | 'myket'
  | 'cafebazaar'
  | 'app-store'
  | 'testflight'
  | 'github'
  | 'direct'
  | 'other';

export interface MobileAppStoreLink {
  id: string;
  kind: MobileAppStoreKind;
  labelFa: string;
  labelEn: string;
  url: string;
  isActive: boolean;
}

export interface MobileAppDownloadConfig {
  apkAvailable: boolean;
  apkFileName?: string;
  apkSize?: number;
  apkUploadedAt?: string;
  directDownloadUrl: string;
  storeLinks: MobileAppStoreLink[];
}
