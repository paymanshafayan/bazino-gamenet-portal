import React from 'react';

// Reusable Sci-Fi Hexagonal Icon Button
interface HexIconProps {
  icon: React.ReactNode;
  active?: boolean;
  color?: 'gold' | 'purple';
  onClick?: () => void;
  size?: number;
}

export const HexIcon = ({ icon, active = false, color = 'gold', onClick, size = 64 }: HexIconProps) => {
  const isGold = color === 'gold';
  const strokeColor = isGold 
    ? (active ? '#fbbf24' : '#d97706') 
    : (active ? '#c084fc' : '#7c3aed');
  
  const glowFilter = isGold ? 'url(#gold-glow-ui)' : 'url(#purple-glow-ui)';

  return (
    <div 
      className="relative cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
      style={{ width: `${size}px`, height: `${size}px` }}
      onClick={onClick}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
        <defs>
          <filter id="gold-glow-ui" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="purple-glow-ui" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Hexagon outer border */}
        <polygon 
          points="50,5 90,28 90,72 50,95 10,72 10,28" 
          stroke={strokeColor} 
          strokeWidth="2.5" 
          fill="rgba(11, 11, 16, 0.85)"
          filter={active ? glowFilter : undefined}
          className="transition-all duration-300"
        />
        {/* Inside decorative dot indicators */}
        <polygon 
          points="50,12 83,31 83,69 50,88 17,69 17,31" 
          stroke={strokeColor} 
          strokeWidth="0.5" 
          strokeDasharray="4 6"
          fill="none"
          opacity="0.5"
        />
      </svg>
      {/* Icon centered */}
      <div className={`relative z-10 transition-colors duration-300 ${
        isGold 
          ? (active ? 'text-amber-400' : 'text-amber-600 hover:text-amber-400') 
          : (active ? 'text-purple-400' : 'text-purple-600 hover:text-purple-400')
      }`}>
        {icon}
      </div>
    </div>
  );
};

// Reusable Octagonal Button/Panel frame with double border corners
interface OctaBorderProps {
  children?: React.ReactNode;
  width?: string | number;
  height?: string | number;
  color?: 'gold' | 'purple' | 'green' | 'gray';
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export const OctaBorder = ({ 
  children, 
  width = '100%', 
  height = '100%', 
  color = 'gold', 
  active = false, 
  className = '', 
  onClick 
}: OctaBorderProps) => {
  let stroke = '#d97706';
  let glow = 'rgba(217, 119, 6, 0.2)';
  if (color === 'purple') {
    stroke = '#7c3aed';
    glow = 'rgba(124, 58, 237, 0.25)';
  } else if (color === 'green') {
    stroke = '#10b981';
    glow = 'rgba(16, 185, 129, 0.3)';
  } else if (color === 'gray') {
    stroke = '#4b5563';
    glow = 'transparent';
  }

  if (active) {
    if (color === 'gold') stroke = '#fbbf24';
    if (color === 'purple') stroke = '#c084fc';
  }

  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`relative group transition-all duration-300 select-none ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${className}`}
      style={{ 
        width: widthStyle, 
        height: heightStyle,
        filter: active ? `drop-shadow(0 0 6px ${glow})` : `drop-shadow(0 0 2px ${glow})`
      }}
      onClick={onClick}
    >
      <svg className="absolute inset-0 w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 200 60">
        {/* Double layered corner borders */}
        <path 
          d="M 12 4 L 188 4 L 196 12 L 196 48 L 188 56 L 12 56 L 4 48 L 4 12 Z" 
          stroke={stroke} 
          strokeWidth="1.5"
          fill="rgba(8, 8, 12, 0.85)"
        />
        {/* Double accent corners */}
        <path d="M 4 16 L 4 12 L 12 4 L 16 4" stroke={stroke} strokeWidth="2.5" />
        <path d="M 196 16 L 196 12 L 188 4 L 184 4" stroke={stroke} strokeWidth="2.5" />
        <path d="M 4 44 L 4 48 L 12 56 L 16 56" stroke={stroke} strokeWidth="2.5" />
        <path d="M 196 44 L 196 48 L 188 56 L 184 56" stroke={stroke} strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-semibold">
        {children}
      </div>
    </div>
  );
};

