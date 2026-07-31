import React, { useState } from 'react';
import { Helper, GameState } from '../types';
import { 
  Users, 
  Coins, 
  ChevronRight, 
  Bot, 
  Cpu, 
  Flame, 
  Hammer,
  HelpCircle
} from 'lucide-react';

interface HelpersTabProps {
  helpers: Helper[];
  gameState: GameState;
  onBuyHelper: (id: string, count: number) => void;
}

export default function HelpersTab({ helpers, gameState, onBuyHelper }: HelpersTabProps) {
  const [buyMode, setBuyMode] = useState<1 | 10 | 'max'>(1);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const getHelperIcon = (iconName: string, color: string) => {
    const cls = "w-5 h-5 md:w-6 md:h-6";
    let iconEl = <HelpCircle style={{ color }} className={cls} />;

    switch (iconName) {
      case 'hammer': iconEl = <Hammer style={{ color }} className={cls} />; break;
      case 'drone': iconEl = <Cpu style={{ color }} className={cls} />; break;
      case 'laser': iconEl = <Flame style={{ color }} className={cls} />; break;
      case 'bot': iconEl = <Bot style={{ color }} className={cls} />; break;
      default: iconEl = <HelpCircle style={{ color }} className={cls} />; break;
    }

    return (
      <div 
        className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border bg-[#0d1322]/90 shadow-md flex-none"
        style={{ borderColor: color + '50', boxShadow: `0 0 12px ${color}20` }}
      >
        {iconEl}
      </div>
    );
  };

  // Helper level pricing calculator
  const calculateHelperCost = (helper: Helper, currentLevel: number, count: number | 'max'): { totalCost: number; boughtCount: number } => {
    let totalCost = 0;
    let boughtCount = 0;
    let currentCost = helper.baseCost * Math.pow(helper.costMultiplier, currentLevel);
    let level = currentLevel;

    if (count === 'max') {
      let coinsRemaining = gameState.coins;
      while (coinsRemaining >= currentCost) {
        totalCost += currentCost;
        coinsRemaining -= currentCost;
        boughtCount++;
        level++;
        currentCost = helper.baseCost * Math.pow(helper.costMultiplier, level);
      }
    } else {
      for (let i = 0; i < count; i++) {
        totalCost += currentCost;
        level++;
        currentCost = helper.baseCost * Math.pow(helper.costMultiplier, level);
        boughtCount++;
      }
    }

    return { totalCost, boughtCount };
  };

  // Calculate cumulative helper stats
  const totalHelperDps = helpers.reduce((sum, h) => {
    const lvl = gameState.helpers[h.id] || 0;
    const itemDps = lvl * h.baseDps * (gameState.prestigeMultiplier);
    return sum + itemDps;
  }, 0);

  return (
    <div className="flex flex-col gap-4 h-full" id="helpers-tab-container">
      {/* Header controls */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="helpers-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            Helper Guild
          </h2>
          <p className="text-xs text-slate-400">Recruit automated systems to break walls while idle</p>
        </div>

        {/* Buy multiplier */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
          {( [1, 10, 'max'] as const ).map((mode) => (
            <button
              key={mode}
              onClick={() => setBuyMode(mode)}
              className={`px-3 py-1.5 rounded-md transition-all uppercase ${
                buyMode === mode
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              id={`helper-buy-mode-${mode}`}
            >
              {mode === 'max' ? 'Max' : `x${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats board */}
      <div className="flex-none bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between" id="helpers-quick-stats">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Helper DPS</span>
          <span className="block text-xl font-mono font-extrabold text-emerald-400 mt-0.5">
            {formatNumber(totalHelperDps)}/s
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Helpers Active</span>
          <span className="block text-lg font-mono font-bold text-slate-300 mt-0.5">
            {helpers.reduce((sum, h) => sum + (gameState.helpers[h.id] || 0), 0)}
          </span>
        </div>
      </div>

      {/* Helpers List Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1" id="helpers-grid-list">
        {helpers.map((helper) => {
          const currentLevel = gameState.helpers[helper.id] || 0;
          const { totalCost, boughtCount } = calculateHelperCost(helper, currentLevel, buyMode);
          const canAfford = totalCost <= gameState.coins && boughtCount > 0;

          // Multiply by prestige bonuses
          const singleCurrentDps = currentLevel * helper.baseDps * (gameState.prestigeMultiplier);
          const singleNextDps = (currentLevel + boughtCount) * helper.baseDps * (gameState.prestigeMultiplier);

          return (
            <div
              key={helper.id}
              className={`relative flex flex-col justify-between bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:bg-slate-900/80 group ${
                canAfford ? 'hover:border-amber-500/40' : ''
              }`}
              id={`helper-card-${helper.id}`}
            >
              <div className="flex gap-3">
                {/* Icon Circle */}
                <div 
                  className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-slate-700/80 shadow-md"
                  style={{ boxShadow: currentLevel > 0 ? `inset 0 0 8px ${helper.color}15` : undefined }}
                >
                  {getHelperIcon(helper.icon, helper.color)}
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 text-sm truncate group-hover:text-slate-100">
                      {helper.name}
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/50">
                      Lv.{currentLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{helper.description}</p>
                </div>
              </div>

              {/* Stats detail and buying button */}
              <div className="flex items-center justify-between mt-4 border-t border-slate-800/50 pt-2.5">
                {/* DPS stats */}
                <div className="text-xs font-mono">
                  <span className="text-slate-400">DPS: </span>
                  <span className="text-emerald-400 font-bold">{formatNumber(singleCurrentDps)}/s</span>
                  {boughtCount > 0 && (
                    <>
                      <ChevronRight className="inline-block w-3 h-3 text-slate-500 mx-1" />
                      <span className="text-emerald-300 font-bold">
                        {formatNumber(singleNextDps)}/s
                      </span>
                    </>
                  )}
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => {
                    if (canAfford) {
                      onBuyHelper(helper.id, boughtCount);
                    }
                  }}
                  disabled={!canAfford}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md select-none cursor-pointer ${
                    canAfford
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 active:scale-95 shadow-amber-500/10'
                      : 'bg-slate-950 text-slate-500 border border-slate-800/80 cursor-not-allowed'
                  }`}
                  id={`helper-buy-btn-${helper.id}`}
                >
                  <Coins className={`w-3.5 h-3.5 ${canAfford ? 'animate-spin' : ''}`} />
                  <div className="text-left font-bold font-mono">
                    <span>{buyMode === 'max' ? `Hire +${boughtCount}` : `Hire +${boughtCount}`}</span>
                    <span className="block text-[10px] opacity-90">{formatNumber(totalCost)}</span>
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
