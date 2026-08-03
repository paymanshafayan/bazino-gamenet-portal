import { Star, Wifi, Gauge } from "lucide-react";

export default function CenterStage() {
  return (
    <div className="relative flex h-full w-full flex-col items-center">
      {/* Welcome bar */}
      <div className="glass-strong neon-border-glow mt-1 flex items-center gap-2 rounded-full px-5 py-1.5 text-[10px] tracking-wide sm:mt-2 sm:px-8 sm:py-2 sm:text-sm">
        <span className="text-purple-100/80">WELCOME,</span>
        <span className="font-display font-bold text-amber-300 neon-text">NEO_RAIDER</span>
        <span className="text-purple-100/50">|</span>
        <span className="font-display font-semibold text-purple-100/80">ARCADE NEXUS CAFE</span>
      </div>

      {/* Character */}
      <div className="relative mt-2 flex flex-1 items-end justify-center" style={{ width: "70%" }}>
        <div className="relative h-full max-h-[62vh] w-auto">
          <div className="absolute bottom-2 left-1/2 h-8 w-40 -translate-x-1/2 rounded-full bg-purple-500/40 blur-2xl" />
          <img
            src="/images/hero-character.png"
            alt="Character"
            className="animate-float relative z-10 h-full w-auto object-contain drop-shadow-[0_10px_25px_rgba(179,102,255,0.5)]"
          />
        </div>

        {/* Left mid stat cards */}
        <div className="absolute left-[-2rem] top-[18%] hidden flex-col gap-3 sm:flex md:left-[-4rem] lg:left-[-7rem]">
          <div className="glass-strong neon-border-glow w-32 rounded-xl px-3 py-2 md:w-36">
            <p className="text-[9px] tracking-wide text-purple-200/70">CURRENT PC</p>
            <p className="font-display text-base font-bold text-amber-300">
              14 <span className="text-[10px] font-normal text-purple-100/70">Occupied</span>
            </p>
          </div>
          <div className="glass-strong neon-border-glow w-32 rounded-xl px-3 py-2 md:w-36">
            <p className="text-[9px] tracking-wide text-purple-200/70">SESSION TIME</p>
            <p className="font-display text-base font-bold text-white">01:24:18</p>
          </div>
        </div>

        {/* Right mid stat cards */}
        <div className="absolute right-[-2rem] top-[14%] hidden flex-col gap-3 sm:flex md:right-[-4rem] lg:right-[-7rem]">
          <div className="glass-strong neon-border-glow w-36 rounded-xl px-3 py-2 md:w-40">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[9px] tracking-wide text-purple-200/70">
                <Star size={11} className="text-amber-300" /> LEVEL
              </span>
              <span className="rounded-full border border-purple-300/30 px-1.5 py-0.5 text-[8px] text-purple-200/70">
                144 <span className="text-[7px]">12ms</span>
              </span>
            </div>
            <p className="font-display text-xl font-bold text-white">45</p>
            <p className="mb-1 text-[8px] text-purple-200/60">XP: 14500/15000</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-purple-400 to-amber-300" />
            </div>
          </div>

          <div className="glass-strong neon-border-glow flex w-36 items-center justify-between rounded-xl px-3 py-2 md:w-40">
            <div>
              <p className="flex items-center gap-1 text-[9px] tracking-wide text-purple-200/70">
                <Wifi size={11} className="text-sky-400" /> PING
              </p>
              <p className="font-display text-sm font-bold text-white">12ms</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-[9px] tracking-wide text-purple-200/70">
                <Gauge size={11} className="text-emerald-400" /> FPS
              </p>
              <p className="font-display text-sm font-bold text-white">144</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
