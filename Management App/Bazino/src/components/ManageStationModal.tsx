import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Gamepad, Monitor, Glasses, CircleDot, Plus, Edit2, Tag, Trash2 } from 'lucide-react';
import { Station, StationType, TariffRate, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface ManageStationModalProps {
  stationToEdit?: Station | null;
  tariffs: TariffRate[];
  currency: CurrencyCode;
  onClose: () => void;
  onSaveStation: (stationData: {
    id?: string;
    name: string;
    type: StationType;
    icon: string;
    currentTariffId: string;
  }) => void;
  onDeleteStation?: (stationId: string) => void;
}

export const ManageStationModal: React.FC<ManageStationModalProps> = ({
  stationToEdit,
  tariffs,
  currency,
  onClose,
  onSaveStation,
  onDeleteStation,
}) => {
  // این مودال فقط وقتی باز است mount می‌شود، پس isOpen همیشه true است.
  useModalDismiss(true, onClose);

  const [name, setName] = useState(stationToEdit?.name || '');
  const [type, setType] = useState<StationType>(stationToEdit?.type || 'PS5_VIP');
  const [icon, setIcon] = useState<string>(stationToEdit?.icon || 'Gamepad2');
  const [tariffId, setTariffId] = useState<string>(
    stationToEdit?.currentTariffId || tariffs[0]?.id || 't1'
  );

  useEffect(() => {
    if (stationToEdit) {
      setName(stationToEdit.name);
      setType(stationToEdit.type);
      setIcon(stationToEdit.icon);
      setTariffId(stationToEdit.currentTariffId);
    }
  }, [stationToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveStation({
      id: stationToEdit?.id,
      name: name.trim(),
      type,
      icon,
      currentTariffId: tariffId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              {stationToEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                {stationToEdit ? `ویرایش ایستگاه ${stationToEdit.name}` : 'تعریف ایستگاه بازی جدید'}
              </h3>
              <p className="text-xs text-zinc-400">تنظیم مشخصات، نوع دستگاه و تعرفه قیمت ساعتی</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Station Name */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-semibold">نام و عنوان ایستگاه:</label>
            <input
              type="text"
              required
              placeholder="مثلا: ایستگاه 09 - PS5 VIP 🎮"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-amber-500 text-sm font-bold"
            />
          </div>

          {/* Station Type */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-semibold">نوع پلتفرم بازی:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { typeKey: 'PS5_VIP', label: 'PlayStation 5 VIP', iconName: 'Gamepad2' },
                { typeKey: 'PS5_REGULAR', label: 'PlayStation 5 Standard', iconName: 'Gamepad' },
                { typeKey: 'PC_GAMING', label: 'PC Gaming Pro High-End', iconName: 'Monitor' },
                { typeKey: 'VR', label: 'واقعیت مجازی VR', iconName: 'Glasses' },
                { typeKey: 'BILLIARDS', label: 'میز بیلیارد / اسنوکر', iconName: 'CircleDot' },
              ].map((item) => (
                <button
                  key={item.typeKey}
                  type="button"
                  onClick={() => {
                    setType(item.typeKey as StationType);
                    setIcon(item.iconName);
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2 ${
                    type === item.typeKey
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {item.iconName === 'Gamepad2' && <Gamepad2 className="w-4 h-4 text-amber-400" />}
                  {item.iconName === 'Gamepad' && <Gamepad className="w-4 h-4 text-blue-400" />}
                  {item.iconName === 'Monitor' && <Monitor className="w-4 h-4 text-cyan-400" />}
                  {item.iconName === 'Glasses' && <Glasses className="w-4 h-4 text-purple-400" />}
                  {item.iconName === 'CircleDot' && <CircleDot className="w-4 h-4 text-emerald-400" />}
                  <span className="text-[11px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Tariff */}
          <div>
            <label className="text-zinc-300 block mb-1.5 font-semibold flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>انتخاب تعرفه پیش‌فرض قیمت ساعتی:</span>
            </label>
            <select
              value={tariffId}
              onChange={(e) => setTariffId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              {tariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({formatCurrency(t.hourlyRate, currency)} / ساعت)
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
            {stationToEdit && onDeleteStation ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`آیا از حذف ایستگاه ${stationToEdit.name} اطمینان دارید؟`)) {
                    onDeleteStation(stationToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 flex items-center gap-1 font-bold text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف دستگاه</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              >
                انصراف
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-lg shadow-amber-500/20"
              >
                {stationToEdit ? 'بروزرسانی ایستگاه' : 'ایجاد و اضافه کردن ایستگاه'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
