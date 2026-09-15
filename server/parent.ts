/**
 * Parent App Backend - نظارت والدین
 * 
 * قابلیت‌ها:
 * - لینک والد به فرزند
 * - لیست فرزندان
 * - وضعیت لحظه‌ای فرزند
 * - درخواست‌های نیازمند تایید والد
 * - تایید/رد درخواست
 * - تاریخچه فعالیت
 * - محدودیت‌ها (زمان، هزینه، بازی‌ها، ساعات مجاز)
 */

import type { Express, Request, Response } from 'express';

type ChildPresence = 'offline' | 'online' | 'playing' | 'inTournament';
type RequestType = 'stationReservation' | 'tournamentJoin' | 'gameSelection' | 'cafeOrder';
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

interface ParentChildLink {
  parentUsername: string;
  childUsername: string;
  childDisplayName: string;
  childAge: number;
  linkedAt: string;
}

interface ApprovalRequest {
  id: string;
  childId: string; // child username
  childName: string;
  parentUsername: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  payload: Record<string, any>;
  parentNote?: string;
  rejectionReason?: string;
}

interface Activity {
  id: string;
  childId: string;
  type: RequestType;
  at: string;
  title: string;
  detail: string;
  amount?: number;
  durationMinutes?: number;
}

interface ChildLimits {
  dailyMinutesLimit: number;
  dailySpendingLimit: number;
  allowedGames: string[];
  blockedGames: string[];
  allowedFrom: string;
  allowedTo: string;
  requireApprovalForCafe: boolean;
  requireApprovalForTournaments: boolean;
  requireApprovalForGameSelection: boolean;
}

// In-memory storage (در حالت production باید به دیتابیس منتقل شود - می‌توان از dataProviders استفاده کرد)
// برای سادگی فعلا حافظه موقت + ذخیره در فایل JSON ساده
const parentChildLinks: ParentChildLink[] = [];
const approvalRequests: ApprovalRequest[] = [];
const activities: Activity[] = [];
const childLimitsMap = new Map<string, ChildLimits>(); // childUsername -> limits

// Mock child presence (در حالت واقعی از floor/sessions خوانده می‌شود)
const childPresenceMap = new Map<string, { presence: ChildPresence; station?: string; game?: string; sessionStart?: string }>();

function defaultLimits(): ChildLimits {
  return {
    dailyMinutesLimit: 180,
    dailySpendingLimit: 500000,
    allowedGames: [],
    blockedGames: [],
    allowedFrom: '14:00',
    allowedTo: '21:00',
    requireApprovalForCafe: true,
    requireApprovalForTournaments: true,
    requireApprovalForGameSelection: true,
  };
}

