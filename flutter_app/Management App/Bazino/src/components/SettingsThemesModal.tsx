import React, { useState, useEffect } from 'react';
import { Settings, Palette, Volume2, Download, Upload, ShieldCheck, Check, Play, RefreshCw, Crown, Monitor, ExternalLink } from 'lucide-react';
import { AppTheme, SoundAlarmConfig, BackupSettings } from '../types';
import { THEMES_LIST } from '../data/mockData';
import { playAlarmSound } from '../utils/audio';

interface SettingsThemesModalProps {
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  soundConfig: SoundAlarmConfig;
  onUpdateSoundConfig: (config: SoundAlarmConfig) => void;
  backupSettings: BackupSettings;
  onUpdateBackupSettings: (b: BackupSettings) => void;
  onExportBackupJSON: () => void;
  onImportBackupJSON: (jsonString: string) => void;
}

export const SettingsThemesModal: React.FC<SettingsThemesModalProps> = ({
  currentTheme,
  onSelectTheme,
  soundConfig,
  onUpdateSoundConfig,
  backupSettings,
  onUpdateBackupSettings,
  onExportBackupJSON,
  onImportBackupJSON,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [desktopAvailability, setDesktopAvailability] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    fetch('/api/desktop/availability')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.availability) setDesktopAvailability(data.availability);
      })
      .catch(() => {
        // Endpoint unreachable (e.g. very old backend without this route yet) — just keep
        // showing the buttons as "not available yet" rather than crashing the settings screen.
        setDesktopAvailability({ windows: false, mac: false, linux: false });
      });
  }, []);

  const handleDesktopDownload = (platform: 'windows' | 'mac' | 'linux') => {
    window.open(`/api/desktop/download/${platform}`, '_blank');
  };

  const handleTestSound = () => {
    playAlarmSound(soundConfig.soundType, soundConfig.volume);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportBackupJSON(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* 20 Themes Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
              <span>انتخاب پوسته گرافیکی نرم‌افزار (۲۰ تم جذاب BAZINO PRO)</span>
            </h3>
            <p className="text-xs text-zinc-400">طراحی شده ویژه محیط کلوب‌ها، گیم‌نت‌ها و سالن‌های گیمینگ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {THEMES_LIST.map((theme) => {
            const isSelected = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectTheme(theme)}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-28 relative overflow-hidden group ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/50 shadow-xl'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                }`}
              >
                {/* Theme Preview Gradient Banner */}
                <div
                  className={`absolute top-0 right-0 left-0 h-10 bg-gradient-to-r ${theme.previewGradient} opacity-80`}
                />

                <div className="relative z-10 pt-6">
                  <div className="text-xs font-bold text-zinc-100 drop-shadow">{theme.name}</div>
                </div>

                {isSelected && (
                  <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alarm Sound Settings */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-100">
              تنظیمات صدای هشدار پایان بازی و آلارم‌ها
            </h3>
            <p className="text-xs text-zinc-400">
              قابلیت تغییر نوع زنگ، تکرار آلارم هشدار و ولوم صدا
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-zinc-300 block mb-1">نوع صدای آلارم:</label>
            <select
              value={soundConfig.soundType}
              onChange={(e) =>
                onUpdateSoundConfig({ ...soundConfig, soundType: e.target.value as any })
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="arcade_bell">زنگ آرکید آلارم (Arcade Bell)</option>
              <option value="siren">آژیر هشدار خطر (Siren)</option>
              <option value="gentle_chime">چایم ملایم (Gentle Chime)</option>
              <option value="digital_beep">بوق دیجتالی (Digital Beep)</option>
              <option value="radar_ping">پینگ رادار (Radar Ping)</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-300 block mb-1">فاصله تکرار زنگ (ثانیه):</label>
            <input
              type="number"
              min="5"
              step="5"
              value={soundConfig.repeatIntervalSeconds}
              onChange={(e) =>
                onUpdateSoundConfig({
                  ...soundConfig,
                  repeatIntervalSeconds: Number(e.target.value),
                })
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-zinc-300 block mb-1">تست صدای انتخاب‌شده:</label>
            <button
              type="button"
              onClick={handleTestSound}
              className="w-full py-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-amber-400" />
              <span>پخش نمونه صدا</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-100">
              پشتیبان‌گیری روزانه و حفاظت از اطلاعات در قطع برق
            </h3>
            <p className="text-xs text-zinc-400">
              حفظ کلیه اطلاعات زمان قطع ناگهانی برق و خروجی/ورودی فایل دیتا
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <div>
            <p className="text-xs font-bold text-zinc-200">پشتیبان‌گیری خودکار روزانه</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {backupSettings.lastBackupTime
                ? `آخرین پشتیبان خودکار: ${new Date(backupSettings.lastBackupTime).toLocaleString('fa-IR')}`
                : 'هنوز پشتیبان خودکاری گرفته نشده'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={backupSettings.autoDailyBackup}
            onClick={() =>
              onUpdateBackupSettings({ ...backupSettings, autoDailyBackup: !backupSettings.autoDailyBackup })
            }
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
              backupSettings.autoDailyBackup ? 'bg-amber-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-zinc-950 transition-transform ${
                backupSettings.autoDailyBackup ? 'translate-x-0.5' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportBackupJSON}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>دانلود خروجی پشتیبان (فایل JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>بازیابی اطلاعات از فایل پشتیبان</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 pt-2">
          <Monitor className="w-4 h-4 text-amber-400" />
          نسخه‌ی دسکتاپ مستقل
        </h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          یک نسخه‌ی نصبی مستقل که بک‌اند و دیتابیس محلی خودش رو داره (بدون نیاز به مرورگر یا اینترنت برای کار روزمره)، و می‌تونه از تب «Web Sync» به سرور آنلاین سایت وصل بشه تا رزروهای آنلاین رو دریافت کنه.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['windows', 'mac', 'linux'] as const).map((platform) => {
            const label = platform === 'windows' ? 'ویندوز (.exe)' : platform === 'mac' ? 'مک (.dmg)' : 'لینوکس (.AppImage)';
            const isAvailable = desktopAvailability?.[platform] === true;
            return (
              <button
                key={platform}
                type="button"
                disabled={!isAvailable}
                onClick={() => handleDesktopDownload(platform)}
                title={isAvailable ? `دانلود نسخه‌ی ${label}` : 'هنوز build نشده — به desktop-app/README.md مراجعه کنید'}
                className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                  isAvailable
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer'
                    : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{label}</span>
                {!isAvailable && <span className="text-[9px] text-zinc-600">(به‌زودی)</span>}
              </button>
            );
          })}
        </div>
        {desktopAvailability && Object.values(desktopAvailability).every((v) => !v) && (
          <p className="text-[10px] text-zinc-600 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            نصاب واقعی هنوز build نشده — راهنمای ساخت آن در فایل «desktop-app/README.md» پروژه است.
          </p>
        )}
      </div>
    </div>
  );
};
