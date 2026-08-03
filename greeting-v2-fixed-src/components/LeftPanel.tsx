import { Zap, TrendingUp, Trophy } from "lucide-react";

const games = [
  {
    name: "NEON BLADE 8.0",
    tag: "Live",
    tagColor: "bg-red-500",
    img: "/images/game-neonblade.jpg",
    stats: [20, 20, 33],
  },
  {
    name: "SYNTHETIC DREAMS",
    tag: "New",
    tagColor: "bg-sky-500",
    img: "/images/game-synthdreams.jpg",
    stats: [30, 20, 35],
  },
  {
    name: "CYBER STRIKE",
    tag: "Popular",
    tagColor: "bg-amber-500",
    img: "/images/game-cyberstrike.jpg",
    stats: [35, 20, 55],
  },
];

export default function LeftPanel() {
  return (
    <div className="perspective-wrap hidden lg:block">
      <div className="tilt-left glass-strong neon-border-glow w-64 rounded-2xl p-3.5 xl:w-72">
        <h2 className="font-display mb-3 text-sm font-bold tracking-widest text-white/90">
          TOP GAMES
        </h2>
        <div className="space-y-3">
          {games.map((g) => (
            <div
              key={g.name}
              className="glass overflow-hidden rounded-xl border border-white/10 transition hover:border-amber-300/40"
            >
              <div className="relative h-20 w-full overflow-hidden">
                <img src={g.img} alt={g.name} className="h-full w-full object-cover" />
                <span
                  className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-white ${g.tagColor}`}
                >
                  {g.tag}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <p className="font-display absolute bottom-1 left-2 right-2 text-[11px] font-bold tracking-wide text-white drop-shadow">
                  {g.name}
                </p>
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[9px] text-purple-100/80">
                <span className="flex items-center gap-0.5"><TrendingUp size={10} className="text-emerald-400" />{g.stats[0]}%</span>
                <span className="flex items-center gap-0.5"><Zap size={10} className="text-sky-400" />{g.stats[1]}%</span>
                <span className="flex items-center gap-0.5"><Trophy size={10} className="text-amber-400" />{g.stats[2]}%</span>
              </div>
              <button className="font-display m-1.5 mt-0 block w-[calc(100%-0.75rem)] rounded-md bg-gradient-to-r from-amber-300 to-purple-400 py-1 text-[10px] font-bold tracking-wide text-slate-950 transition hover:brightness-110">
                PLAY NOW
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
