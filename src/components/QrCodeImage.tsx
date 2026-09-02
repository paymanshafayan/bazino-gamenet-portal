import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  /** متنی که داخل کد QR کدگذاری می‌شود (شناسه‌ی رزرو، آدرس صفحه‌ی دانلود و…). */
  value: string;
  size?: number;
  /** رنگ ماژول‌های تیره‌ی کد. */
  color?: string;
  /** رنگ پس‌زمینه. */
  background?: string;
  className?: string;
  alt?: string;
}

/**
 * کد QR که **کاملاً روی همین دستگاه** تولید می‌شود.
 *
 * قبلاً تصویر QR از `api.qrserver.com` گرفته می‌شد. سه ایراد داشت:
 *   ۱) شناسه‌ی رزرو کاربر به یک سرویس شخص ثالث فرستاده می‌شد،
 *   ۲) روی شبکه‌های فیلترشده یا آفلاین، بارکد ورود به سالن — که یک قابلیت اصلی
 *      محصول است — اصلاً نمایش داده نمی‌شد (در تست خودکار دقیقاً همین رخ داد)،
 *   ۳) هر بارکد یک درخواست شبکه‌ی اضافه به دامنه‌ی خارجی بود.
 *
 * حالا با کتابخانه‌ی `qrcode` یک data-URL محلی ساخته می‌شود؛ بدون هیچ درخواست شبکه.
 */
export default function QrCodeImage({
  value,
  size = 140,
  color = '#00f0ff',
  background = '#070913',
  className = '',
  alt = 'QR',
}: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: color, light: background },
    })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, [value, size, color, background]);

  if (failed) {
    // هرگز جای خالی نمی‌ماند: اگر تولید بارکد شکست خورد، خودِ شناسه نمایش داده
    // می‌شود تا مسئول کانتر بتواند دستی واردش کند.
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-gray-400 ${className}`}
        style={{ width: size, height: size }}
      >
        {value}
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
