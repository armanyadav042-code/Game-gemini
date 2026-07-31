import React, { useState } from 'react';
import { Upgrade, GameState } from '../types';
import { 
  Hammer, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Coins, 
  Flame,
  Award,
  ChevronRight
} from 'lucide-react';

interface UpgradesTabProps {
  upgrades: Upgrade[];
  gameState: GameState;
  onBuyUpgrade: (id: string, count: number) => void;
}

export default function UpgradesTab({ upgrades, gameState, onBuyUpgrade }: UpgradesTabProps) {
  const [buyMode, setBuyMode] = useState<1 | 10 | 'max'>(1);

  const getIcon = (iconName: string) => {
    const wrap = (children: React.ReactNode, bgGrad: string, borderCls: string, shadowCls: string) => (
      <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${bgGrad} ${borderCls} border flex items-center justify-center ${shadowCls} flex-none transition-transform hover:scale-105`}>
        {children}
      </div>
    );

    switch (iconName) {
      case 'hammer': return wrap(<Hammer className="w-5 h-5 text-amber-300" />, 'from-amber-950 to-yellow-900', 'border-amber-500/50', 'shadow-[0_0_12px_rgba(245,158,11,0.25)]');
      case 'zap': return wrap(<Zap className="w-5 h-5 text-amber-300 animate-pulse" />, 'from-amber-950 to-yellow-950', 'border-amber-400/60', 'shadow-[0_0_12px_rgba(245,158,11,0.3)]');
      case 'sparkles': return wrap(<Sparkles className="w-5 h-5 text-rose-300" />, 'from-rose-950 to-pink-950', 'border-rose-400/60', 'shadow-[0_0_12px_rgba(244,63,94,0.3)]');
      case 'trending-up': return wrap(<TrendingUp className="w-5 h-5 text-rose-300" />, 'from-rose-950 to-orange-950', 'border-rose-500/50', 'shadow-[0_0_12px_rgba(244,63,94,0.25)]');
      case 'clock': return wrap(<Clock className="w-5 h-5 text-sky-300" />, 'from-sky-950 to-cyan-950', 'border-sky-400/60', 'shadow-[0_0_12px_rgba(56,189,248,0.3)]');
      case 'coins': return wrap(<Coins className="w-5 h-5 text-emerald-300" />, 'from-emerald-950 to-teal-950', 'border-emerald-400/60', 'shadow-[0_0_12px_rgba(16,185,129,0.3)]');
      case 'flame': return wrap(<Flame className="w-5 h-5 text-orange-300" />, 'from-orange-950 to-amber-950', 'border-orange-400/60', 'shadow-[0_0_12px_rgba(249,115,22,0.3)]');
      default: return wrap(<Award className="w-5 h-5 text-emerald-300" />, 'from-emerald-950 to-teal-950', 'border-emerald-500/50', 'shadow-[0_0_12px_rgba(16,185,129,0.25)]');
    }
  };

  // Calculate the cost for buying N levels of an upgrade
  const calculateCost = (upgrade: Upgrade, currentLevel: number, count: number | 'max'): { totalCost: number; boughtCount: number } => {
    let totalCost = 0;
    let boughtCount = 0;
    let currentCost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel);
    let level = currentLevel;

    if (count === 'max') {
      let coinsRemaining = gameState.coins;
      while (coinsRemaining >= currentCost && (!upgrade.maxLevel || level < upgrade.maxLevel)) {
        totalCost += currentCost;
        coinsRemaining -= currentCost;
        boughtCount++;
        level++;
        currentCost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level);
      }
    } else {
      for (let i = 0; i < count; i++) {
        if (upgrade.maxLevel && level >= upgrade.maxLevel) break;
        totalCost += currentCost;
        level++;
        currentCost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level);
        boughtCount++;
      }
    }

    return { totalCost, boughtCount };
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const getUpgradeValueString = (upgrade: Upgrade, level: number) => {
    const val = upgrade.baseValue + level * upgrade.valueMultiplier;
    switch (upgrade.id) {
      case 'crit_chance':
        return `${(val * 100).toFixed(0)}%`;
      case 'crit_damage':
      case 'block_value':
      case 'helper_power':
        return `${val.toFixed(1)}x`;
      case 'attack_speed':
        return `${(val * 100).toFixed(0)}%`;
      default:
        return `+${formatNumber(val)}`;
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="upgrades-tab-container">
      {/* Tab Header Controls */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="upgrades-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
            Smash Upgrades
          </h2>
          <p className="text-xs text-slate-400">Increase clicking strength and active bonuses</p>
        </div>

        {/* Buy Multiplier Selector */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold" id="buy-multiplier-selector">
          {( [1, 10, 'max'] as const ).map((mode) => (
            <button
              key={mode}
              onClick={() => setBuyMode(mode)}
              className={`px-3 py-1.5 rounded-md transition-all uppercase ${
                buyMode === mode
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              id={`buy-mode-btn-${mode}`}
            >
              {mode === 'max' ? 'Max' : `x${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* Upgrades Scrollable Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent" id="upgrades-grid-list">
        {upgrades.map((upgrade) => {
          const currentLevel = gameState.upgrades[upgrade.id] || 0;
          const { totalCost, boughtCount } = calculateCost(upgrade, currentLevel, buyMode);
          const isMaxed = upgrade.maxLevel && currentLevel >= upgrade.maxLevel;
          const canAfford = totalCost <= gameState.coins && boughtCount > 0;

          return (
            <div
              key={upgrade.id}
              className={`relative flex flex-col justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:bg-slate-900/90 group ${
                canAfford ? 'hover:border-amber-500/40' : ''
              }`}
              id={`upgrade-card-${upgrade.id}`}
            >
              <div className="flex gap-3">
                {/* Icon Wrapper */}
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-slate-700/80">
                  {getIcon(upgrade.icon)}
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 text-sm truncate group-hover:text-slate-100 transition-colors">
                      {upgrade.name}
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/60">
                      Lv.{currentLevel}
                      {upgrade.maxLevel && ` / ${upgrade.maxLevel}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{upgrade.description}</p>
                </div>
              </div>

              {/* Status and Cost Button */}
              <div className="flex items-center justify-between mt-4 border-t border-slate-800/50 pt-2.5">
                {/* Stats comparison */}
                <div className="text-xs font-mono">
                  <span className="text-slate-400">Value: </span>
                  <span className="text-slate-200 font-bold">{getUpgradeValueString(upgrade, currentLevel)}</span>
                  {!isMaxed && boughtCount > 0 && (
                    <>
                      <ChevronRight className="inline-block w-3 h-3 text-slate-500 mx-1" />
                      <span className="text-amber-400 font-bold">
                        {getUpgradeValueString(upgrade, currentLevel + boughtCount)}
                      </span>
                    </>
                  )}
                </div>

                {/* Purchase Button */}
                <button
                  onClick={() => {
                    if (canAfford) {
                      onBuyUpgrade(upgrade.id, boughtCount);
                    }
                  }}
                  disabled={!canAfford || isMaxed}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md select-none ${
                    isMaxed
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent'
                      : canAfford
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 active:scale-95 cursor-pointer shadow-amber-500/10'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-300 border border-slate-800 hover:border-slate-700 cursor-not-allowed'
                  }`}
                  id={`upgrade-buy-btn-${upgrade.id}`}
                >
                  <Coins className={`w-3.5 h-3.5 ${canAfford && !isMaxed ? 'animate-spin' : ''}`} />
                  {isMaxed ? (
                    'MAXED'
                  ) : (
                    <div className="text-left font-bold font-mono">
                      <span>{buyMode === 'max' ? `Buy +${boughtCount}` : buyMode === 10 ? `Buy +${boughtCount}` : 'Upgrade'}</span>
                      <span className="block text-[10px] opacity-90">{formatNumber(totalCost)}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
