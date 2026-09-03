import React, { useState } from 'react';
import { X, Cpu, Radio, Printer, Shield, CheckCircle2, AlertCircle, RefreshCw, Zap, Server, Terminal, Lock, Unlock } from 'lucide-react';
import { Station } from '../types';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface HardwareRelayModalProps {
  stations: Station[];
  onClose: () => void;
}

export const HardwareRelayModal: React.FC<HardwareRelayModalProps> = ({
  stations,
  onClose,
}) => {
  // این مودال فقط وقتی باز است mount می‌شود، پس isOpen همیشه true است.
  useModalDismiss(true, onClose);

  const [activeTab, setActiveTab] = useState<'relays' | 'printer' | 'pc_agent'>('relays');
  
  // Serial COM Port simulation
  const [comPort, setComPort] = useState('COM3 (Arduino Uno / ESP32 Relay Board)');
  const [baudRate, setBaudRate] = useState('9600');
  const [isComConnected, setIsComConnected] = useState(true);
  const [testRelayStatus, setTestRelayStatus] = useState<Record<string, boolean>>({
    'st-1': true,
    'st-2': true,
    'st-3': false,
  });

  // Thermal Printer settings
  const [printerPort, setPrinterPort] = useState('USB001 (Thermal ESC/POS 80mm)');
  const [autoPrintOnCheckout, setAutoPrintOnCheckout] = useState(true);

  // PC Locker settings
  const [pcLockerActive, setPcLockerActive] = useState(true);

  const toggleRelayChannel = (stationId: string) => {
    setTestRelayStatus((prev) => ({
      ...prev,
      [stationId]: !prev[stationId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-100">
                  مدیریت سخت‌افزار، رله‌های الکترونیکی و فیش‌پرینتر
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  LAN Local Hardware
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                اتصال مستقیم به پورت سریال (COM/USB)، بردهای آردوئینو/ESP32، پوز و فیش‌پرینتر حرارتی
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-zinc-950 px-4 border-b border-zinc-800 flex gap-2">
          <button
            onClick={() => setActiveTab('relays')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'relays'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>کنترل رله‌های برق تلویزیون/کنسول ({stations.length} کانال)</span>
          </button>

          <button
            onClick={() => setActiveTab('printer')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'printer'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>فیش‌پرینتر حرارتی & کارتخوان POS</span>
          </button>

          <button
            onClick={() => setActiveTab('pc_agent')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'pc_agent'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>عامل قفل سیستم‌های PC</span>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-zinc-300">
          {activeTab === 'relays' && (
            <div className="space-y-4">
              {/* COM Port Connection Status */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isComConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <span>پورت ارتباطی برد رله:</span>
                      <span className="text-amber-400 font-mono">{comPort}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      سرعت انتقال: <span className="font-mono text-zinc-200">{baudRate} Baud</span> | وضعیت: <span className="text-emerald-400 font-bold">متصل و آماده دریافت دستور</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsComConnected(!isComConnected)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تست مجدد اتصال پورت</span>
                </button>
              </div>

              {/* Station Relays Mapping Grid */}
              <div>
                <div className="font-bold text-sm text-zinc-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>نقشه‌برداری کانال‌های رله به دستگاه‌های گیم‌نت:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stations.map((st, idx) => {
                    const isOn = testRelayStatus[st.id] ?? (st.status !== 'IDLE');
                    return (
                      <div
                        key={st.id}
                        className={`p-3 bg-zinc-950 rounded-xl border transition-all flex items-center justify-between ${
                          isOn ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-zinc-100 text-xs flex items-center gap-1.5">
                            <span>{st.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-amber-400 rounded">
                              کانال رله CH-0{idx + 1}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            وضعیت برق مانیتور/تلویزیون:{' '}
                            <span className={isOn ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                              {isOn ? 'وصل (روشن 🔌)' : 'قطع (خاموش ⭕)'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleRelayChannel(st.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                            isOn
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isOn ? 'قطع برق' : 'وصل برق'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>تنظیمات درایور فیش‌پرینتر حرارتی (Thermal ESC/POS):</span>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">پورت خروجی فیش پرینتر:</label>
                  <select
                    value={printerPort}
                    onChange={(e) => setPrinterPort(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="USB001 (Thermal ESC/POS 80mm)">USB001 - پرینتر حرارتی 80mm استاندارد</option>
                    <option value="COM1 (Direct Serial POS Printer)">COM1 - فیش پرینتر پورت سریال</option>
                    <option value="TCP/IP (192.168.1.200:9100)">TCP/IP شبکه (192.168.1.200:9100)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="autoPrint"
                    checked={autoPrintOnCheckout}
                    onChange={(e) => setAutoPrintOnCheckout(e.target.checked)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <label htmlFor="autoPrint" className="text-zinc-200 font-medium cursor-pointer">
                    چاپ خودکار فاکتور تسویه‌حساب بلافاصله پس از اتمام بازی و دریافت وجه
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => alert('دستور چاپ تست ارسال شد! فیش‌پرینتر حرارتی با موفقیت تست گردید.')}
                    className="px-4 py-2 bg-amber-500 text-zinc-950 font-bold rounded-xl flex items-center gap-2 hover:bg-amber-400"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ فیش تست نمونه</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pc_agent' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>عامل سرویس قفل کلاینت‌های PC Gaming:</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  برنامه کلاینت BAZINO Agent روی سیستم‌های PC نصب شده و از طریق شبکه داخلی LAN به سرور دسکتاپ متصل می‌شود. در صورت عدم فعال بودن تایمر، صفحه کلاینت قفل شده و کلیدهای Task Manager و Alt+Tab مسدود می‌گردند.
                </p>

                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pcLockerActive ? (
                      <Lock className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Unlock className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <div className="font-bold text-zinc-200">سرویس قفل خودکار شبکه داخلی PC</div>
                      <div className="text-[10px] text-zinc-400">وضعیت: {pcLockerActive ? 'فعال و برقراری ارتباط با BAZINO Client' : 'غیرفعال'}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setPcLockerActive(!pcLockerActive)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                      pcLockerActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {pcLockerActive ? 'فعال' : 'غیرفعال'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>تنظیمات سخت‌افزاری شبکه محلی LAN با موفقیت ذخیره گردید</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
