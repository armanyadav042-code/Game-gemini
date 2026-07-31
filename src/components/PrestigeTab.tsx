import React from 'react';
import { GameState } from '../types';
import { 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  Coins, 
  Clock, 
  Lock, 
  ShieldAlert 
} from 'lucide-react';

interface PrestigeTabProps {
  gameState: GameState;
  onPrestige: () => void;
}

export default function PrestigeTab({ gameState, onPrestige }: PrestigeTabProps) {
  
  // Prestige calculations
  const totalLifetimeCoins = gameState.statTotalCoinsEarned;
  
  // Points formula: sqrt(lifetime_coins / 20000)
  // Ensures steady scaling
  const calculatedTotalPoints = Math.floor(Math.sqrt(totalLifetimeCoins / 20000));
  const claimablePoints = Math.max(0, calculatedTotalPoints - gameState.prestigePoints);
  
  const currentMultiplierPercent = Math.round((gameState.prestigeMultiplier - 1.0) * 100);
  const nextMultiplierPercent = Math.round(((1.0 + (gameState.prestigePoints + claimablePoints) * 0.05) - 1.0) * 100);

  const canPrestige = claimablePoints > 0;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="prestige-tab-container">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="prestige-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
            Quantum Rebirth
          </h2>
          <p className="text-xs text-slate-400">Reset your material wall progress for permanent celestial power</p>
        </div>
      </div>

      {/* Prestige Stats Dashboard */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-3 gap-3" id="prestige-dash-grid">
        <div className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Lifetime Coins</span>
          <span className="block text-lg font-mono font-extrabold text-amber-400 mt-1">
            {formatNumber(totalLifetimeCoins)}
          </span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Rebirth Points Owned</span>
          <span className="block text-lg font-mono font-extrabold text-purple-400 mt-1">
            {gameState.prestigePoints}
          </span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Damage Multiplier</span>
          <span className="block text-lg font-mono font-extrabold text-emerald-400 mt-1">
            +{currentMultiplierPercent}%
          </span>
        </div>
      </div>

      {/* Rebirth Main Portal */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center bg-slate-950/60 border border-slate-900 rounded-xl p-4 md:p-6 text-center" id="prestige-portal">
        
        {/* Emblem */}
        <div className="relative w-20 h-20 rounded-full bg-slate-900 border-2 border-purple-500/50 flex items-center justify-center mb-4 shadow-xl shadow-purple-950/10">
          <RefreshCw className={`w-10 h-10 text-purple-400 ${canPrestige ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <div className="absolute inset-0 rounded-full border border-purple-500/10 scale-125 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
        </div>

        <h3 className="text-base font-bold text-slate-100">Celestial Rebirth Chamber</h3>
        
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Rebirth resets your gold, regular upgrades, and wall progress, but grants permanent rebirth points.
          Each point permanently boosts your <span className="text-emerald-400 font-bold">Damage & Income by +5%</span>!
        </p>

        {/* Claim Info Box */}
        <div className="mt-5 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl w-full max-w-sm flex items-center justify-between" id="rebirth-claim-info-box">
          <div className="text-left">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">CLAIMABLE POINTS</span>
            <span className="text-2xl font-mono font-extrabold text-purple-400">
              +{claimablePoints}
            </span>
          </div>

          <div className="text-right text-xs font-semibold">
            <span className="text-slate-500 text-[10px] uppercase block">DAMAGE BOOST</span>
            <span className="text-slate-300 font-bold font-mono">
              +{currentMultiplierPercent}%
            </span>
            <span className="text-emerald-400 font-bold font-mono block">
              → +{nextMultiplierPercent}%
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 w-full max-w-sm">
          {canPrestige ? (
            <button
              onClick={onPrestige}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-950/50 cursor-pointer active:scale-98 border border-purple-400/30 select-none animate-pulse"
              id="active-prestige-trigger"
            >
              INITIATE REBIRTH (+{claimablePoints} Points)
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-3 px-5 rounded-xl bg-slate-900/80 border border-slate-800/60 text-slate-500 text-xs font-bold select-none" id="locked-prestige-indicator">
              <Lock className="w-4 h-4 text-slate-600" />
              <span>Earn {formatNumber(Math.pow(gameState.prestigePoints + 1, 2) * 20000)} total lifetime coins to claim a point</span>
            </div>
          )}
        </div>

        {/* Safety Warning */}
        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500/60" />
          <span>Equipped tools, Gems, and Achievements are NEVER reset.</span>
        </div>

      </div>
    </div>
  );
}
