import React from 'react';
import { Clock, Coins, Sparkles, Gem } from 'lucide-react';

interface OfflineModalProps {
  coinsEarned: number;
  timeAwaySec: number;
  gemCostToDouble: number;
  playerGems: number;
  onCollect: () => void;
  onDouble: () => void;
}

export default function OfflineModal({
  coinsEarned,
  timeAwaySec,
  gemCostToDouble,
  playerGems,
  onCollect,
  onDouble,
}: OfflineModalProps) {
  
  const formatTime = (totalSec: number) => {
    if (totalSec < 60) return `${totalSec} seconds`;
    const mins = Math.floor(totalSec / 60);
    if (mins < 60) return `${mins} minutes`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs < 24) return `${hrs} hours ${remainingMins} mins`;
    const days = Math.floor(hrs / 24);
    const remainingHrs = hrs % 24;
    return `${days} days ${remainingHrs} hours`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const canDouble = playerGems >= gemCostToDouble;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      id="offline-earnings-overlay"
    >
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 text-center shadow-2xl shadow-slate-950"
        id="offline-earnings-container"
      >
        {/* Glow behind */}
        <div className="absolute inset-x-0 -top-12 h-24 bg-gradient-to-b from-amber-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Circular Clock Emblem */}
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-950/15">
          <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Welcome Back, Destroyer!</h2>
        <p className="text-xs text-slate-400 mt-1">
          Your helpers worked tirelessly while you were away for:
        </p>
        <span className="inline-block mt-1.5 px-3 py-1 bg-slate-950 border border-slate-900 rounded-full font-mono font-bold text-xs text-amber-400">
          {formatTime(timeAwaySec)}
        </span>

        {/* Earning stats block */}
        <div className="my-6 bg-slate-950/50 border border-slate-900 rounded-xl p-4 flex items-center justify-center gap-2" id="offline-earned-stats-box">
          <Coins className="w-6 h-6 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-2xl font-mono font-extrabold text-slate-200">
            {formatNumber(coinsEarned)}
          </span>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">COINS</span>
        </div>

        {/* Options / Action Buttons */}
        <div className="flex flex-col gap-2.5 mt-5" id="offline-action-buttons">
          {/* Double Button */}
          <button
            onClick={onDouble}
            disabled={!canDouble}
            className={`w-full py-3 px-5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              canDouble
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 active:scale-98 shadow-amber-500/10'
                : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            id="double-earnings-btn"
          >
            <Sparkles className="w-4 h-4 animate-bounce" />
            <span>DOUBLE WITH GEMS</span>
            <span className="font-mono flex items-center gap-0.5 ml-1 bg-slate-950/25 px-1.5 py-0.5 rounded text-[11px] font-extrabold border border-amber-500/10">
              <Gem className="w-3 h-3 text-cyan-400" /> {gemCostToDouble}
            </span>
          </button>

          {/* Standard Collect Button */}
          <button
            onClick={onCollect}
            className="w-full py-2.5 px-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100 active:scale-98 font-bold text-xs transition-all cursor-pointer select-none"
            id="collect-earnings-standard-btn"
          >
            COLLECT STANDARD AMOUNT
          </button>
        </div>

        {/* Small warning if can't afford */}
        {!canDouble && (
          <p className="text-[10px] text-slate-500 mt-2.5 font-medium">
            You don't have enough Gems ({playerGems} / {gemCostToDouble}) to double.
          </p>
        )}
      </div>
    </div>
  );
}
