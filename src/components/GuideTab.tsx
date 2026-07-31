import React from 'react';
import { 
  Wrench, 
  Coins, 
  Zap, 
  Sparkles, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Award, 
  Flame, 
  Bot, 
  Layers,
  Hammer,
  Bomb,
  Compass
} from 'lucide-react';

export default function GuideTab() {
  const features = [
    'Tap to destroy walls and earn resources',
    'Automatic damage even while offline',
    'Tons of upgrades (Damage, Speed, Crit, Auto Damage, Offline Earning, etc.)',
    'Unlock powerful tools (Pickaxes, Drills, Hammers, Lasers, Bombs, and more)',
    'Hire Helpers & Drones to boost your power',
    'Discover new Worlds with unique walls',
    'Prestige System for permanent bonuses',
    'Daily Rewards, Achievements & Quests',
    'Satisfying effects, shakes and animations',
    'Responsive design for Desktop & Mobile'
  ];

  const toolsList = [
    { name: 'Pickaxe', level: 'Lv. 25', color: '#f59e0b', bg: 'bg-amber-950/40', border: 'border-amber-500/40' },
    { name: 'Drill', level: 'Lv. 35', color: '#3b82f6', bg: 'bg-blue-950/40', border: 'border-blue-500/40' },
    { name: 'Sledge Hammer', level: 'Lv. 45', color: '#e2e8f0', bg: 'bg-slate-900/40', border: 'border-slate-500/40' },
    { name: 'Laser Drill', level: 'Lv. 55', color: '#ef4444', bg: 'bg-rose-950/40', border: 'border-rose-500/40' },
    { name: 'TNT Bomb', level: 'Lv. 65', color: '#f97316', bg: 'bg-orange-950/40', border: 'border-orange-500/40' },
    { name: 'Big Bertha', level: 'Lv. 75', color: '#10b981', bg: 'bg-emerald-950/40', border: 'border-emerald-500/40' },
    { name: 'Plasma Cutter', level: 'Lv. 85', color: '#06b6d4', bg: 'bg-cyan-950/40', border: 'border-cyan-500/40' },
    { name: 'Quantum Breaker', level: 'Lv. 100', color: '#8b5cf6', bg: 'bg-purple-950/40', border: 'border-purple-500/40' },
  ];

  const worldsList = [
    { id: 1, name: 'Grass Wall', color: 'bg-emerald-600' },
    { id: 2, name: 'Wooden Wall', color: 'bg-amber-700' },
    { id: 3, name: 'Stone Wall', color: 'bg-slate-600' },
    { id: 4, name: 'Metal Wall', color: 'bg-blue-500' },
    { id: 5, name: 'Neon Wall', color: 'bg-purple-600' },
    { id: 6, name: 'Boss Wall', color: 'bg-rose-600' },
  ];

  return (
    <div className="flex flex-col gap-6 text-slate-100 pb-8">
      {/* HEADER BANNER */}
      <div className="flex flex-col items-center text-center bg-gradient-to-b from-[#121b2d] to-[#090d16] p-6 rounded-2xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-md mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          IDLE WALL <span className="text-amber-400 bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-transparent">DESTROYER</span>
        </h2>
        <p className="text-xs md:text-sm text-amber-400 font-bold uppercase tracking-wider mb-3">
          Smash. Upgrade. Destroy Everything!
        </p>
        <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
          Start with a simple pickaxe and break walls layer by layer. Collect resources, upgrade your power, unlock insane tools and helpers, discover new worlds and become the ultimate Wall Destroyer!
        </p>
      </div>

      {/* CORE LOOP */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">
          CORE LOOP
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Hammer className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-200">Hit the Wall</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="text-[11px] font-bold text-slate-200">Earn Blocks & Coins</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-200">Upgrade Power</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Layers className="w-5 h-5 text-sky-400" />
            <span className="text-[11px] font-bold text-slate-200">Destroy Stronger Walls</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <Globe className="w-5 h-5 text-purple-400" />
            <span className="text-[11px] font-bold text-slate-200">Unlock New Worlds</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5">
            <RefreshCw className="w-5 h-5 text-amber-300" />
            <span className="text-[11px] font-bold text-slate-200">Prestige & Grow</span>
          </div>
        </div>
      </div>

      {/* KEY FEATURES */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
          KEY FEATURES
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-none" />
              <span className="text-xs text-slate-200 leading-snug">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TOOLS EXAMPLES */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
          DESTRUCTIVE TOOLS
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {toolsList.map((t, i) => (
            <div key={i} className={`${t.bg} ${t.border} border rounded-xl p-2.5 flex flex-col items-center text-center gap-1`}>
              <span className="text-xs font-bold text-slate-100">{t.name}</span>
              <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-black/50 text-amber-400">
                {t.level}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* WORLDS ROADMAP */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
          WORLDS DISCOVERY
        </h3>
        <div className="flex flex-wrap items-center justify-around gap-2 text-center">
          {worldsList.map((w, i) => (
            <React.Fragment key={w.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-xl ${w.color} border border-white/20 shadow-md flex items-center justify-center font-bold text-xs text-white`}>
                  #{w.id}
                </div>
                <span className="text-[10px] font-bold text-slate-300">{w.name}</span>
              </div>
              {i < worldsList.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
