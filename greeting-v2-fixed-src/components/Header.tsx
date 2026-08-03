import { Home, Gamepad2, Coffee, CalendarCheck, ShoppingCart, UserCircle2 } from "lucide-react";
import EdgeCurve from "./EdgeCurve";

const navItems = [
  { label: "HOME", icon: Home, active: true },
  { label: "GAMES", icon: Gamepad2 },
  { label: "CAFE", icon: Coffee },
  { label: "BOOKING", icon: CalendarCheck },
  { label: "STORE", icon: ShoppingCart },
  { label: "PROFILE", icon: UserCircle2 },
];

export default function Header() {
  return (
    <header className="absolute top-0 left-0 z-30 w-full">
      <EdgeCurve position="top" />
      {/* NEW: Proper glass frame around menu - not silly curves, elegant pill */}
      <div className="relative z-10 flex justify-center pt-3">
        <nav className="glass-strong flex items-center gap-1.5 rounded-full px-3 py-2 sm:gap-2 sm:px-5 sm:py-2.5 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className={`group relative flex flex-col items-center gap-0.5 rounded-full px-2.5 py-1 sm:px-3 text-[10px] font-semibold tracking-wide transition-all sm:text-[11px] ${
                active 
                  ? "text-amber-300 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_12px_rgba(255,207,92,0.15)]" 
                  : "text-purple-100/65 hover:text-amber-200 hover:bg-white/[0.04]"
              }`}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.5 : 2}
                className={`transition ${active ? "drop-shadow-[0_0_8px_rgba(255,207,92,0.9)]" : "group-hover:drop-shadow-[0_0_8px_rgba(179,102,255,0.8)]"}`}
              />
              <span className="font-display hidden sm:inline text-[9px] tracking-wider">{label}</span>
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(255,207,92,1)]" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