function generateId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function registerParentRoutes(app: Express, getCurrentUser: (req: Request) => Promise<any>) {
  // Middleware: فقط والدین (یا هر کاربر لاگین کرده برای نمونه) - در حالت واقعی باید role parent داشته باشد
  const requireAuth = async (req: Request, res: Response, next: Function) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      (req as any).user = user;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // لیست فرزندان والد
  app.get('/api/parent/children', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const links = parentChildLinks.filter(l => l.parentUsername === user.username);
    // اگر هیچ لینکی نیست، یک فرزند نمونه برگردان برای تست
    if (links.length === 0) {
      return res.json([
        {
          id: 'demo_child_1',
          username: 'demo_child',
          displayName: 'فرزند نمونه',
          age: 13,
          presence: childPresenceMap.get('demo_child')?.presence || 'offline',
          currentStation: childPresenceMap.get('demo_child')?.station,
          currentGame: childPresenceMap.get('demo_child')?.game,
          loyaltyPoints: 120,
          todaySpentMinutes: 45,
          todaySpentAmount: 75000,
        },
      ]);
    }
    const children = links.map(l => {
      const presence = childPresenceMap.get(l.childUsername);
      return {
        id: l.childUsername,
        username: l.childUsername,
        displayName: l.childDisplayName,
        age: l.childAge,
        presence: presence?.presence || 'offline',
        currentStation: presence?.station,
        currentGame: presence?.game,
        sessionStart: presence?.sessionStart,
        loyaltyPoints: 0,
        todaySpentMinutes: 0,
        todaySpentAmount: 0,
      };
    });
    res.json(children);
  });

  // لینک فرزند جدید
  app.post('/api/parent/link-child', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { identifier, childAge, childDisplayName } = req.body;
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: 'identifier required' });
    }
    // بررسی تکراری نبودن
    if (parentChildLinks.some(l => l.parentUsername === user.username && l.childUsername === identifier)) {
      return res.status(400).json({ error: 'Already linked' });
    }
    const link: ParentChildLink = {
      parentUsername: user.username,
      childUsername: identifier,
      childDisplayName: childDisplayName || identifier,
      childAge: childAge || 12,
      linkedAt: new Date().toISOString(),
    };
    parentChildLinks.push(link);
    childLimitsMap.set(identifier, defaultLimits());
    res.json({ success: true, link });
  });

  // وضعیت لحظه‌ای فرزند
  app.get('/api/parent/children/:childId/status', requireAuth, async (req: Request, res: Response) => {
    const { childId } = req.params;
    const presence = childPresenceMap.get(childId) || { presence: 'offline' as ChildPresence };
    res.json({
      childId,
      presence: presence.presence,
      currentStation: presence.station,
      currentGame: presence.game,
      sessionStart: presence.sessionStart,
      lastSeen: new Date().toISOString(),
    });
  });

  // درخواست‌های در انتظار تایید
  app.get('/api/parent/requests', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const myChildUsernames = parentChildLinks.filter(l => l.parentUsername === user.username).map(l => l.childUsername);
    // اگر لینکی نیست، درخواست‌های نمونه برای دمو
    let filtered = approvalRequests.filter(r => r.parentUsername === user.username && r.status === 'pending');
    if (filtered.length === 0 && myChildUsernames.length === 0) {
      // نمونه برای نمایش در اپ والدین بدون نیاز به لینک واقعی
      filtered = [
        {
          id: 'demo_r1',
          childId: 'demo_child',
          childName: 'فرزند نمونه',
          parentUsername: user.username,
          type: 'stationReservation',
          status: 'pending',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          payload: { stationName: 'PC-12 - Gaming', duration: 120, hourlyRate: 75000, total: 150000 },
        },
        {
          id: 'demo_r2',
          childId: 'demo_child',
          childName: 'فرزند نمونه',
          parentUsername: user.username,
          type: 'cafeOrder',
          status: 'pending',
          createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          payload: { items: ['پیتزا', 'نوشابه'], total: 185000 },
        },
      ] as ApprovalRequest[];
    }
    res.json(filtered);
  });

  // تایید درخواست
  app.post('/api/parent/requests/:requestId/approve', requireAuth, async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { note } = req.body;
    const user = (req as any).user;

    // نمونه دمو
    if (requestId.startsWith('demo_')) {
      return res.json({ success: true, message: 'Demo request approved (mock)' });
    }

    const reqItem = approvalRequests.find(r => r.id === requestId && r.parentUsername === user.username);
    if (!reqItem) return res.status(404).json({ error: 'Request not found' });
    if (reqItem.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    reqItem.status = 'approved';
    reqItem.parentNote = note;

    // ثبت در فعالیت‌ها
    activities.push({
      id: generateId('act_'),
      childId: reqItem.childId,
      type: reqItem.type,
      at: new Date().toISOString(),
      title: `تایید ${reqItem.type}`,
      detail: note || 'توسط والد تایید شد',
      amount: reqItem.payload.total || reqItem.payload.fee,
      durationMinutes: reqItem.payload.duration,
    });

    // در حالت واقعی اینجا رزرو/سفارش اصلی نهایی می‌شود
    // مثلا: await finalizeReservation(reqItem.payload.reservationId)

    res.json({ success: true, request: reqItem });
  });

  // رد درخواست
  app.post('/api/parent/requests/:requestId/reject', requireAuth, async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    if (requestId.startsWith('demo_')) {
      return res.json({ success: true, message: 'Demo request rejected (mock)' });
    }

    const reqItem = approvalRequests.find(r => r.id === requestId && r.parentUsername === user.username);
    if (!reqItem) return res.status(404).json({ error: 'Request not found' });
    if (reqItem.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    reqItem.status = 'rejected';
    reqItem.rejectionReason = reason || 'توسط والد رد شد';

    res.json({ success: true, request: reqItem });
  });

  // تاریخچه فعالیت فرزند
  app.get('/api/parent/activity/:childId', requireAuth, async (req: Request, res: Response) => {
    const { childId } = req.params;
    const user = (req as any).user;
    // اعتبارسنجی مالکیت
    const isOwner = parentChildLinks.some(l => l.parentUsername === user.username && l.childUsername === childId) || childId.startsWith('demo_');
    if (!isOwner) return res.status(403).json({ error: 'Not your child' });

    const childActivities = activities.filter(a => a.childId === childId);
    if (childActivities.length === 0) {
      // نمونه
      return res.json([
        { id: 'a1', childId, type: 'stationReservation', at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), title: 'رزرو PC-07', detail: '120 دقیقه - Valorant', durationMinutes: 120, amount: 150000 },
        { id: 'a2', childId, type: 'cafeOrder', at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), title: 'سفارش بوفه', detail: 'ساندویچ + آبمیوه', amount: 95000 },
      ]);
    }
    res.json(childActivities);
  });

  // دریافت محدودیت‌ها
  app.get('/api/parent/settings/:childId', requireAuth, async (req: Request, res: Response) => {
    const { childId } = req.params;
    const limits = childLimitsMap.get(childId) || defaultLimits();
    res.json(limits);
  });

  // ذخیره محدودیت‌ها
  app.put('/api/parent/settings/:childId', requireAuth, async (req: Request, res: Response) => {
    const { childId } = req.params;
    const user = (req as any).user;
    const isOwner = parentChildLinks.some(l => l.parentUsername === user.username && l.childUsername === childId) || childId.startsWith('demo_');
    if (!isOwner) return res.status(403).json({ error: 'Not your child' });

    const newLimits: ChildLimits = {
      dailyMinutesLimit: req.body.dailyMinutesLimit ?? 180,
      dailySpendingLimit: req.body.dailySpendingLimit ?? 500000,
      allowedGames: req.body.allowedGames ?? [],
      blockedGames: req.body.blockedGames ?? [],
      allowedFrom: req.body.allowedFrom ?? '14:00',
      allowedTo: req.body.allowedTo ?? '21:00',
      requireApprovalForCafe: req.body.requireApprovalForCafe ?? true,
      requireApprovalForTournaments: req.body.requireApprovalForTournaments ?? true,
      requireApprovalForGameSelection: req.body.requireApprovalForGameSelection ?? true,
    };
    childLimitsMap.set(childId, newLimits);
    res.json({ success: true, limits: newLimits });
  });

  // ---- Child side: ایجاد درخواست نیازمند تایید والد ----
  // این endpoint توسط اپ فرزند یا وب‌سایت هنگام رزرو/سفارش صدا زده می‌شود
  // اگر فرزند لینک والد داشته باشد و محدودیت requireApproval فعال باشد، درخواست pending ساخته می‌شود
  app.post('/api/parent/requests/create', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user; // فرزند
    const { type, payload } = req.body as { type: RequestType; payload: any };
    if (!type || !payload) return res.status(400).json({ error: 'type and payload required' });

    // پیدا کردن والدین این فرزند
    const parents = parentChildLinks.filter(l => l.childUsername === user.username);
    if (parents.length === 0) {
      // والد ندارد - درخواست مستقیم نهایی می‌شود
      return res.json({ success: true, requiresParentApproval: false, message: 'No parent linked, proceeding directly' });
    }

    // بررسی محدودیت‌ها
    const limits = childLimitsMap.get(user.username) || defaultLimits();
    let requiresApproval = false;
    if (type === 'cafeOrder' && limits.requireApprovalForCafe) requiresApproval = true;
    if (type === 'tournamentJoin' && limits.requireApprovalForTournaments) requiresApproval = true;
    if (type === 'gameSelection' && limits.requireApprovalForGameSelection) requiresApproval = true;
    if (type === 'stationReservation') requiresApproval = true; // رزرو همیشه نیاز به تایید والد (برای کودکان)

    if (!requiresApproval) {
      return res.json({ success: true, requiresParentApproval: false });
    }

    // ساخت درخواست برای هر والد (معمولا یکی)
    const created: ApprovalRequest[] = [];
    for (const parent of parents) {
      const reqItem: ApprovalRequest = {
        id: generateId('req_'),
        childId: user.username,
        childName: user.displayName || user.username,
        parentUsername: parent.parentUsername,
        type,
        status: 'pending',
        createdAt: new Date().toISOString(),
        payload,
      };
      approvalRequests.push(reqItem);
      created.push(reqItem);
    }

    res.json({ success: true, requiresParentApproval: true, requests: created });
  });

  console.log('[Parent API] Parent routes registered: /api/parent/*');
}
