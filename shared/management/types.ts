export type CashMethod = 'cash' | 'pos';
export type OpsPermission = 'reservations' | 'orders' | 'collect' | 'wallet' | 'cashout' | 'affiliates' | 'promotions' | 'content' | 'publish' | 'tournaments' | 'reports' | 'configure';
export const OPS_PERMISSIONS: OpsPermission[] = ['reservations','orders','collect','wallet','cashout','affiliates','promotions','content','publish','tournaments','reports','configure'];
export interface OpsRecord<T = any> { kind: string; id: string; version: number; data: T; uniqueKey?: string | null; updatedAt: string; }
export interface StaffIdentity { username: string; displayName: string; permissions: OpsPermission[]; admin: boolean; }
export interface StationLink { id: string; name: string; type: string; systemId: string | null; hourlyRate: number; tariffId?: string; active: boolean; }
export interface BookingView {
  id: string; orderId: string | null; systemId: string; stationId: string | null; systemName: string;
  username: string; customerName: string; startsAt: string | null; endsAt: string | null;
  totalAmount: number; paidAmount: number; currency: 'TRY'; paymentStatus: 'pending' | 'paid' | 'free' | 'refunded' | 'unknown';
  bookingStatus: 'held' | 'confirmed' | 'cancelled' | 'expired' | 'completed' | 'unknown';
  attendanceStatus: 'not_arrived' | 'checked_in' | 'playing' | 'completed' | 'no_show';
  paymentMethod: string | null; paymentDueAt: string; source: string; version: number; sessionId?: string;
}
export type OpsTab = 'stations' | 'buffet' | 'shop' | 'customers' | 'affiliates' | 'promotions' | 'content' | 'tournaments' | 'accounting' | 'operators' | 'settings';
export interface Receipt {
  id: string; action: string; direction: 'in' | 'out'; amount: number; currency: 'TRY'; method: CashMethod;
  confirmation: 'operator_cash' | 'operator_pos_manual'; reference: string; username: string;
  orderId?: string; sessionId?: string; actor: string; createdAt: string; note?: string;
}
export interface ContentVersion { title: string; body: string; mediaUrl?: string; mediaType?: 'image' | 'video'; language: string; category?: string; }
export interface ContentItem {
  title: string; status: 'draft' | 'generating' | 'review' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'partial' | 'failed' | 'cancelled';
  versions: Partial<Record<'blog' | 'instagram' | 'telegram', ContentVersion>>;
  approvedVersion?: number; approvedBy?: string; scheduledAt?: string; taskId?: string; taskStatus?: string;
  destinations: Record<string, { status: string; id?: string; url?: string; error?: string; requestId?: string; attemptedAt?: string }>;
}
