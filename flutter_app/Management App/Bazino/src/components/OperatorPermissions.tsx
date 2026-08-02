import React from 'react';
import { Shield, Lock, Unlock, Check, UserCheck, ShieldAlert } from 'lucide-react';
import { Operator } from '../types';

interface OperatorPermissionsProps {
  operators: Operator[];
  onTogglePermission: (operatorId: string, permissionKey: keyof Operator['permissions']) => void;
}

export const OperatorPermissionsComponent: React.FC<OperatorPermissionsProps> = ({
  operators,
  onTogglePermission,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-100">
              مدیریت سطوح دسترسی اپراتورها و شیفت‌ها
            </h3>
            <p className="text-xs text-zinc-400">
              امکان محدودسازی و منع دسترسی اپراتورها به بخش‌های مالی، گزارشات، تغییر قیمت‌ها و انبار
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operators.map((op) => (
          <div
            key={op.id}
            className={`bg-zinc-900 border rounded-2xl p-5 space-y-4 ${
              op.role === 'ADMIN' ? 'border-amber-500/40 bg-amber-950/10' : 'border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center font-extrabold text-zinc-950">
                  {op.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">{op.name}</h4>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    نام کاربری: @{op.username}
                  </span>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  op.role === 'ADMIN'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {op.role === 'ADMIN' ? 'مدیر کل' : 'اپراتور شیفت'}
              </span>
            </div>

            {/* Permissions Toggles */}
            <div className="space-y-2 text-xs">
              {[
                { key: 'canAccessReports', label: 'دسترسی به گزارشات مالی و درآمد' },
                { key: 'canManagePricesAndTariffs', label: 'تغییر نرخ تعرفه‌ها و قیمت ساعتی' },
                { key: 'canManageExpenses', label: 'ثبت و ویرایش هزینه‌های مغازه' },
                { key: 'canManageBuffetStock', label: 'مدیریت موجودی بوفه و انبار' },
                { key: 'canManageOperators', label: 'مدیریت کاربران و اپراتورها' },
                { key: 'canGiveDiscounts', label: 'اعطای تخفیف به فاکتور مشتریان' },
              ].map((perm) => {
                const isAllowed = op.permissions[perm.key as keyof Operator['permissions']];
                const isDisabled = op.role === 'ADMIN';

                return (
                  <div
                    key={perm.key}
                    onClick={() => {
                      if (!isDisabled) {
                        onTogglePermission(op.id, perm.key as keyof Operator['permissions']);
                      }
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isAllowed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <span>{perm.label}</span>
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      {isAllowed ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>مجاز</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>ممنوع</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
