import React, { useState } from 'react';
import { X, Tag, Check } from 'lucide-react';
import { Station, TariffRate, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface ChangeTariffModalProps {
  station: Station;
  tariffs: TariffRate[];
  currency: CurrencyCode;
  onClose: () => void;
  onConfirmChangeTariff: (stationId: string, newTariffId: string) => void;
}

export const ChangeTariffModal: React.FC<ChangeTariffModalProps> = ({
  station,
  tariffs,
  currency,
  onClose,
  onConfirmChangeTariff,
}) => {
  // این مودال فقط وقتی باز است mount می‌شود، پس isOpen همیشه true است.
  useModalDismiss(true, onClose);

  const [selectedTariffId, setSelectedTariffId] = useState<string>(
    station.activeSession?.tariffId || station.currentTariffId || tariffs[0]?.id
  );

  const handleConfirm = () => {
    onConfirmChangeTariff(station.id, selectedTariffId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                تغییر تعرفه ایستگاه در حین بازی
              </h3>
              <p className="text-xs text-zinc-400">اعمال نرخ جدید به {station.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="text-xs font-semibold text-zinc-300 block mb-2">
            انتخاب نرخ تعرفه جدید:
          </label>
          <div className="space-y-2">
            {tariffs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTariffId(t.id)}
                className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between text-xs ${
                  selectedTariffId === t.id
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold">{t.name}</div>
                  {t.specialScheduleActive && (
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      ساعات خاص ({t.startHour}:00 الی {t.endHour}:00): {formatCurrency(t.specialRate || 0, currency)}
                    </div>
                  )}
                </div>
                <div className="text-left font-mono">
                  {formatCurrency(t.hourlyRate, currency)} / ساعت
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
          >
            اعمال تعرفه جدید
          </button>
        </div>
      </div>
    </div>
  );
};
