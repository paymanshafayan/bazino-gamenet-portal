import React, { useState } from 'react';
import { X, ArrowRightLeft, Gamepad2 } from 'lucide-react';
import { Station } from '../types';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface TransferStationModalProps {
  sourceStation: Station;
  allStations: Station[];
  onClose: () => void;
  onConfirmTransfer: (sourceStationId: string, targetStationId: string) => void;
}

export const TransferStationModal: React.FC<TransferStationModalProps> = ({
  sourceStation,
  allStations,
  onClose,
  onConfirmTransfer,
}) => {
  // این مودال فقط وقتی باز است mount می‌شود، پس isOpen همیشه true است.
  useModalDismiss(true, onClose);

  // Available idle target stations
  const availableTargets = allStations.filter(
    (s) => s.id !== sourceStation.id && s.status === 'IDLE'
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    availableTargets[0]?.id || ''
  );

  const handleTransfer = () => {
    if (!selectedTargetId) return;
    onConfirmTransfer(sourceStation.id, selectedTargetId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                جابه‌جایی فاکتور بین ایستگاه‌ها
              </h3>
              <p className="text-xs text-zinc-400">انتقال زمان، حساب بوفه و خدمات به دستگاه جدید</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
            <span>مبدا جابه‌جایی:</span>
            <span className="font-bold text-amber-400">{sourceStation.name}</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              انتخاب دستگاه مقصد (خالی):
            </label>

            {availableTargets.length === 0 ? (
              <div className="p-4 bg-red-500/10 text-red-400 text-xs rounded-xl border border-red-500/20 text-center">
                هیچ دستگاه خالی در حال حاضر برای انتقال وجود ندارد.
              </div>
            ) : (
              <div className="space-y-2">
                {availableTargets.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedTargetId(st.id)}
                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between text-xs ${
                      selectedTargetId === st.id
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      <span>{st.name}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      خالی / آماده
                    </span>
                  </button>
                ))}
              </div>
            )}
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
            onClick={handleTransfer}
            disabled={!selectedTargetId}
            className="px-6 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-zinc-950 font-bold text-xs shadow-lg shadow-purple-500/20"
          >
            تایید و جابه‌جایی صورت‌حساب
          </button>
        </div>
      </div>
    </div>
  );
};
