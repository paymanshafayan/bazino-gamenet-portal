import { Trophy, Gift, Medal } from "lucide-react";

const events = [
  {
    icon: Trophy,
    color: "text-amber-300",
    title: "CS2 TOURNAMENT",
    detail: "May 15",
    action: "Register",
  },
  {
    icon: Gift,
    color: "text-pink-400",
    title: "ENERGY DRINK BOGO",
    detail: "$5.99",
    action: "Shop Now",
  },
];

const rankings = [
  { rank: 1, name: "Ganratavl0", color: "text-amber-300" },
  { rank: 2, name: "NEO_RAIDER", color: "text-purple-200", highlight: true },
  { rank: 3, name: "Alahmana", color: "text-purple-200" },
  { rank: 4, name: "Silent_Fox", color: "text-purple-200" },
];

export default function RightPanel() {
  return (
    <div className="perspective-wrap hidden lg:block">
      <div className="tilt-right glass-strong neon-border-glow w-64 rounded-2xl p-3.5 xl:w-72">
        <h2 className="font-display mb-3 text-sm font-bold tracking-widest text-white/90">
          LIVE EVENTS &amp; OFFERS
        </h2>
        <div className="mb-4 space-y-2.5">
          {events.map((e) => (
            <div key={e.title} className="glass flex items-center gap-2.5 rounded-xl border border-white/10 p-2.5">
              <div className="glass-strong flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <e.icon size={15} className={e.color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-[10px] font-bold tracking-wide text-white">{e.title}</p>
                <p className="text-[10px] text-purple-200/70">
                  {e.detail} · <span className="text-amber-300">{e.action}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-display mb-3 text-sm font-bold tracking-widest text-white/90">
          GLOBAL RANKINGS
        </h2>
        <div className="space-y-1.5">
          {rankings.map((r) => (
            <div
              key={r.rank}
              className={`glass flex items-center gap-2.5 rounded-lg border border-white/10 px-2 py-1.5 ${
                r.highlight ? "border-amber-300/40 bg-amber-300/5" : ""
              }`}
            >
              <span className={`font-display w-3.5 text-xs font-bold ${r.color}`}>{r.rank}</span>
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=1a0b2e&color=d8b4fe&bold=true&size=64`}
                alt={r.name}
                className="h-6 w-6 rounded-full border border-white/20"
              />
              <span className="flex-1 truncate text-[11px] font-semibold text-purple-50">{r.name}</span>
              <Medal size={13} className={r.rank === 1 ? "text-amber-300" : "text-purple-300/50"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
