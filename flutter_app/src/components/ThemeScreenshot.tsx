import React, { useEffect, useRef, useState } from 'react';

interface ThemeColorConfig {
  primary: string;
  bg: string;
  card: string;
}

interface ThemeInfo {
  id: string;
  name: string;
  type: string;
  colors?: ThemeColorConfig;
}

interface ThemeScreenshotProps {
  theme: ThemeInfo;
  language: 'fa' | 'en';
}

export default function ThemeScreenshot({ theme, language }: ThemeScreenshotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine colors
    let primary = '#ffb800';
    let bg = '#050608';
    let card = '#0D0E15';

    if (theme.id === 'cyberpunk-cyan') {
      primary = '#00f0ff';
      bg = '#040814';
      card = '#081026';
    } else if (theme.id === 'geco-purple') {
      primary = '#ffb800';
      bg = '#1a1c29';
      card = '#1f2235';
    } else if (theme.id === 'gaming-amp') {
      primary = '#00d8ff';
      bg = '#111119';
      card = '#161622';
    } else if (theme.id === 'dark-gold') {
      primary = '#ffb800';
      bg = '#050608';
      card = '#0D0E15';
    } else if (theme.colors) {
      primary = theme.colors.primary || '#ffb800';
      bg = theme.colors.bg || '#050608';
      card = theme.colors.card || '#0D0E15';
    }

    // Set canvas dimensions
    canvas.width = 480;
    canvas.height = 270;

    // Clear and draw background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Cyber/Tech Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw subtle primary colored ambient glow in center/bottom
    const radialGrad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 10,
      canvas.width / 2, canvas.height / 2, 200
    );
    radialGrad.addColorStop(0, hexToRgba(primary, 0.15));
    radialGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw header
    ctx.fillStyle = card;
    ctx.fillRect(0, 0, canvas.width, 35);
    ctx.strokeStyle = hexToRgba(primary, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.lineTo(canvas.width, 35);
    ctx.stroke();

    // Header Logo Dot
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(20, 17, 5, 0, Math.PI * 2);
    ctx.fill();

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText('BAZINO', 32, 20);

    // Header Nav links (small bars)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(100, 15, 20, 4);
    ctx.fillRect(130, 15, 20, 4);
    ctx.fillRect(160, 15, 20, 4);

    // Header profile dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(canvas.width - 20, 17, 6, 0, Math.PI * 2);
    ctx.fill();

    // HERO SECTION
    // Hero background shape
    const heroGrad = ctx.createLinearGradient(0, 35, 0, 140);
    heroGrad.addColorStop(0, hexToRgba(primary, 0.08));
    heroGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = heroGrad;
    ctx.fillRect(0, 35, canvas.width, 105);

    // Hero title
    ctx.fillStyle = primary;
    ctx.font = 'black italic 18px "Impact", "Arial Black", sans-serif';
    const heroTitleText = theme.name.toUpperCase();
    ctx.fillText(heroTitleText, 25, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(language === 'fa' ? 'پیشرفته‌ترین کلوپ بازی کشور' : 'ULTIMATE ESPORTS ARENA', 25, 95);

    // Hero paragraph lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(25, 108, 140, 2.5);
    ctx.fillRect(25, 114, 110, 2.5);

    // Hero CTA Button
    ctx.fillStyle = primary;
    // Round rectangle for button
    drawRoundRect(ctx, 25, 124, 70, 15, 3);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px system-ui, sans-serif';
    ctx.fillText(language === 'fa' ? 'رزرو سریع سانس' : 'BOOK SESSION', 33, 134);

    // Hero Graphic / Game Poster on the right
    ctx.strokeStyle = hexToRgba(primary, 0.2);
    ctx.lineWidth = 1;
    drawRoundRect(ctx, canvas.width - 190, 48, 165, 80, 5);
    ctx.stroke();
    // Inner poster
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    drawRoundRect(ctx, canvas.width - 188, 50, 161, 76, 4);
    ctx.fill();

    // Draw some game graphics (abstract mountain / geometric shapes)
    ctx.fillStyle = hexToRgba(primary, 0.05);
    ctx.beginPath();
    ctx.moveTo(canvas.width - 188, 126);
    ctx.lineTo(canvas.width - 120, 70);
    ctx.lineTo(canvas.width - 70, 126);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hexToRgba(primary, 0.12);
    ctx.beginPath();
    ctx.moveTo(canvas.width - 140, 126);
    ctx.lineTo(canvas.width - 100, 85);
    ctx.lineTo(canvas.width - 40, 126);
    ctx.closePath();
    ctx.fill();

    // Draw glowing circle / planet
    const sunGrad = ctx.createRadialGradient(
      canvas.width - 100, 65, 1,
      canvas.width - 100, 65, 20
    );
    sunGrad.addColorStop(0, primary);
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 65, 20, 0, Math.PI * 2);
    ctx.fill();

    // CARDS SECTION (3 bottom cards)
    const cardWidth = 135;
    const cardHeight = 85;
    const cardY = 155;
    const gap = 17;

    for (let i = 0; i < 3; i++) {
      const cardX = 25 + i * (cardWidth + gap);

      // Card outer shadow/glow if hovered style
      if (i === 1) {
        ctx.shadowColor = primary;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Card background
      ctx.fillStyle = card;
      ctx.strokeStyle = i === 1 ? primary : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1.2;
      drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 6);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 6);
      ctx.stroke();

      // Card image placeholder
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      drawRoundRect(ctx, cardX + 6, cardY + 6, cardWidth - 12, 38, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      drawRoundRect(ctx, cardX + 6, cardY + 6, cardWidth - 12, 38, 4);
      ctx.stroke();

      // Card image details (game pad icon lines)
      ctx.strokeStyle = hexToRgba(primary, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cardX + cardWidth / 2, cardY + 25, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Card title line
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px system-ui, sans-serif';
      const cardTitles = [
        language === 'fa' ? 'سیستم‌های VIP' : 'VIP Workstations',
        language === 'fa' ? 'مسابقات فعال' : 'Active Brackets',
        language === 'fa' ? 'سفارش آنلاین' : 'Cafe Smart Order'
      ];
      ctx.fillText(cardTitles[i], cardX + 8, cardY + 56);

      // Card body lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(cardX + 8, cardY + 65, 110, 2);
      ctx.fillRect(cardX + 8, cardY + 71, 80, 2);

      // Mini badge
      ctx.fillStyle = hexToRgba(primary, 0.15);
      drawRoundRect(ctx, cardX + cardWidth - 38, cardY + 49, 32, 9, 2);
      ctx.fill();
      ctx.fillStyle = primary;
      ctx.font = 'black 5.5px system-ui, sans-serif';
      ctx.fillText('RTX 5090', cardX + cardWidth - 35, cardY + 56);
    }

    // Set screenshot URL
    setScreenshotUrl(canvas.toDataURL('image/png'));
  }, [theme, language]);

  // Helper: hex to RGBA
  function hexToRgba(hex: string, alpha: number) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Helper: Draw rounded rectangle
  function drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  return (
    <div className="w-full relative group/shot">
      {/* Hidden canvas used for generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Rendered dynamic image */}
      {screenshotUrl ? (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-[#0a0a0f] shadow-lg group-hover/shot:border-primary/50 transition-all duration-300">
          <img 
            src={screenshotUrl} 
            alt={`${theme.name} Screenshot`} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover/shot:scale-[1.03] transition-all duration-500"
          />
          
          {/* Neon overlay corner glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/shot:opacity-40 transition-opacity" />
          
          {/* Status Indicator */}
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 border border-emerald-500/30 text-emerald-400 text-[8px] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {language === 'fa' ? 'پیش‌نمایش زنده' : 'LIVE VIEWPORT'}
          </div>

          {/* Theme specifications footer overlay */}
          <div className="absolute bottom-0 inset-x-0 p-3 flex justify-between items-center bg-gradient-to-t from-black to-transparent">
            <div className="flex gap-1.5 items-center">
              <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: theme.colors?.primary || '#ffb800' }} title="Primary" />
              <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: theme.colors?.bg || '#050608' }} title="Background" />
              <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: theme.colors?.card || '#0D0E15' }} title="Card" />
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider font-mono">
              480 × 270 px
            </span>
          </div>
        </div>
      ) : (
        <div className="aspect-video w-full rounded-lg bg-[#07080a] border border-white/5 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