// Premium Futuristic CyberButton Component (Primary Gold, Secondary Purple)
interface CyberButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const CyberButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false
}: CyberButtonProps) => {
  let stroke = '#d97706'; // default gold
  let activeStroke = '#fbbf24';
  let glow = 'rgba(217, 119, 6, 0.4)';
  let bgFill = 'rgba(20, 15, 5, 0.85)';
  let textColor = 'text-amber-400 group-hover:text-amber-200';

  if (variant === 'secondary') {
    stroke = '#7c3aed'; // purple
    activeStroke = '#c084fc';
    glow = 'rgba(124, 58, 237, 0.4)';
    bgFill = 'rgba(10, 5, 20, 0.85)';
    textColor = 'text-purple-400 group-hover:text-purple-200';
  } else if (variant === 'success') {
    stroke = '#059669'; // green
    activeStroke = '#34d399';
    glow = 'rgba(16, 185, 129, 0.4)';
    bgFill = 'rgba(5, 20, 10, 0.85)';
    textColor = 'text-emerald-400 group-hover:text-emerald-200';
  } else if (variant === 'danger') {
    stroke = '#dc2626'; // red
    activeStroke = '#f87171';
    glow = 'rgba(239, 68, 68, 0.4)';
    bgFill = 'rgba(20, 5, 5, 0.85)';
    textColor = 'text-rose-400 group-hover:text-rose-200';
  }

  const height = size === 'sm' ? 36 : size === 'lg' ? 56 : 46;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative group transition-all duration-300 font-display font-bold uppercase tracking-wider select-none outline-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]'
      } ${className}`}
      style={{
        height: `${height}px`,
        filter: `drop-shadow(0 0 4px ${glow})`
      }}
    >
      <svg className="absolute inset-0 w-full h-full" fill="none" preserveAspectRatio="none" viewBox={`0 0 200 ${height}`}>
        {/* Base octagon background */}
        <path
          d={`M 10 2 L 190 2 L 198 10 L 198 ${height - 10} L 190 ${height - 2} L 10 ${height - 2} L 2 ${height - 10} L 2 10 Z`}
          stroke={stroke}
          strokeWidth="1.5"
          fill={bgFill}
          className="transition-all duration-300 group-hover:stroke-[2] group-hover:stroke-[activeStroke]"
          style={{ stroke: stroke }}
        />
        {/* Double Accent Corners */}
        <path d={`M 2 12 L 2 10 L 10 2 L 12 2`} stroke={activeStroke} strokeWidth="2.5" />
        <path d={`M 198 12 L 198 10 L 190 2 L 188 2`} stroke={activeStroke} strokeWidth="2.5" />
        <path d={`M 2 ${height - 12} L 2 ${height - 10} L 10 ${height - 2} L 12 ${height - 2}`} stroke={activeStroke} strokeWidth="2.5" />
        <path d={`M 198 ${height - 12} L 198 ${height - 10} L 190 ${height - 2} L 188 ${height - 2}`} stroke={activeStroke} strokeWidth="2.5" />
      </svg>
      {/* Content centered */}
      <span className={`relative z-10 px-6 flex items-center justify-center h-full text-center text-xs transition-colors duration-300 ${textColor}`}>
        {children}
      </span>
    </button>
  );
};

// Reusable Square HUD icon buttons (Top Right Search, Mail, Bell, Hamburger)
interface HudSquareProps {
  icon: React.ReactNode;
  badge?: string | number;
  onClick?: () => void;
  active?: boolean;
}

export const HudSquareButton = ({ icon, badge, onClick, active = false }: HudSquareProps) => {
  return (
    <button 
      className="relative w-12 h-12 cursor-pointer select-none group transition-all duration-300 hover:scale-105 active:scale-95"
      onClick={onClick}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 60 60" fill="none">
        <path 
          d="M 10 4 L 50 4 L 56 10 L 56 50 L 50 56 L 10 56 L 4 50 L 4 10 Z" 
          stroke={active ? '#c084fc' : '#7c3aed'} 
          strokeWidth="1.5" 
          fill="rgba(10, 10, 15, 0.85)"
        />
        {/* Subtle corner lines */}
        <path d="M 4 14 L 4 10 L 10 4" stroke={active ? '#c084fc' : '#7c3aed'} strokeWidth="2.5" />
        <path d="M 56 46 L 56 50 L 50 56" stroke={active ? '#c084fc' : '#7c3aed'} strokeWidth="2.5" />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${active ? 'text-purple-300' : 'text-purple-500 group-hover:text-purple-300'} transition-colors`}>
        {icon}
      </div>
      {badge && (
        <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-purple-400 animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
};
