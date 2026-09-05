import { WalletConsole } from '../../../shared/management/Wallet';
import { useOps } from '../../../shared/management/context';
import { StationRegistry, AccessManager } from '../../../shared/management/Registry';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Tag, HelpCircle } from 'lucide-react';
import { Station, StationType, BuffetItem, Customer, TariffRate, ShopExpense, Invoice, Operator, AppTheme, SoundAlarmConfig, CurrencyCode, WalletTransaction, ServiceItem, PaymentType, BackupSettings, WebSyncStatus, StationStatus } from './types';
import { INITIAL_STATIONS, INITIAL_BUFFET_ITEMS, INITIAL_CUSTOMERS, INITIAL_TARIFFS, INITIAL_EXPENSES, INITIAL_OPERATORS, THEMES_LIST, DEFAULT_SOUND_CONFIG } from './data/mockData';
import { playAlarmSound } from './utils/audio';
import { useSavedValue, PERSIST_DEBOUNCE_MS } from './hooks/useSavedValue';
import { safeGetStorage, safeSetStorage, safeRemoveStorage } from './utils/storage';
import { calculateCustomerRank, getBirthdayFlags } from './utils/formatters';
import { applyAppTheme } from './utils/theme';
import { buildSyncUrl, syncHeaders } from './utils/syncClient';

import { Header } from './components/Header';
import VisualHelpGuide, { HelpSection } from './components/VisualHelpGuide';
import { StationCard } from './components/StationCard';
import { StationModal } from './components/StationModal';
import { CheckoutModal } from './components/CheckoutModal';
import { AddBuffetServicesModal } from './components/AddBuffetServicesModal';
import { TransferStationModal } from './components/TransferStationModal';
import { ChangeTariffModal } from './components/ChangeTariffModal';
import { BuffetManagement } from './components/BuffetManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { AccountingReports } from './components/AccountingReports';
import { OperatorPermissionsComponent } from './components/OperatorPermissions';
import { SettingsThemesModal } from './components/SettingsThemesModal';
import { WebSyncModal } from './components/WebSyncModal';
import { ManageStationModal } from './components/ManageStationModal';
import { ManageTariffsModal } from './components/ManageTariffsModal';
import { HardwareRelayModal } from './components/HardwareRelayModal';
import { WebWalletPanel } from './components/WebWalletPanel';
import { enqueueWalletOp, flushWalletQueue, attachAffiliateCode } from './utils/walletSync';

