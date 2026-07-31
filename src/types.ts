export interface Upgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel?: number;
  baseCost: number;
  costMultiplier: number;
  baseValue: number;
  valueMultiplier: number;
  icon: string; // lucide icon name
  category: 'damage' | 'auto' | 'utility';
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  requiredWorld: number;
  cost: number;
  multiplier: number; // tap damage multiplier
  icon: string;
  color: string; // tailwind color or hex
  unlocked: boolean;
}

export interface Helper {
  id: string;
  name: string;
  description: string;
  level: number;
  baseCost: number;
  costMultiplier: number;
  baseDps: number;
  icon: string;
  color: string;
}

export interface World {
  id: number;
  name: string;
  material: string; // 'wood' | 'stone' | 'metal' | 'ice' | 'neon' | 'lava' | 'crystal' | 'boss'
  color: string; // hex or tailwind class for the bricks
  crackColor: string;
  baseHp: number;
  hpMultiplier: number;
  baseReward: number;
  rewardMultiplier: number;
  wallsToNextWorld: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  rewardGems: number;
  completed: boolean;
  claimed: boolean;
  type: 'total_breaks' | 'total_coins' | 'max_world' | 'total_upgrades' | 'prestiges' | 'tools_unlocked';
}

export type SpecialWallType = 'normal' | 'treasure' | 'lucky' | 'boss' | 'crystal' | 'explosive' | 'mystery';

export interface ActiveEvent {
  type: 'coin_rain' | 'frenzy' | 'crit_frenzy' | 'meteor_shower' | 'golden_time';
  name: string;
  description: string;
  durationLeft: number; // seconds remaining
  maxDuration: number;
  icon: string;
}

export interface GameState {
  coins: number;
  gems: number;
  prestigePoints: number;
  prestigeCount: number;
  prestigeMultiplier: number; // e.g. 1.0 + prestigePoints * 0.05
  currentWorldId: number;
  currentWorldWallIndex: number; // e.g. wall 3/10 in Wood World
  wallHp: number;
  wallMaxHp: number;
  specialWallType?: SpecialWallType;
  lastSaveTime: number;
  dailyRewardClaimedTime: number;
  
  // Lists
  upgrades: { [id: string]: number }; // id -> level
  toolsUnlocked: string[]; // tool ids
  equippedToolId: string;
  helpers: { [id: string]: number }; // helper id -> level
  achievementsClaimed: string[]; // list of achievement ids claimed
  statTotalBreaks: number;
  statTotalCoinsEarned: number;
  statTotalClicks: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  particlesLevel: 'low' | 'medium' | 'high';
  vibrationEnabled: boolean;
}
