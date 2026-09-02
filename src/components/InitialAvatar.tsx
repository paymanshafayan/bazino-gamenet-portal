import React from 'react';

interface Props {
  /** نامی که حرف اول و رنگ آواتار از آن ساخته می‌شود. */
  name: string;
  size?: number;
  className?: string;
}

/**
 * آواتار حرف‌اول، تولیدشده روی همین دستگاه.
 *
 * جایگزین `api.dicebear.com` که یک درخواست شبکه به دامنه‌ی خارجی بود و روی
 * شبکه‌های فیلترشده به‌جای آواتار، آیکون تصویر شکسته نشان می‌داد.
 * رنگ از روی خودِ نام محاسبه می‌شود، پس هر کاربر همیشه رنگ ثابت خودش را دارد.
 */
export default function InitialAvatar({ name, size = 34, className = '' }: Props) {
  const clean = (name || '?').trim();
  const initial = clean.charAt(0).toUpperCase() || '?';

  // هش ساده و پایدار → یک ته‌رنگ ثابت برای هر نام
  let hash = 0;
  for (let i = 0; i < clean.length; i += 1) {
    hash = (hash * 31 + clean.charCodeAt(i)) % 360;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-black select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        background: `linear-gradient(135deg, hsl(${hash} 65% 32%), hsl(${(hash + 40) % 360} 65% 22%))`,
        color: `hsl(${hash} 90% 88%)`,
      }}
      aria-label={clean}
      title={clean}
    >
      {initial}
    </div>
  );
}
