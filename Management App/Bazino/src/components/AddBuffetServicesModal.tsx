import React, { useState } from 'react';
import { X, Coffee, Plus, Check, Sparkles } from 'lucide-react';
import { Station, BuffetItem, ServiceItem, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AddBuffetServicesModalProps {
  station: Station;
  buffetItems: BuffetItem[];
  currency: CurrencyCode;
  onClose: () => void;
  onConfirmAddServices: (stationId: string, servicesToAdd: ServiceItem[]) => void;
}

export const AddBuffetServicesModal: React.FC<AddBuffetServicesModalProps> = ({
  station,
  buffetItems,
  currency,
  onClose,
  onConfirmAddServices,
}) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number>(50);
  const [customServicesList, setCustomServicesList] = useState<ServiceItem[]>([]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || customServicePrice <= 0) return;
    setCustomServicesList((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customServiceName.trim(),
        price: customServicePrice,
        qty: 1,
      },
    ]);
    setCustomServiceName('');
  };

  const handleSubmit = () => {
    const services: ServiceItem[] = [];

    // Map selected buffet items
    Object.entries(selectedItems).forEach(([itemId, qtyVal]) => {
      const qty = Number(qtyVal);
      const bItem = buffetItems.find((b) => b.id === itemId);
      if (bItem && qty > 0) {
        services.push({
          id: bItem.id,
          name: bItem.name,
          price: bItem.sellPrice,
          qty,
        });
      }
    });

    // Append custom services
    services.push(...customServicesList);

    onConfirmAddServices(station.id, services);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                افزایش بوفه و خدمات ویژه: {station.name}
              </h3>
              <p className="text-xs text-zinc-400">ثبت خوراکی‌ها و خدمات اختصاصی روی فاکتور مشتری</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Buffet Menu Items */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-300 mb-3">منوی بوفه گیم‌نت:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {buffetItems.map((item) => {
                const qty = selectedItems[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-200">{item.name}</div>
                      <div className="text-[10px] text-amber-400 mt-0.5">
                        {formatCurrency(item.sellPrice, currency)} (موجودی: {item.stockQuantity})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center justify-center font-bold hover:bg-zinc-800"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-amber-400">{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center hover:bg-amber-400"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Services Section */}
          <div className="pt-3 border-t border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>ایجاد خدمات ویژه دلخواه:</span>
            </h4>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="عنوان خدمت (مثلا: دسته اضافه PS5، چاپ فوتو، رزرو اختصاصی)"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
              <input
                type="number"
                placeholder="مبلغ"
                value={customServicePrice}
                onChange={(e) => setCustomServicePrice(Number(e.target.value))}
                className="w-24 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 text-center"
              />
              <button
                type="button"
                onClick={handleAddCustomService}
                className="px-3 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-400"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن</span>
              </button>
            </div>

            {customServicesList.length > 0 && (
              <div className="space-y-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                {customServicesList.map((cs) => (
                  <div key={cs.id} className="flex justify-between items-center text-xs text-zinc-300 py-1">
                    <span>{cs.name}</span>
                    <span className="font-bold text-amber-400">{formatCurrency(cs.price, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
            onClick={handleSubmit}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20"
          >
            تایید و ثبت روی فاکتور
          </button>
        </div>
      </div>
    </div>
  );
};