export default function App() {
  const { staff, logout } = useOps();
  // Application Data States (Persisted safely in local storage & server-side)
  const [stations, setStations] = useState<Station[]>(() => safeGetStorage('bazino_stations', INITIAL_STATIONS));
  const [buffetItems, setBuffetItems] = useState<BuffetItem[]>(() => safeGetStorage('bazino_buffet', INITIAL_BUFFET_ITEMS));
  const [customers, setCustomers] = useState<Customer[]>(() => safeGetStorage('bazino_customers', INITIAL_CUSTOMERS));
  const [tariffs, setTariffs] = useState<TariffRate[]>(() => safeGetStorage('bazino_tariffs', INITIAL_TARIFFS));
  const [expenses, setExpenses] = useState<ShopExpense[]>(() => safeGetStorage('bazino_expenses', INITIAL_EXPENSES));
  const [invoices, setInvoices] = useState<Invoice[]>(() => safeGetStorage('bazino_invoices', []));
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => safeGetStorage('bazino_wallet_tx', []));
  const [operators, setOperators] = useState<Operator[]>(() => safeGetStorage('bazino_operators', INITIAL_OPERATORS));

  const [activeOperator, setActiveOperator] = useState<Operator>(operators[0] || INITIAL_OPERATORS[0]);

  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => safeGetStorage('bazino_theme', THEMES_LIST[0]));
  const [soundConfig, setSoundConfig] = useState<SoundAlarmConfig>(() => safeGetStorage('bazino_sound', DEFAULT_SOUND_CONFIG));

  const [currency, setCurrency] = useState<CurrencyCode>('TRY');

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() =>
    safeGetStorage('bazino_backup_settings', { autoDailyBackup: true })
  );
  // Item #27: tracks the last calendar date `totalServiceHoursToday` was reset for, so a
  // fresh day always starts every station's counter back at 0.
  const [lastServiceHoursResetDate, setLastServiceHoursResetDate] = useState<string>(() =>
    safeGetStorage('bazino_service_hours_reset_date', new Date().toISOString().split('T')[0])
  );
  const [webSyncStatus, setWebSyncStatus] = useState<WebSyncStatus>(() =>
    safeGetStorage('bazino_web_sync_status', {
      isConnected: false,
      lastSyncTime: undefined,
      pendingTransactionsCount: 0,
      webServerUrl: '',
      apiKey: '',
    })
  );

  // UI Active View Tabs
  const [activeTab, setActiveTab] = useState<'stations' | 'buffet' | 'customers' | 'accounting' | 'operators' | 'settings'>('stations');

  // Station Filter State
  const [stationFilter, setStationFilter] = useState<string>('ALL');

  // Modals Active Targets
  const [modalStartStation, setModalStartStation] = useState<Station | null>(null);
  const [modalCheckoutStation, setModalCheckoutStation] = useState<Station | null>(null);
  const [modalBuffetStation, setModalBuffetStation] = useState<Station | null>(null);
  const [modalTransferStation, setModalTransferStation] = useState<Station | null>(null);
  const [modalTariffStation, setModalTariffStation] = useState<Station | null>(null);
  const [showWebSyncModal, setShowWebSyncModal] = useState(false);

  // Manage Stations & Tariffs & Hardware Modals
  const [showManageStationModal, setShowManageStationModal] = useState(false);
  const [editingStationTarget, setEditingStationTarget] = useState<Station | null>(null);
  const [showManageTariffsModal, setShowManageTariffsModal] = useState(false);
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [helpGuideSection, setHelpGuideSection] = useState<HelpSection | undefined>(undefined);

  // ارجاع پایدار: اگر این یک arrow inline بماند، هر رندرِ App یک تابع تازه می‌سازد و
  // memo روی StationCard بی‌اثر می‌شود. بقیه‌ی هندلرها مستقیماً همان setState هستند که
  // React تضمین می‌کند مرجعشان ثابت بماند.
  const handleEditStation = useCallback((st: Station) => {
    setEditingStationTarget(st);
    setShowManageStationModal(true);
  }, []);

  // Persistence Sync
  //
  // قبلاً همه‌ی این‌ها در یک افکت با سیزده وابستگی بودند، پس تغییر هر کدام باعث بازنویسی
  // *همه‌ی* کلیدها و یک POST کامل می‌شد — و چون تیک ثانیه‌شمار هم `stations` را عوض می‌کرد،
  // این اتفاق هر ثانیه می‌افتاد. حالا سه تفکیک اعمال شده:
  //   ۱) هر داده کلید خودش را دارد و فقط وقتی خودش عوض شود نوشته می‌شود،
  //   ۲) نوشتن در localStorage فقط وقتی محتوای serialize‌شده واقعاً فرق کرده باشد،
  //   ۳) POST به سرور با تأخیر جمع‌بندی می‌شود تا رگبار تغییرات یک درخواست شود.
  useSavedValue('bazino_stations', stations);
  useSavedValue('bazino_buffet', buffetItems);
  useSavedValue('bazino_customers', customers);
  useSavedValue('bazino_tariffs', tariffs);
  useSavedValue('bazino_expenses', expenses);
  useSavedValue('bazino_invoices', invoices);
  useSavedValue('bazino_wallet_tx', walletTransactions);
  useSavedValue('bazino_operators', operators);
  useSavedValue('bazino_theme', currentTheme);
  useSavedValue('bazino_sound', soundConfig);
  useSavedValue('bazino_backup_settings', backupSettings);
  useSavedValue('bazino_service_hours_reset_date', lastServiceHoursResetDate);
  useSavedValue('bazino_web_sync_status', webSyncStatus);

  // Save state to the Express backend for power-outage resilience.
  // Debounced, and skipped entirely when the payload is byte-identical to the last one
  // we sent — an idle club should generate zero traffic.
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    const payload = JSON.stringify({ stations, buffetItems, customers, invoices });
    if (payload === lastPushedRef.current) return;

    const id = setTimeout(() => {
      lastPushedRef.current = payload;
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {
        // شکست شبکه یعنی این محتوا هنوز روی سرور نیست — علامت را پس می‌گیریم تا
        // تغییر بعدی دوباره تلاش کند و داده‌ی اپراتور بی‌صدا از دست نرود.
        lastPushedRef.current = '';
      });
    }, PERSIST_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [stations, buffetItems, customers, invoices]);

  // Recompute birthday flags for every customer on each render of `customers` (Item #17)
  const customersWithBirthdayFlags = useMemo<Customer[]>(() => {
    const now = new Date();
    return customers.map((c) => {
      const { isBirthdayToday, isBirthdayThisMonth } = getBirthdayFlags(c.birthDate, now);
      return { ...c, isBirthdayToday, isBirthdayThisMonth };
    });
  }, [customers]);

  // Apply the selected graphic theme app-wide by overriding the CSS variables every
  // amber/yellow/zinc Tailwind utility class resolves to (Item #12).
  useEffect(() => {
    applyAppTheme(currentTheme);
  }, [currentTheme]);

  // Item #27: reset every station's `totalServiceHoursToday` back to 0 whenever the
  // calendar date changes. Checked once on mount and every minute after that (so it fires
  // shortly after midnight even if the app was left open overnight). Uses the functional
  // form of setStations so this effect doesn't need `stations` in its dependency array —
  // no stale-closure risk here, unlike a naive version of this check would have.
  useEffect(() => {
    const checkAndResetServiceHours = () => {
      const todayKey = new Date().toISOString().split('T')[0];
      if (todayKey === lastServiceHoursResetDate) return;
      setStations((prev) => prev.map((st) => ({ ...st, totalServiceHoursToday: 0 })));
      setLastServiceHoursResetDate(todayKey);
    };

    checkAndResetServiceHours();
    const resetTimer = setInterval(checkAndResetServiceHours, 60 * 1000);
    return () => clearInterval(resetTimer);
  }, [lastServiceHoursResetDate]);

  // Master Timer Tick Interval (Runs every 1 second)
  //
  // این تیک قبلاً بی‌قید `prevStations.map(...)` را برمی‌گرداند، پس حتی وقتی هیچ ایستگاهی
  // در حال بازی نبود هم یک آرایه‌ی *جدید* تحویل React می‌داد. مرجع جدید یعنی وابستگی
  // `stations` عوض شده، و افکت ذخیره‌سازی هر ثانیه اجرا می‌شد: ۱۱ نوشتن همگام در
  // localStorage به‌علاوه‌ی یک POST پنج‌کیلوبایتی. اندازه‌گیری‌شده در حالت کاملاً بی‌کار:
  // ۱۵ درخواست در ۱۵ ثانیه، و افت نرخ فریم به ۳٫۳ (سایت اصلی روی همان مرورگر ۶۰).
  //
  // حالا اگر هیچ ایستگاهی تغییر نکرده باشد، دقیقاً همان مرجع قبلی برگردانده می‌شود و
  // React اصلاً رندر نمی‌کند.
  useEffect(() => {
    const timer = setInterval(() => {
      setStations((prevStations) => {
        let changed = false;
        const nextStations = prevStations.map((st) => {
          if (st.status === 'PLAYING' && st.activeSession && !st.activeSession.isPaused) {
            const nextElapsed = st.activeSession.elapsedSeconds + 1;
            let nextStatus: StationStatus = st.status;
            let nextLastAlarmAt = st.activeSession.lastAlarmAt;

            if (st.activeSession.durationMinutes) {
              const totalAllowed = st.activeSession.durationMinutes * 60;
              if (nextElapsed >= totalAllowed) {
                nextStatus = 'FINISHED';
                // Trigger Alarm Sound! (first ring the moment it finishes)
                if (soundConfig.enabled) {
                  playAlarmSound(soundConfig.soundType, soundConfig.volume);
                }
                nextLastAlarmAt = Date.now();
              } else if (totalAllowed - nextElapsed <= 5 * 60) {
                nextStatus = 'WARNING';
              }
            }

            changed = true;
            return {
              ...st,
              status: nextStatus,
              activeSession: {
                ...st.activeSession,
                elapsedSeconds: nextElapsed,
                lastAlarmAt: nextLastAlarmAt,
              },
            };
          }

          // Item #3: repeat the alarm every soundConfig.repeatIntervalSeconds
          // for as long as the station sits in FINISHED (not checked out yet).
          if (st.status === 'FINISHED' && st.activeSession) {
            const lastAt = st.activeSession.lastAlarmAt ?? st.activeSession.startTime;
            const dueForRepeat = Date.now() - lastAt >= soundConfig.repeatIntervalSeconds * 1000;
            if (dueForRepeat) {
              if (soundConfig.enabled) {
                playAlarmSound(soundConfig.soundType, soundConfig.volume);
              }
              changed = true;
              return {
                ...st,
                activeSession: {
                  ...st.activeSession,
                  lastAlarmAt: Date.now(),
                },
              };
            }
            return st;
          }

          return st;
        });

        // مرجع قبلی = بدون re-render. کل صرفه‌جویی همین یک خط است.
        return changed ? nextStations : prevStations;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [soundConfig]);

  // Handlers for Session Life Cycle
  const handleConfirmStartSession = ({
    stationId,
    tariffId,
    customerId,
    customerName,
    durationMinutes,
    paidAmountTarget,
    paymentType,
    customHourlyRate,
  }: {
    stationId: string;
    tariffId: string;
    customerId?: string;
    customerName?: string;
    durationMinutes?: number;
    paidAmountTarget?: number;
    paymentType: PaymentType;
    customHourlyRate?: number;
  }) => {
    const tariff = tariffs.find((t) => t.id === tariffId) || tariffs[0];
    const finalRate = customHourlyRate || tariff.hourlyRate;

    setStations((prev) =>
      prev.map((st) => {
        if (st.id === stationId) {
          return {
            ...st,
            status: 'PLAYING',
            currentTariffId: tariffId,
            activeSession: {
              sessionId: `sess-${Date.now()}`,
              stationId,
              customerId,
              customerName,
              startTime: Date.now(),
              durationMinutes,
              paidAmountTarget,
              paymentType,
              tariffId,
              currentHourlyRate: finalRate,
              elapsedSeconds: 0,
              pausedSeconds: 0,
              isPaused: false,
              services: [],
            },
          };
        }
        return st;
      })
    );

    setModalStartStation(null);
  };

  const handlePauseResume = (stationId: string) => {
    setStations((prev) =>
      prev.map((st) => {
        if (st.id === stationId && st.activeSession) {
          const isCurrentlyPaused = st.activeSession.isPaused;
          return {
            ...st,
            status: isCurrentlyPaused ? 'PLAYING' : 'PAUSED',
            activeSession: {
              ...st.activeSession,
              isPaused: !isCurrentlyPaused,
            },
          };
        }
        return st;
      })
    );
  };

  const handleConfirmCheckout = (invoice: Invoice) => {
    // 1. Add invoice record
    setInvoices((prev) => [invoice, ...prev]);

    // 2. If services/buffet were consumed, deduct stock
    const targetStation = stations.find((s) => s.id === invoice.stationId);
    if (targetStation?.activeSession?.services) {
      targetStation.activeSession.services.forEach((s) => {
        setBuffetItems((prevBuffet) =>
          prevBuffet.map((item) => {
            if (item.id === s.id) {
              return {
                ...item,
                stockQuantity: Math.max(0, item.stockQuantity - s.qty),
                soldQuantity: item.soldQuantity + s.qty,
              };
            }
            return item;
          })
        );
      });
    }

    // 3. If the customer paid with wallet credit, actually deduct it (this used
    // to be recorded on the invoice but never touched the real balance)
    if (invoice.walletPaid > 0 && invoice.customerId) {
      handleUpdateWallet(
        invoice.customerId,
        invoice.walletPaid,
        'PAYMENT',
        `پرداخت فاکتور ${invoice.id} (${invoice.stationName})`
      );
    }

    // 4. Update the customer's real accumulated play hours and re-derive their
    // loyalty rank from it (rank used to be a static field that never changed)
    if (invoice.customerId) {
      const playedHours = invoice.playDurationMinutes / 60;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== invoice.customerId) return c;
          const newTotalHours = Math.round((c.totalHoursPlayed + playedHours) * 10) / 10;
          return { ...c, totalHoursPlayed: newTotalHours, rank: calculateCustomerRank(newTotalHours) };
        })
      );
    }

    // 5. Reset station to IDLE
    setStations((prev) =>
      prev.map((st) => {
        if (st.id === invoice.stationId) {
          const playedHours = invoice.playDurationMinutes / 60;
          return {
            ...st,
            status: 'IDLE',
            activeSession: undefined,
            totalServiceHoursToday: Math.round((st.totalServiceHoursToday + playedHours) * 10) / 10,
          };
        }
        return st;
      })
    );

    setModalCheckoutStation(null);
  };

  const handleConfirmAddServices = (stationId: string, servicesToAdd: ServiceItem[]) => {
    setStations((prev) =>
      prev.map((st) => {
        if (st.id === stationId && st.activeSession) {
          return {
            ...st,
            activeSession: {
              ...st.activeSession,
              services: [...st.activeSession.services, ...servicesToAdd],
            },
          };
        }
        return st;
      })
    );
    setModalBuffetStation(null);
  };

  const handleConfirmTransferStation = (sourceId: string, targetId: string) => {
    const sourceStation = stations.find((s) => s.id === sourceId);
    if (!sourceStation || !sourceStation.activeSession) return;

    const sessionToMove = { ...sourceStation.activeSession, stationId: targetId };

    setStations((prev) =>
      prev.map((st) => {
        if (st.id === sourceId) {
          return { ...st, status: 'IDLE', activeSession: undefined };
        }
        if (st.id === targetId) {
          return { ...st, status: 'PLAYING', activeSession: sessionToMove };
        }
        return st;
      })
    );

    setModalTransferStation(null);
  };

  const handleConfirmChangeTariff = (stationId: string, newTariffId: string) => {
    const tariff = tariffs.find((t) => t.id === newTariffId) || tariffs[0];

    setStations((prev) =>
      prev.map((st) => {
        if (st.id === stationId) {
          if (!st.activeSession) {
            return { ...st, currentTariffId: newTariffId };
          }

          // Bank the cost of the time segment already played at the OLD rate
          // before switching, so the final invoice bills each segment at the
          // rate that was actually in effect for it (not the whole session
          // at only the newest rate).
          const prevAccrued = st.activeSession.costAccruedBeforeRateChange || 0;
          const prevEffectiveFrom = st.activeSession.rateEffectiveFromSeconds || 0;
          const secondsAtOldRate = Math.max(0, st.activeSession.elapsedSeconds - prevEffectiveFrom);
          const costAtOldRate = Math.round((secondsAtOldRate / 3600) * st.activeSession.currentHourlyRate);

          return {
            ...st,
            currentTariffId: newTariffId,
            activeSession: {
              ...st.activeSession,
              tariffId: newTariffId,
              currentHourlyRate: tariff.hourlyRate,
              costAccruedBeforeRateChange: prevAccrued + costAtOldRate,
              rateEffectiveFromSeconds: st.activeSession.elapsedSeconds,
            },
          };
        }
        return st;
      })
    );

    setModalTariffStation(null);
  };

  // Buffet / Stock Handlers
  const handleAddBuffetItem = (item: Omit<BuffetItem, 'id' | 'soldQuantity'>) => {
    const newItem: BuffetItem = {
      ...item,
      id: `buf-${Date.now()}`,
      soldQuantity: 0,
    };
    setBuffetItems((prev) => [newItem, ...prev]);
  };

  const handleUpdateStock = (itemId: string, newStock: number) => {
    setBuffetItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, stockQuantity: newStock } : i))
    );
  };

  // Customer Handlers
  const handleAddCustomer = (c: Omit<Customer, 'id' | 'rank' | 'registeredAt'>) => {
    const newCust: Customer = {
      ...c,
      id: `cust-${Date.now()}`,
      rank: calculateCustomerRank(c.totalHoursPlayed || 0),
      registeredAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [newCust, ...prev]);
  };

  const handleUpdateWallet = (
    customerId: string,
    amount: number,
    type: 'CHARGE' | 'PAYMENT' | 'DEBT_SETTLEMENT' | 'BONUS_DISCOUNT' | 'CASHOUT',
    description: string
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    // CHARGE / DEBT_SETTLEMENT / BONUS_DISCOUNT → موجودی بالا؛ PAYMENT و CASHOUT → پایین.
    const delta = (type === 'PAYMENT' || type === 'CASHOUT') ? -amount : amount;

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, walletBalance: c.walletBalance + delta } : c))
    );

    const newTx: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      customerId,
      customerName: customer.name,
      amount: delta,
      type,
      description,
      date: new Date().toISOString(),
      operatorName: activeOperator.name,
    };
    setWalletTransactions((prev) => [newTx, ...prev]);

    // تسک ۱۳: آینهٔ تراکنش روی سرور سایت (منبع حقیقت). BONUS_DISCOUNT شارژ محلی است و به سایت نمی‌رود.
    if (customer.phone && type !== 'BONUS_DISCOUNT') {
      enqueueWalletOp({
        type: type === 'CASHOUT' ? 'cashout' : (delta >= 0 ? 'topup' : 'charge'),
        phone: customer.phone,
        amount: Math.abs(delta),
        operator: activeOperator.name,
        note: description,
      });
      void flushWalletQueue({ webServerUrl: webSyncStatus.webServerUrl, apiKey: webSyncStatus.apiKey })
        .then(r => setWebSyncStatus(prev => ({ ...prev, walletQueueCount: r.remaining.length, isConnected: r.failed === 0 ? true : prev.isConnected })))
        .catch(() => {});
    }
  };

  // Expense Handler
  const handleAddExpense = (expense: Omit<ShopExpense, 'id'>) => {
    const newExp: ShopExpense = { ...expense, id: `exp-${Date.now()}` };
    setExpenses((prev) => [newExp, ...prev]);
  };

  // Operator Permissions Toggle
  const handleTogglePermission = (operatorId: string, permissionKey: keyof Operator['permissions']) => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id === operatorId) {
          return {
            ...op,
            permissions: {
              ...op.permissions,
              [permissionKey]: !op.permissions[permissionKey],
            },
          };
        }
        return op;
      })
    );
  };

  // Export & Import Backup JSON
  const buildBackupPayload = () => ({ stations, buffetItems, customers, tariffs, expenses, invoices, operators });

  const handleExportBackupJSON = () => {
    const data = buildBackupPayload();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BAZINO_PRO_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Item #23: automatic daily backup. Browsers block/annoy users with automatic file
  // downloads that aren't triggered by a real click, so instead of downloading a file we
  // save a dated JSON snapshot into localStorage (kept for the last 7 days) and record
  // `lastBackupTime`. The manual "دانلود خروجی پشتیبان" button above still triggers a real
  // file download, for whenever the user wants an off-device copy.
  const handleAutoBackup = () => {
    const dateKey = new Date().toISOString().split('T')[0];
    const storageKey = `bazino_auto_backup_${dateKey}`;
    const data = buildBackupPayload();
    const saved = safeSetStorage(storageKey, data);
    if (!saved) return; // storage full/unavailable — don't falsely mark it as backed up

    const index = safeGetStorage<string[]>('bazino_auto_backup_index', []);
    const nextIndex = [...index.filter((k) => k !== storageKey), storageKey];
    // Keep only the 7 most recent daily snapshots so localStorage doesn't grow unbounded.
    while (nextIndex.length > 7) {
      const oldestKey = nextIndex.shift();
      if (oldestKey) safeRemoveStorage(oldestKey);
    }
    safeSetStorage('bazino_auto_backup_index', nextIndex);

    setBackupSettings((prev) => ({ ...prev, lastBackupTime: new Date().toISOString() }));
  };

  // `backupSettings.lastBackupTime` only changes once every ~24h, so the effect below only
  // re-subscribes that rarely — if `handleAutoBackup` were called directly from the
  // interval, it would stay bound to whatever `stations`/`customers`/etc. looked like at
  // that last subscription, and the eventual backup would snapshot stale (up to a day old)
  // data instead of the current state. Routing the call through a ref that's refreshed on
  // every render keeps it pointed at the latest closure without needing the interval effect
  // itself to restart every second.
  const handleAutoBackupRef = useRef(handleAutoBackup);
  handleAutoBackupRef.current = handleAutoBackup;

  // Checks (every minute) whether 24h have passed since the last automatic backup and, if
  // so and auto-backup is enabled, performs one. Also checks once right on mount.
  useEffect(() => {
    const checkAndRunAutoBackup = () => {
      if (!backupSettings.autoDailyBackup) return;
      const last = backupSettings.lastBackupTime ? new Date(backupSettings.lastBackupTime).getTime() : 0;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (Date.now() - last >= twentyFourHoursMs) {
        handleAutoBackupRef.current();
      }
    };

    checkAndRunAutoBackup();
    const backupTimer = setInterval(checkAndRunAutoBackup, 60 * 1000);
    return () => clearInterval(backupTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupSettings.autoDailyBackup, backupSettings.lastBackupTime]);

  const handleImportBackupJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.stations) setStations(parsed.stations);
      if (parsed.buffetItems) setBuffetItems(parsed.buffetItems);
      if (parsed.customers) setCustomers(parsed.customers);
      if (parsed.invoices) setInvoices(parsed.invoices);
      alert('اطلاعات پشتیبان با موفقیت بازنشانی شد.');
    } catch {
      alert('خطا در خواندن فایل پشتیبان!');
    }
  };

  // Station Definition & Management Handlers
  const handleSaveStation = (data: {
    id?: string;
    name: string;
    type: StationType;
    icon: string;
    currentTariffId: string;
  }) => {
    if (data.id) {
      setStations((prev) =>
        prev.map((s) =>
          s.id === data.id
            ? { ...s, name: data.name, type: data.type, icon: data.icon, currentTariffId: data.currentTariffId }
            : s
        )
      );
    } else {
      const newStation: Station = {
        id: `st-${Date.now()}`,
        name: data.name,
        type: data.type,
        status: 'IDLE',
        icon: data.icon,
        currentTariffId: data.currentTariffId,
        activeSession: undefined,
        totalServiceHoursToday: 0,
      };
      setStations((prev) => [...prev, newStation]);
    }
    setShowManageStationModal(false);
    setEditingStationTarget(null);
  };

  const handleDeleteStation = (stationId: string) => {
    setStations((prev) => prev.filter((s) => s.id !== stationId));
  };

  // Tariff Management Handlers
  const handleAddTariff = (tariffData: Omit<TariffRate, 'id'>) => {
    const newTariff: TariffRate = { ...tariffData, id: `t-${Date.now()}` };
    setTariffs((prev) => [...prev, newTariff]);
  };

  const handleUpdateTariff = (updatedTariff: TariffRate) => {
    setTariffs((prev) => prev.map((t) => (t.id === updatedTariff.id ? updatedTariff : t)));
  };

  const handleDeleteTariff = (tariffId: string) => {
    setTariffs((prev) => prev.filter((t) => t.id !== tariffId));
  };

  // Filtered Stations
  const filteredStations = stations.filter((s) => {
    if (stationFilter === 'ALL') return true;
    return s.type === stationFilter;
  });

  // Calculations for Header
  const activeStationsCount = stations.filter((s) => s.status !== 'IDLE').length;
  const todayTotalRevenue = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const birthdayCountToday = customersWithBirthdayFlags.filter((c) => c.isBirthdayToday).length;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-black font-['Vazirmatn'] safe-area-top safe-area-bottom safe-area-left safe-area-right ios-scroll-touch">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOperator={activeOperator}
        operators={operators}
        onSwitchOperator={() => logout()}
        soundConfig={soundConfig}
        onToggleSound={() => setSoundConfig({ ...soundConfig, enabled: !soundConfig.enabled })}
        currentTheme={currentTheme}
        onOpenThemesModal={() => setActiveTab('settings')}
        currency={currency}
        onChangeCurrency={(c) => setCurrency(c)}
        webSyncConnected={webSyncStatus.isConnected}
        pendingReservationsCount={webSyncStatus.pendingTransactionsCount}
        onOpenWebSyncModal={() => setShowWebSyncModal(true)}
        todayTotalRevenue={todayTotalRevenue}
        activeStationsCount={activeStationsCount}
        totalStationsCount={stations.length}
        birthdayCountToday={birthdayCountToday}
        onOpenHardwareModal={() => setShowHardwareModal(true)}
        onOpenHelpGuide={() => { setHelpGuideSection(undefined); setShowHelpGuide(true); }}
      />

      <div className="ops max-w-7xl mx-auto px-4 pt-3"><div className="ops-row"><span className="ops-small ops-muted">حساب تأییدشده: {staff?.displayName} · مرجع عملیات: سرور · POS: ثبت دستی</span><button className="ops-quiet" onClick={logout}>خروج / تغییر کاربر</button></div></div>
      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Context-aware section guide bar — jumps the help modal straight to whichever tab is active */}
        <div className="mb-4 p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-400">
            <span className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg">
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
            <span>
              راهنمای بخش «
              {
                {
                  stations: 'ایستگاه‌ها',
                  buffet: 'بوفه',
                  customers: 'مشتریان',
                  accounting: 'حسابداری',
                  operators: 'اپراتورها',
                  settings: 'تنظیمات',
                }[activeTab]
              }
              » رو نیاز دارید؟
            </span>
          </div>
          <button
            onClick={() => { setHelpGuideSection(activeTab); setShowHelpGuide(true); }}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-[11px] font-bold transition-colors"
          >
            نمایش راهنما
          </button>
        </div>

        {/* Stations Grid View */}
        {activeTab === 'stations' && (
          <div className="space-y-4">
            {/* Station Action & Filter Bar */}
            <div className="p-4 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-400 font-semibold ml-1">فیلتر ایستگاه‌ها:</span>
                {[
                  { key: 'ALL', label: 'همه ایستگاه‌ها' },
                  { key: 'PS5_VIP', label: 'PS5 VIP' },
                  { key: 'PS5_REGULAR', label: 'PS5 معمولی' },
                  { key: 'PC_GAMING', label: 'PC Gaming' },
                  { key: 'VR', label: 'واقعیت مجازی VR' },
                  { key: 'BILLIARDS', label: 'بیلیارد' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStationFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      stationFilter === f.key
                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManageTariffsModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Tag className="w-4 h-4" />
                  <span>مدیریت تعرفه‌ها ({tariffs.length})</span>
                </button>

                <button
                  onClick={() => {
                    setEditingStationTarget(null);
                    setShowManageStationModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-200 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف ایستگاه جدید</span>
                </button>
              </div>
            </div>

            {/* Stations Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  tariffs={tariffs}
                  currency={currency}
                  onStartSession={setModalStartStation}
                  onPauseResume={handlePauseResume}
                  onChangeTariffMidGame={setModalTariffStation}
                  onTransferStation={setModalTransferStation}
                  onAddBuffetServices={setModalBuffetStation}
                  onCheckoutSession={setModalCheckoutStation}
                  onEditStation={handleEditStation}
                />
              ))}
            </div>
          </div>
        )}

        {/* Buffet View */}
        {activeTab === 'buffet' && (
          <BuffetManagement
            buffetItems={buffetItems}
            currency={currency}
            onAddBuffetItem={handleAddBuffetItem}
            onUpdateStock={handleUpdateStock}
            canManageStock={activeOperator.permissions.canManageBuffetStock}
          />
        )}

        {/* Wallets and cash-outs use the authoritative server ledger, never a local balance. */}
        {activeTab === 'customers' && <WalletConsole />}

        {/* Accounting Reports View */}
        {activeTab === 'accounting' && activeOperator.permissions.canAccessReports && (
          <AccountingReports
            invoices={invoices}
            expenses={expenses}
            stations={stations}
            currency={currency}
            onAddExpense={handleAddExpense}
            canManageExpenses={activeOperator.permissions.canManageExpenses}
          />
        )}

        {/* Operators & Roles View */}
        {activeTab === 'operators' && activeOperator.permissions.canManageOperators && (
          <OperatorPermissionsComponent
            operators={operators}
            onTogglePermission={handleTogglePermission}
          />
        )}

        {/* Settings & Themes View */}
        {activeTab === 'settings' && <div className="mb-8"><StationRegistry localStations={stations.map(st => ({ id: st.id, name: st.name, type: st.type, hourlyRate: tariffs.find(t => t.id === st.currentTariffId)?.hourlyRate || 0 }))} /></div>}
        {activeTab === 'operators' && <div className="mb-8"><AccessManager /></div>}
        {activeTab === 'settings' && (
          <SettingsThemesModal
            currentTheme={currentTheme}
            onSelectTheme={(theme) => setCurrentTheme(theme)}
            soundConfig={soundConfig}
            onUpdateSoundConfig={(cfg) => setSoundConfig(cfg)}
            backupSettings={backupSettings}
            onUpdateBackupSettings={(b) => setBackupSettings(b)}
            onExportBackupJSON={handleExportBackupJSON}
            onImportBackupJSON={handleImportBackupJSON}
          />
        )}
      </main>

      {/* Modals Container */}
      {modalStartStation && (
        <StationModal
          station={modalStartStation}
          tariffs={tariffs}
          customers={customersWithBirthdayFlags}
          currency={currency}
          onClose={() => setModalStartStation(null)}
          onConfirmStart={handleConfirmStartSession}
        />
      )}

      {modalCheckoutStation && (
        <CheckoutModal
          station={modalCheckoutStation}
          customers={customersWithBirthdayFlags}
          currency={currency}
          operatorName={activeOperator.name}
          onClose={() => setModalCheckoutStation(null)}
          onConfirmCheckout={handleConfirmCheckout}
        />
      )}

      {modalBuffetStation && (
        <AddBuffetServicesModal
          station={modalBuffetStation}
          buffetItems={buffetItems}
          currency={currency}
          onClose={() => setModalBuffetStation(null)}
          onConfirmAddServices={handleConfirmAddServices}
        />
      )}

      {modalTransferStation && (
        <TransferStationModal
          sourceStation={modalTransferStation}
          allStations={stations}
          onClose={() => setModalTransferStation(null)}
          onConfirmTransfer={handleConfirmTransferStation}
        />
      )}

      {modalTariffStation && (
        <ChangeTariffModal
          station={modalTariffStation}
          tariffs={tariffs}
          currency={currency}
          onClose={() => setModalTariffStation(null)}
          onConfirmChangeTariff={handleConfirmChangeTariff}
        />
      )}

      {showWebSyncModal && (
        <WebSyncModal
          status={webSyncStatus}
          onClose={() => setShowWebSyncModal(false)}
          onUpdateSyncSettings={(next) => setWebSyncStatus(next)}
          onTriggerSync={async () => {
            try {
              const res = await fetch(buildSyncUrl(webSyncStatus.webServerUrl, '/api/sync/webservice'), {
                method: 'POST',
                headers: syncHeaders(webSyncStatus.apiKey, true),
                body: JSON.stringify({
                  action: 'MANUAL_TRIGGER_SYNC',
                  station_id: 'BAZINO_CLIENT_01',
                  stations: stations.map(s => ({ id: s.id, name: s.name, status: s.status })),
                  active_stations_count: stations.filter(s => s.status === 'PLAYING').length,
                  total_revenue_today: invoices.reduce((acc, inv) => acc + inv.totalAmount, 0),
                  timestamp: new Date().toISOString()
                })
              });
              if (res.ok) {
                const data = await res.json();
                setWebSyncStatus({
                  ...webSyncStatus,
                  isConnected: true,
                  lastSyncTime: new Date().toLocaleTimeString('fa-IR'),
                  pendingTransactionsCount: data.data?.pendingReservations?.length || 0,
                });
              } else {
                setWebSyncStatus({ ...webSyncStatus, isConnected: false });
              }
            } catch (e) {
              console.error("Web sync trigger failed", e);
              setWebSyncStatus({ ...webSyncStatus, isConnected: false });
            }
          }}
        />
      )}

      <VisualHelpGuide
        isOpen={showHelpGuide}
        onClose={() => setShowHelpGuide(false)}
        initialSection={helpGuideSection}
      />

      {showManageStationModal && (
        <ManageStationModal
          stationToEdit={editingStationTarget}
          tariffs={tariffs}
          currency={currency}
          onClose={() => {
            setShowManageStationModal(false);
            setEditingStationTarget(null);
          }}
          onSaveStation={handleSaveStation}
          onDeleteStation={handleDeleteStation}
        />
      )}

      {showManageTariffsModal && (
        <ManageTariffsModal
          tariffs={tariffs}
          currency={currency}
          onClose={() => setShowManageTariffsModal(false)}
          onAddTariff={handleAddTariff}
          onUpdateTariff={handleUpdateTariff}
          onDeleteTariff={handleDeleteTariff}
        />
      )}

      {showHardwareModal && (
        <HardwareRelayModal
          stations={stations}
          onClose={() => setShowHardwareModal(false)}
        />
      )}
    </div>
  );
}
