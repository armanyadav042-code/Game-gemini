import React from 'react';
import { World, GameState } from '../types';
import { 
  Globe, 
  Lock, 
  CheckCircle, 
  Play, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Skull 
} from 'lucide-react';

interface WorldsTabProps {
  worlds: World[];
  gameState: GameState;
  onSelectWorld: (worldId: number) => void;
}

export default function WorldsTab({ worlds, gameState, onSelectWorld }: WorldsTabProps) {
  
  const getMaterialIcon = (material: string) => {
    switch (material) {
      case 'wood': return <TrendingUp className="w-5 h-5 text-amber-700 animate-pulse" />;
      case 'stone': return <TrendingUp className="w-5 h-5 text-slate-500" />;
      case 'metal': return <Sparkles className="w-5 h-5 text-slate-300" />;
      case 'ice': return <Sparkles className="w-5 h-5 text-blue-300" />;
      case 'neon': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'lava': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'crystal': return <Sparkles className="w-5 h-5 text-purple-400 animate-bounce" />;
      case 'boss': return <Skull className="w-5 h-5 text-red-500 animate-pulse" />;
      default: return <Globe className="w-5 h-5 text-emerald-500" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="worlds-tab-container">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="worlds-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Wall Multiverse
          </h2>
          <p className="text-xs text-slate-400">Traverse parallel worlds of denser materials with higher payouts</p>
        </div>
      </div>

      {/* World Map Layout (Step-by-step track) */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1" id="worlds-list">
        {worlds.map((world, idx) => {
          const isUnlocked = gameState.currentWorldId >= world.id;
          const isActive = gameState.currentWorldId === world.id;
          const isCompleted = gameState.currentWorldId > world.id;
          
          // Calculate scale variables
          const hpScale = world.baseHp * Math.pow(world.hpMultiplier, world.id);
          const rewardScale = world.baseReward * Math.pow(world.rewardMultiplier, world.id);

          return (
            <div
              key={world.id}
              onClick={() => {
                if (isUnlocked && !isActive) {
                  onSelectWorld(world.id);
                }
              }}
              className={`relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-slate-900/90 border-cyan-500 shadow-md shadow-cyan-950/20'
                  : isCompleted
                  ? 'bg-slate-950/40 border-slate-800/80 cursor-pointer opacity-85 hover:bg-slate-900/30'
                  : isUnlocked
                  ? 'bg-slate-900/30 border-slate-800/80 cursor-pointer hover:bg-slate-900/50'
                  : 'bg-slate-950/10 border-slate-950/50 opacity-40 cursor-not-allowed select-none'
              }`}
              id={`world-row-${world.id}`}
            >
              {/* Left Column: Icon and name details */}
              <div className="flex items-center gap-3">
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
                    isActive 
                      ? 'bg-slate-950 border-cyan-500/40' 
                      : isCompleted 
                      ? 'bg-slate-950 border-slate-800' 
                      : 'bg-slate-950/40 border-transparent'
                  }`}
                >
                  {getMaterialIcon(world.material)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm ${isActive ? 'text-cyan-400' : 'text-slate-200'}`}>
                      World {world.id}: {world.name}
                    </h3>
                    {isActive && (
                      <span className="text-[9px] font-bold text-cyan-950 bg-cyan-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        CURRENT
                      </span>
                    )}
                  </div>
                  
                  {/* HP & Coin indicators */}
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono font-semibold text-slate-400">
                    <span className="flex items-center gap-1">
                      HP: <span className="text-slate-200 font-bold">{formatNumber(hpScale)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      Reward: <span className="text-amber-400 font-bold">{formatNumber(rewardScale)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Progress Slider (if active) */}
              {isActive && (
                <div className="flex flex-col gap-1 mt-3 md:mt-0 md:w-48 text-xs font-semibold" id="world-progress-panel">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>PROGRESS</span>
                    <span className="text-cyan-400 font-bold">{gameState.currentWorldWallIndex} / {world.wallsToNextWorld} Walls</span>
                  </div>
                  {/* Visual mini-bar */}
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full transition-all duration-300"
                      style={{ width: `${(gameState.currentWorldWallIndex / world.wallsToNextWorld) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Right Column: Unlock Button / Complete Indicators */}
              <div className="mt-3 md:mt-0 flex items-center justify-end" id={`world-action-col-${world.id}`}>
                {isCompleted ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs select-none">
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" /> CLEARED
                  </span>
                ) : isActive ? (
                  <span className="flex items-center gap-1.5 text-cyan-400 font-extrabold text-xs select-none">
                    <Play className="w-3.5 h-3.5 stroke-[3] animate-ping" /> SMASHING
                  </span>
                ) : isUnlocked ? (
                  <button
                    className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-slate-100 font-bold text-xs transition-all cursor-pointer"
                    id={`world-warp-btn-${world.id}`}
                  >
                    WARP BACK
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-600 font-bold text-xs select-none">
                    <Lock className="w-3.5 h-3.5 text-slate-700" /> LOCKED
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
