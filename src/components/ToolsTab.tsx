import React from 'react';
import { Tool, GameState, World } from '../types';
import { 
  Wrench, 
  Lock, 
  Check, 
  Sparkles, 
  Compass, 
  Zap,
  Flame,
  Bomb,
  Hammer
} from 'lucide-react';

interface ToolsTabProps {
  tools: Tool[];
  worlds: World[];
  gameState: GameState;
  onUnlockTool: (id: string) => void;
  onEquipTool: (id: string) => void;
}

export default function ToolsTab({ tools, worlds, gameState, onUnlockTool, onEquipTool }: ToolsTabProps) {
  
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const getToolIcon = (iconName: string, color: string) => {
    const cls = "w-6 h-6 stroke-[1.75]";
    let iconEl = <Wrench style={{ color }} className={cls} />;

    switch (iconName) {
      case 'pickaxe': iconEl = <Wrench style={{ color }} className={cls} />; break;
      case 'drill': iconEl = <Compass style={{ color }} className={cls} />; break;
      case 'hammer': iconEl = <Hammer style={{ color }} className={cls} />; break;
      case 'sledgehammer': iconEl = <Hammer style={{ color }} className={`${cls} rotate-45`} />; break;
      case 'laser_drill': iconEl = <Zap style={{ color }} className={cls} />; break;
      case 'plasma_cutter': iconEl = <Flame style={{ color }} className={cls} />; break;
      case 'tnt_bomb': iconEl = <Bomb style={{ color }} className={cls} />; break;
      case 'quantum_breaker': iconEl = <Sparkles style={{ color }} className={cls} />; break;
      default: iconEl = <Wrench style={{ color }} className={cls} />; break;
    }

    return (
      <div 
        className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border bg-[#0d1322]/90 shadow-md flex-none"
        style={{ borderColor: color + '50', boxShadow: `0 0 12px ${color}20` }}
      >
        {iconEl}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="tools-tab-container">
      {/* Header */}
      <div className="flex-none flex flex-col gap-2 border-b border-slate-800 pb-2 md:pb-3" id="tools-tab-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              Smash Arsenal
            </h2>
            <p className="text-xs text-slate-400">Unlock & equip pickaxes & weapons for higher tap multipliers</p>
          </div>
        </div>

        {/* Currently Equipped Weapon Banner */}
        {(() => {
          const equippedTool = tools.find(t => t.id === gameState.equippedToolId) || tools[0];
          return (
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-xl p-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                {getToolIcon(equippedTool.icon, equippedTool.color)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">EQUIPPED WEAPON:</span>
                    <span className="text-sm font-bold text-white">{equippedTool.name}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Tap Damage Multiplier: <span className="font-bold text-amber-400">{equippedTool.multiplier}x</span>
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> ACTIVE
              </span>
            </div>
          );
        })()}
      </div>

      {/* Tools Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto pr-1" id="tools-grid-list">
        {tools.map((tool) => {
          const isUnlocked = gameState.toolsUnlocked.includes(tool.id);
          const isEquipped = gameState.equippedToolId === tool.id;
          const targetWorld = worlds.find(w => w.id === tool.requiredWorld);
          
          // Check unlock availability based on world ID reached
          const worldReached = gameState.currentWorldId >= tool.requiredWorld;
          const canAfford = gameState.coins >= tool.cost;
          const canBuy = !isUnlocked && worldReached && canAfford;

          return (
            <div
              key={tool.id}
              className={`relative flex flex-col justify-between bg-slate-900/40 border rounded-xl p-4 transition-all overflow-hidden ${
                isEquipped
                  ? 'border-emerald-500 bg-slate-900/80 shadow-md shadow-emerald-950/20'
                  : isUnlocked
                  ? 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                  : 'border-slate-950/60 bg-slate-950/20 opacity-75'
              }`}
              id={`tool-card-${tool.id}`}
            >
              {/* Outer decorative neon strip for equipped item */}
              {isEquipped && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
              )}

              {/* Tool Icon and Core Info */}
              <div className="flex gap-3">
                <div 
                  className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shadow-inner"
                  style={{ boxShadow: isEquipped ? `inset 0 0 10px ${tool.color}22` : undefined }}
                >
                  {getToolIcon(tool.icon, tool.color)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-slate-200 text-sm truncate">{tool.name}</h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400">
                      Req: World {tool.requiredWorld}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span 
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border"
                      style={{ 
                        color: tool.color, 
                        borderColor: tool.color + '44', 
                        backgroundColor: tool.color + '0a' 
                      }}
                    >
                      {tool.multiplier}x Multiplier
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 min-h-[2rem]">
                {tool.description}
              </p>

              {/* Footer / Buttons */}
              <div className="flex items-center justify-between mt-4 border-t border-slate-800/40 pt-3">
                {isUnlocked ? (
                  isEquipped ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs select-none">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> EQUIPPED
                    </span>
                  ) : (
                    <button
                      onClick={() => onEquipTool(tool.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      id={`tool-equip-btn-${tool.id}`}
                    >
                      EQUIP
                    </button>
                  )
                ) : !worldReached ? (
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Unlocks in {targetWorld?.name || `World ${tool.requiredWorld}`}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onUnlockTool(tool.id)}
                    disabled={!canAfford}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    id={`tool-unlock-btn-${tool.id}`}
                  >
                    <span>Unlock</span>
                    <span className="font-mono font-bold">({formatNumber(tool.cost)})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
