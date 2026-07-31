import React from 'react';
import { Achievement, GameState } from '../types';
import { 
  Trophy, 
  Sparkles, 
  Check, 
  Award, 
  TrendingUp, 
  Coins, 
  Globe, 
  Hammer, 
  RefreshCw, 
  Wrench 
} from 'lucide-react';

interface AchievementsTabProps {
  achievements: Achievement[];
  gameState: GameState;
  onClaimReward: (achievementId: string) => void;
}

export default function AchievementsTab({ achievements, gameState, onClaimReward }: AchievementsTabProps) {
  
  const getAchievementIcon = (type: string) => {
    const cls = "w-5 h-5";
    switch (type) {
      case 'total_breaks': return <Hammer className={`${cls} text-amber-500`} />;
      case 'total_coins': return <Coins className={`${cls} text-amber-400`} />;
      case 'max_world': return <Globe className={`${cls} text-cyan-400`} />;
      case 'total_upgrades': return <TrendingUp className={`${cls} text-rose-400`} />;
      case 'prestiges': return <RefreshCw className={`${cls} text-purple-400`} />;
      case 'tools_unlocked': return <Wrench className={`${cls} text-emerald-400`} />;
      default: return <Award className={`${cls} text-yellow-400`} />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="achievements-tab-container">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="achievements-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400 animate-bounce" />
            Trophy Hall
          </h2>
          <p className="text-xs text-slate-400">Complete prestigious challenges and claim free Gems</p>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1" id="achievements-grid-list">
        {achievements.map((ach) => {
          const isCompleted = ach.current >= ach.target;
          const isClaimed = gameState.achievementsClaimed.includes(ach.id);
          const percent = Math.min(Math.round((ach.current / ach.target) * 100), 100);

          return (
            <div
              key={ach.id}
              className={`relative flex flex-col justify-between bg-slate-900/40 border rounded-xl p-3.5 transition-all ${
                isClaimed
                  ? 'border-slate-950/40 bg-slate-950/10 opacity-60'
                  : isCompleted
                  ? 'border-yellow-500/40 bg-slate-900/70 shadow shadow-yellow-950/10'
                  : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
              id={`achievement-card-${ach.id}`}
            >
              {/* Core Icon and Text Details */}
              <div className="flex gap-3">
                <div 
                  className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950 border shadow-md ${
                    isCompleted && !isClaimed ? 'border-yellow-500/30' : 'border-slate-800'
                  }`}
                >
                  {getAchievementIcon(ach.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-200 text-sm truncate">{ach.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ach.description}</p>
                </div>
              </div>

              {/* Progress Slider Bar */}
              <div className="mt-4 flex flex-col gap-1" id={`ach-progress-bar-${ach.id}`}>
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
                  <span>PROGRESS</span>
                  <span>{formatNumber(ach.current)} / {formatNumber(ach.target)} ({percent}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/60">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isCompleted ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-teal-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Claim Action Row */}
              <div className="flex items-center justify-between mt-3.5 border-t border-slate-800/40 pt-2.5">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400 font-medium">Reward: </span>
                  <span className="flex items-center gap-0.5 font-bold text-cyan-400 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    +{ach.rewardGems}
                  </span>
                </div>

                {isClaimed ? (
                  <span className="flex items-center gap-1 text-slate-500 font-bold text-xs select-none">
                    <Check className="w-3.5 h-3.5 text-slate-500 stroke-[3]" /> CLAIMED
                  </span>
                ) : isCompleted ? (
                  <button
                    onClick={() => onClaimReward(ach.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 hover:from-yellow-400 hover:to-amber-400 active:scale-95 font-bold text-xs transition-all cursor-pointer"
                    id={`ach-claim-btn-${ach.id}`}
                  >
                    CLAIM GEMS
                  </button>
                ) : (
                  <span className="text-slate-500 font-bold text-xs select-none uppercase tracking-wider">
                    IN PROGRESS
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
