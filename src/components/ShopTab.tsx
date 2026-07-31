import React, { useState, useEffect } from 'react';
import { GameState } from '../types';
import { 
  ShoppingBag, 
  Sparkles, 
  Coins, 
  Clock, 
  Zap, 
  Flame, 
  Gift,
  HelpCircle,
  Gem,
  Award,
  Dice5
} from 'lucide-react';
import { audio } from './AudioEngine';

interface ShopTabProps {
  gameState: GameState;
  onBuyPermanentBoost: (boostId: string, gemCost: number) => void;
  onOpenMysteryChest: (gemCost: number) => void;
  onClaimDailyReward: (gems: number, coins: number) => void;
}

export default function ShopTab({ 
  gameState, 
  onBuyPermanentBoost, 
  onOpenMysteryChest, 
  onClaimDailyReward 
}: ShopTabProps) {
  
  // Timer for daily chest: 15-minute cooldown for high engagement or 24 hrs?
  // Let's use 15 minutes (900 seconds) so players can test it easily!
  const COOLDOWN_SEC = 300; // 5 minutes cooldown for responsive testing
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [chestOpening, setChestOpening] = useState<boolean>(false);
  const [chestResult, setChestResult] = useState<{ gems: number; coins: number } | null>(null);

  useEffect(() => {
    const checkCooldown = () => {
      const now = Date.now();
      const elapsedMs = now - gameState.dailyRewardClaimedTime;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, COOLDOWN_SEC - elapsedSec);
      setTimeLeft(remaining);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [gameState.dailyRewardClaimedTime]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClaimChest = () => {
    if (timeLeft > 0) return;
    
    // Play sound and trigger claim
    audio.playPrestige();
    const gemReward = 15 + Math.floor(Math.random() * 20); // 15-35 gems
    const coinReward = Math.max(250, Math.floor(gameState.statTotalCoinsEarned * 0.05)); // 5% of lifetime earnings or min 250
    
    onClaimDailyReward(gemReward, coinReward);
  };

  const [openingLootbox, setOpeningLootbox] = useState(false);
  const [lootResult, setLootResult] = useState<string | null>(null);

  const handleOpenChest = (cost: number) => {
    if (gameState.gems < cost) {
      audio.playLocked();
      return;
    }
    audio.playBuy();
    setOpeningLootbox(true);
    setLootResult(null);

    // Fun gacha delay!
    setTimeout(() => {
      const rolled = Math.random();
      let msg = '';
      if (rolled < 0.3) {
        const rewardGems = 50 + Math.floor(Math.random() * 50);
        msg = `💎 Found ${rewardGems} Bonus Gems!`;
        onClaimDailyReward(rewardGems, 0);
      } else if (rolled < 0.65) {
        const rewardCoins = Math.floor(gameState.statTotalCoinsEarned * 0.25) + 1000;
        msg = `🪙 Won ${rewardCoins.toLocaleString()} Coins!`;
        onClaimDailyReward(0, rewardCoins);
      } else {
        msg = `⚡ Unlocked temporary 3x Critical Hit Multiplier (Granted +20 Gems!)`;
        onClaimDailyReward(20, 0);
      }
      setLootResult(msg);
      setOpeningLootbox(false);
      onOpenMysteryChest(cost);
    }, 1200);
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="shop-tab-container">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="shop-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-400 animate-pulse" />
            Nebula Gem Shop
          </h2>
          <p className="text-xs text-slate-400">Invest premium Gems into infinite multipliers and cosmic boosters</p>
        </div>
      </div>

      {/* Daily Reward Chest Section */}
      <div className="flex-none bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-3 md:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4" id="daily-chest-banner">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-900/30 border border-indigo-500/30 rounded-xl flex items-center justify-center text-2xl relative shadow-md">
            <Gift className={`w-6 h-6 text-indigo-400 ${timeLeft === 0 ? 'animate-bounce' : ''}`} />
            {timeLeft === 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-200">Daily Celestial Chest</h3>
            <p className="text-xs text-slate-400">Claim free Gems & standard gold reserves</p>
          </div>
        </div>

        <div>
          {timeLeft === 0 ? (
            <button
              onClick={handleClaimChest}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer select-none"
              id="claim-daily-reward-btn"
            >
              CLAIM REWARD
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-900 text-slate-500 font-mono text-xs select-none">
              <Clock className="w-3.5 h-3.5" />
              <span>Next chest in {formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Items Listing Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1" id="shop-grid">
        {/* Boost 1 */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between group hover:border-amber-500/40 transition-all shadow-md" id="shop-boost-goldpick">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-950 to-yellow-950 border border-amber-500/50 rounded-xl flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex-none group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
                Celestial Magnetism
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded-full">+100% TAP</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Permanently multiplies all manual Tap Damage output by <span className="text-amber-300 font-extrabold">2.0x</span>.</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 border-t border-slate-800/60 pt-2.5">
            <span className="text-xs text-slate-500 font-semibold font-mono">Booster Item</span>
            <button
              onClick={() => onBuyPermanentBoost('tap_multiplier', 80)}
              disabled={gameState.gems < 80}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                gameState.gems >= 80
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-950/30 active:scale-95'
                  : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              id="buy-magnet-btn"
            >
              <Gem className="w-3.5 h-3.5" />
              <span>80 Gems</span>
            </button>
          </div>
        </div>

        {/* Boost 2 */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between group hover:border-sky-500/40 transition-all shadow-md" id="shop-boost-hourglass">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-950 to-blue-950 border border-sky-500/50 rounded-xl flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] flex-none group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
                Chrono Accelerator
                <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 rounded-full">+50% SPEED</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Permanently speeds up helper drone attack ticks by <span className="text-sky-300 font-extrabold">+50%</span>.</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 border-t border-slate-800/60 pt-2.5">
            <span className="text-xs text-slate-500 font-semibold font-mono">Booster Item</span>
            <button
              onClick={() => onBuyPermanentBoost('speed_multiplier', 100)}
              disabled={gameState.gems < 100}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                gameState.gems >= 100
                  ? 'bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 shadow-md shadow-sky-950/30 active:scale-95'
                  : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              id="buy-chrono-btn"
            >
              <Gem className="w-3.5 h-3.5" />
              <span>100 Gems</span>
            </button>
          </div>
        </div>

        {/* Boost 3 */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between group hover:border-emerald-500/40 transition-all shadow-md" id="shop-boost-alchemist">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-950 to-teal-950 border border-emerald-500/50 rounded-xl flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex-none group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
                Alchemist Transmutation
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded-full">+50% GOLD</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Permanently multiplies all brick drop value gold by <span className="text-emerald-300 font-extrabold">+50%</span>.</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 border-t border-slate-800/60 pt-2.5">
            <span className="text-xs text-slate-500 font-semibold font-mono">Booster Item</span>
            <button
              onClick={() => onBuyPermanentBoost('gold_multiplier', 120)}
              disabled={gameState.gems < 120}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                gameState.gems >= 120
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-950/30 active:scale-95'
                  : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              id="buy-alchemist-btn"
            >
              <Gem className="w-3.5 h-3.5" />
              <span>120 Gems</span>
            </button>
          </div>
        </div>

        {/* Gacha Mystery Loot box */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between group hover:border-pink-500/40 transition-all shadow-md" id="shop-gacha-lootbox">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-950 to-rose-950 border border-pink-500/50 rounded-xl flex items-center justify-center text-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.25)] flex-none group-hover:scale-105 transition-transform animate-pulse">
              <Dice5 className="w-6 h-6 text-pink-300" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
                Nebula Mystery Core
                <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-950/80 border border-pink-500/40 px-1.5 py-0.5 rounded-full">JACKPOT</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Simulate premium chest. Unlocks massive gold reserves or jackpot gems (30% roll chance!).</p>
            </div>
          </div>
          
          {/* Roll output animation visualizer */}
          {lootResult && (
            <div className="mt-2 text-[11px] font-bold text-center py-1 bg-pink-950/20 border border-pink-500/20 text-pink-300 rounded-lg animate-bounce">
              {lootResult}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 border-t border-slate-800/60 pt-2.5">
            <span className="text-xs text-slate-500 font-semibold font-mono">Gacha Capsule</span>
            <button
              onClick={() => handleOpenChest(40)}
              disabled={gameState.gems < 40 || openingLootbox}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                gameState.gems >= 40 && !openingLootbox
                  ? 'bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-300 hover:to-rose-400 text-slate-950 shadow-md shadow-pink-950/30 active:scale-95'
                  : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              id="open-mystery-chest-btn"
            >
              <Gem className="w-3.5 h-3.5" />
              <span>{openingLootbox ? 'Opening...' : '40 Gems'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
