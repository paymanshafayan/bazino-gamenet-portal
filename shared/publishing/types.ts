export type SocialLanguage = 'fa' | 'tr' | 'en' | 'ru';
export const SOCIAL_LANGUAGES: SocialLanguage[] = ['tr', 'fa', 'en', 'ru'];
export type ExecutionMode = 'manual' | 'agent';
export type PostFormat = 'image' | 'carousel' | 'reel' | 'story';
export interface Versioned<T> { id: string; version: number; updatedAt: string; data: T; }
export interface AgentProfile {
  name: string; adapterId: 'manus' | 'unsupported'; enabled: boolean;
  credentialRef: string; projectId: string; profile: string; checkedAt?: string;
  checkResult?: 'ready' | 'failed'; credentialVersion?: number; checkedFingerprint?: string;
}
export interface PublishingConfig {
  selectedMode: ExecutionMode | null; defaultAgentId: string; defaultCampaignId: string;
  zernioAccountId: string; zernioProfileId: string; outboundEnabled: boolean;
  baseUrl: string; timezone: string;
  mediagenEnabled: boolean; mediagenDesigns: string[];
  mediagenImejisLimit: number; mediagenFluxLimit: number;
}
export interface CampaignPolicy {
  name: string; active: boolean; accountId: string; languages: SocialLanguage[];
  keywords: Record<SocialLanguage, string>; requireVerifiedFollow: boolean; requireLikeAttestation: boolean;
  couponEnabled: boolean; couponValue: number; couponType: 'percent' | 'fixed'; couponDays: number; couponMinOrder: number;
  financialApproved: boolean; newCustomerOnly: boolean; commissionPct: number; refundDays: number;
  attributionDays: number; payoutMin: number; responsible: string; approvedAt?: string;
  messages: Record<SocialLanguage, { partner1: string; partner2: string; friend: string; invite: string; button: string }>;
}
export interface PublishedMedia {
  nativeId: string; accountId: string; platform: 'instagram'; providerPostId?: string;
  source: 'manus_ingest' | 'admin' | 'zernio_publication' | 'external_discovery';
  mediaType: 'post' | 'reel' | 'story' | 'unknown'; campaignId: string; languages: SocialLanguage[];
  active: boolean; approval: 'approved' | 'needs_review' | 'deleted'; receivedAt: string;
  publishedAt?: string; publicationId?: string;
}
export interface MediaAsset {
  owner: string; name: string; mime: string; size: number; received: number;
  status: 'uploading' | 'validating' | 'ready' | 'failed' | 'cancelled'; hash?: string;
  width?: number; height?: number; duration?: number; codec?: string; error?: string;
  createdAt: string; expiresAt: string;
}
export interface PostDraft {
  title: string; caption: string; language: SocialLanguage; format: PostFormat;
  assetIds: string[]; coverId?: string; campaignId: string; accountId: string;
  executionMode: ExecutionMode; agentId: string; status: 'draft' | 'approved' | 'scheduled' | 'submitted' | 'published' | 'failed' | 'cancelled' | 'delivery_unknown';
  revision: number; approvalHash?: string; approvedBy?: string; approvedAt?: string;
  scheduledAt?: string; timezone: string; publicationId?: string; owner: string;
}
export interface Publication {
  draftId: string; draftRevision: number; snapshot: PostDraft; approvalHash: string;
  assetHashes: Record<string, string>; agentVersion?: number; agentConfigHash?: string; credentialVersion?: number; agentCredentialHash?: string;
  state: 'queued' | 'preparing' | 'submitting' | 'submitted' | 'published' | 'failed' | 'cancelled' | 'delivery_unknown';
  provider: 'zernio' | 'manus'; providerPostId?: string; taskId?: string;
  nativeMediaId?: string; scheduledAt: string; createdAt: string; updatedAt: string;
  error?: string; attemptedAt?: string; leaseUntil?: string; leaseToken?: string;
  platformResults?: Record<string, { status: string; nativeId?: string; url?: string }>;
}

export type MediaGenProvider = 'imejis' | 'flux';
export interface MediaGenTask {
  provider: MediaGenProvider; designId: string; fields: Record<string, string>;
  prompt: string; title: string; language: SocialLanguage; owner: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'imported' | 'cancelled';
  assetId?: string; draftId?: string; error?: string;
  leaseUntil?: string; leaseToken?: string; createdAt: string; completedAt?: string;
}
