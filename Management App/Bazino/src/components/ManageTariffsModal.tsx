import React, { useState } from 'react';
import { X, Tag, Plus, Edit2, Trash2, Clock, Check } from 'lucide-react';
import { TariffRate, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ManageTariffsModalProps {
  tariffs: TariffRate[];
  currency: CurrencyCode;
  onClose: () => void;
  onAddTariff: (tariff: Omit<TariffRate, 'id'>) => void;
  onUpdateTariff: (tariff: TariffRate) => void;
  onDeleteTariff: (tariffId: string) => void;
}

export const ManageTariffsModal: React.FC<ManageTariffsModalProps> = ({
  tariffs,
  currency,
  onClose,
  onAddTariff,
  onUpdateTariff,
  onDeleteTariff,
}) => {
  const [editingTariff, setEditingTariff] = useState<TariffRate | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(200);
  const [specialScheduleActive, setSpecialScheduleActive] = useState(false);
  const [startHour, setStartHour] = useState<number>(22);
  const [endHour, setEndHour] = useState<number>(4);
  const [specialRate, setSpecialRate] = useState<number>(250);

  const handleOpenNewForm = () => {
    setEditingTariff(null);
    setName('');
    setHourlyRate(200);
    setSpecialScheduleActive(false);
    setStartHour(22);
    setEndHour(4);
    setSpecialRate(250);
    setShowForm(true);
  };

  const handleOpenEditForm = (t: TariffRate) => {
    setEditingTariff(t);
    setName(t.name);
    setHourlyRate(t.hourlyRate);
    setSpecialScheduleActive(!!t.specialScheduleActive);
    setStartHour(t.startHour || 22);
    setEndHour(t.endHour || 4);
    setSpecialRate(t.specialRate || t.hourlyRate + 40);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingTariff) {
      onUpdateTariff({
        ...editingTariff,
        name: name.trim(),
        hourlyRate,
        specialScheduleActive,
        startHour: specialScheduleActive ? startHour : undefined,
        endHour: specialScheduleActive ? endHour : undefined,
        specialRate: specialScheduleActive ? specialRate : undefined,
      });
    } else {
      onAddTariff({
        name: name.trim(),
        hourlyRate,
        specialScheduleActive,
        startHour: specialScheduleActive ? startHour : undefined,
        endHour: specialScheduleActive ? endHour : undefined,
        specialRate: specialScheduleActive ? specialRate : undefined,
      });
    }

    setShowForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                مدیریت و تعریف تعرفه‌های قیمت ساعتی
              </h3>
              <p className="text-xs text-zinc-400">تعیین نرخ‌های معمولی و نرخ‌های ویژه ساعات شبانه</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {!showForm ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold">لیست تعرفه‌های فعال گیم‌نت:</span>
                <button
                  onClick={handleOpenNewForm}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف تعرفه جدید</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {tariffs.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{t.name}</div>
                      <div className="text-amber-400 font-bold font-mono mt-0.5">
                        نرخ پایه: {formatCurrency(t.hourlyRate, currency)} / ساعت
                      </div>
                      {t.specialScheduleActive && (
                        <div className="text-[10px] text-purple-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>ساعات خاص ({t.startHour}:00 تا {t.endHour}:00): {formatCurrency(t.specialRate || 0, currency)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditForm(t)}
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700"
                        title="ویرایش"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {tariffs.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`آیا از حذف تعرفه ${t.name} اطمینان دارید؟`)) {
                              onDeleteTariff(t.id);
                            }
                          }}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-amber-400">
                  {editingTariff ? 'ویرایش تعرفه' : 'ایجاد تعرفه جدید'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  بازگشت به لیست
                </button>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">عنوان تعرفه:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلا: PS5 VIP یا گیمینگ شبانه"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">نرخ پایه ساعتی (₺):</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  required
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-amber-400 font-extrabold focus:outline-none focus:border-amber-500 text-base text-center"
                />
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specialScheduleActive}
                    onChange={(e) => setSpecialScheduleActive(e.target.checked)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className="font-semibold text-zinc-200">فعال‌سازی جدول نرخ ویژه در ساعات خاص (مثلا شبانه)</span>
                </label>

                {specialScheduleActive && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">از ساعت:</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center text-zinc-200 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">تا ساعت:</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={endHour}
                        onChange={(e) => setEndHour(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center text-zinc-200 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">نرخ ویژه (₺):</label>
                      <input
                        type="number"
                        min="10"
                        value={specialRate}
                        onChange={(e) => setSpecialRate(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center text-purple-400 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-zinc-800 rounded-xl text-zinc-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 rounded-xl text-zinc-950 font-bold"
                >
                  ذخیره تعرفه
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
