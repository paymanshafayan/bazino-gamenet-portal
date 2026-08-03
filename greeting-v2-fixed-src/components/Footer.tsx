import { MessageSquare, Bell, Image as ImageIcon, Settings } from "lucide-react";
import { useState } from "react";
import EdgeCurve from "./EdgeCurve";

export default function Footer() {
  const [tab, setTab] = useState<"GLOBAL" | "TEAM">("GLOBAL");

  return (
    <footer className="absolute bottom-0 left-0 z-30 w-full">
      <EdgeCurve position="bottom" />

      {/* Book a PC - elegant frame with glass background, sits on peak */}
      <div className="absolute bottom-[34px] left-1/2 z-20 -translate-x-1/2">
        <div className="relative">
          {/* Glow behind button */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300/20 to-purple-500/20 blur-[12px] -m-1" />
          <button className="font-display relative neon-border-glow animate-pulse-glow rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-200 to-amber-400 px-8 py-2.5 text-xs font-black tracking-[0.15em] text-slate-900 shadow-[0_4px_24px_rgba(255,207,92,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all hover:scale-[1.03] hover:from-amber-100 hover:to-amber-300 active:scale-[0.98] sm:px-9 sm:text-[13px]">
            BOOK A PC
          </button>
        </div>
      </div>

      {/* Chat box bottom-left - NOW WITH PROPER GLASS FRAME */}
      <div className="absolute bottom-2 left-3 z-10 hidden w-56 sm:block md:w-64 lg:left-6">
        <div className="glass rounded-xl p-2.5 border border-white/[0.08]">
          <div className="mb-2 flex gap-3 text-[10px] font-semibold tracking-wide">
            {(["GLOBAL", "TEAM"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-display relative pb-1 transition-all ${
                  tab === t 
                    ? "text-amber-300 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-amber-300 after:shadow-[0_0_8px_rgba(255,207,92,0.8)]" 
                    : "text-purple-200/60 hover:text-purple-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={`${tab === "GLOBAL" ? "Global" : "Team"} chat...`}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[11px] text-purple-50 placeholder-purple-200/30 outline-none backdrop-blur-sm transition-all focus:border-amber-300/30 focus:bg-black/50 focus:shadow-[0_0_0_2px_rgba(255,207,92,0.1)]"
          />
        </div>
      </div>

      {/* Icons bottom-right - NOW WITH GLASS FRAME */}
      <div className="absolute right-3 bottom-2 z-10 flex gap-1.5 lg:right-6">
        <div className="glass flex gap-1 rounded-full p-1 border border-white/[0.08]">
          {[
            { icon: MessageSquare, badge: 1 },
            { icon: Bell },
            { icon: ImageIcon },
            { icon: Settings },
          ].map(({ icon: Icon, badge }, i) => (
            <button
              key={i}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.03] text-purple-200/70 transition-all hover:bg-white/[0.08] hover:text-amber-300 hover:shadow-[0_0_12px_rgba(179,102,255,0.2)] sm:h-9 sm:w-9"
            >
              <Icon size={18} strokeWidth={1.8} />
              {badge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-[8px] font-bold text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] ring-1 ring-black/20">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
