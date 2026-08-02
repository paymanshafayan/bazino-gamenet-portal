import React, { useState } from 'react';
import { Coffee, Plus, Search, TrendingUp, PackageCheck, AlertTriangle, Edit2, Trash2, DollarSign, Layers } from 'lucide-react';
import { BuffetItem, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface BuffetManagementProps {
  buffetItems: BuffetItem[];
  currency: CurrencyCode;
  onAddBuffetItem: (item: Omit<BuffetItem, 'id' | 'soldQuantity'>) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  canManageStock: boolean;
}

export const BuffetManagement: React.FC<BuffetManagementProps> = ({
  buffetItems,
  currency,
  onAddBuffetItem,
  onUpdateStock,
  canManageStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('نوشیدنی');
  const [newItemBuyPrice, setNewItemBuyPrice] = useState(20);
  const [newItemSellPrice, setNewItemSellPrice] = useState(40);
  const [newItemStock, setNewItemStock] = useState(50);
  const [newItemUnit, setNewItemUnit] = useState('عدد');

  // Categories list
  const categories = ['ALL', ...Array.from(new Set(buffetItems.map((i) => i.category)))];

  // Filtered items
  const filteredItems = buffetItems.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || i.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate Total Profit & Sales
  const totalBuffetSales = buffetItems.reduce((acc, item) => acc + item.sellPrice * item.soldQuantity, 0);
  const totalBuffetCost = buffetItems.reduce((acc, item) => acc + item.buyPrice * item.soldQuantity, 0);
  const totalBuffetProfit = totalBuffetSales - totalBuffetCost;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    onAddBuffetItem({
      name: newItemName.trim(),
      category: newItemCategory,
      buyPrice: newItemBuyPrice,
      sellPrice: newItemSellPrice,
      stockQuantity: newItemStock,
      unit: newItemUnit,
    });

    setNewItemName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">سود خالص فروش بوفه</div>
            <div className="text-lg font-extrabold text-emerald-400">
              {formatCurrency(totalBuffetProfit, currency)}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">کل کل فروش بوفه</div>
            <div className="text-lg font-extrabold text-amber-400">
              {formatCurrency(totalBuffetSales, currency)}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">تنوع اقلام بوفه</div>
            <div className="text-lg font-extrabold text-cyan-400">
              {buffetItems.length} محصول ثبت‌شده
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar (Search, Category Filter, Add Item) */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="جستجوی محصول بوفه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'همه دسته‌بندی‌ها' : cat}
              </option>
            ))}
          </select>
        </div>

        {canManageStock && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف محصول جدید</span>
          </button>
        )}
      </div>

      {/* Items Table / Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
              <tr>
                <th className="p-3.5">نام محصول</th>
                <th className="p-3.5">دسته‌بندی</th>
                <th className="p-3.5">قیمت خرید</th>
                <th className="p-3.5">قیمت فروش</th>
                <th className="p-3.5">سود هر واحد</th>
                <th className="p-3.5">تعداد فروخته‌شده</th>
                <th className="p-3.5">سود کل محصول</th>
                <th className="p-3.5">موجودی انبار</th>
                {canManageStock && <th className="p-3.5">مدیریت موجودی</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredItems.map((item) => {
                const unitProfit = item.sellPrice - item.buyPrice;
                const totalItemProfit = unitProfit * item.soldQuantity;
                const isLowStock = item.stockQuantity <= 10;

                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-zinc-100 flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-400" />
                      <span>{item.name}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-400 font-mono">
                      {formatCurrency(item.buyPrice, currency)}
                    </td>
                    <td className="p-3.5 text-amber-400 font-mono font-bold">
                      {formatCurrency(item.sellPrice, currency)}
                    </td>
                    <td className="p-3.5 text-emerald-400 font-mono font-bold">
                      +{formatCurrency(unitProfit, currency)}
                    </td>
                    <td className="p-3.5 font-mono">{item.soldQuantity} {item.unit}</td>
                    <td className="p-3.5 text-emerald-400 font-mono font-bold">
                      +{formatCurrency(totalItemProfit, currency)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1 ${
                          isLowStock
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : 'bg-zinc-800 text-zinc-200'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3" />}
                        {item.stockQuantity} {item.unit}
                      </span>
                    </td>

                    {canManageStock && (
                      <td className="p-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateStock(item.id, item.stockQuantity + 10)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold"
                            title="افزودن ۱۰ عدد به انبار"
                          >
                            +۱۰
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-100">تعریف محصول جدید بوفه</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">نام محصول:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلا: هایپ 250ml"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">دسته‌بندی:</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="نوشیدنی">نوشیدنی</option>
                    <option value="نوشیدنی گرم">نوشیدنی گرم</option>
                    <option value="تنقلات">تنقلات</option>
                    <option value="غذای گرم">غذای گرم</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">واحد سنجش:</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">قیمت خرید (موجودی انبار):</label>
                  <input
                    type="number"
                    value={newItemBuyPrice}
                    onChange={(e) => setNewItemBuyPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">قیمت فروش به مشتری:</label>
                  <input
                    type="number"
                    value={newItemSellPrice}
                    onChange={(e) => setNewItemSellPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 font-bold text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">تعداد موجودی اولیه:</label>
                <input
                  type="number"
                  value={newItemStock}
                  onChange={(e) => setNewItemStock(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold"
                >
                  ذخیره محصول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
