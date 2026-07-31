import { Upgrade, Tool, Helper, World, Achievement, GameState, GameSettings } from '../types';

export const INITIAL_UPGRADES: Upgrade[] = [
  {
    id: 'tap_damage',
    name: 'Sledge Power',
    description: 'Directly increases manual tap damage by +1 per level',
    level: 0,
    baseCost: 15,
    costMultiplier: 1.15,
    baseValue: 1,
    valueMultiplier: 1.5,
    icon: 'hammer',
    category: 'damage'
  },
  {
    id: 'crit_chance',
    name: 'Weak Spot Scan',
    description: 'Increases critical hit probability by +1% per level',
    level: 0,
    maxLevel: 50,
    baseCost: 100,
    costMultiplier: 1.25,
    baseValue: 0.05, // 5% base
    valueMultiplier: 0.01,
    icon: 'sparkles',
    category: 'damage'
  },
  {
    id: 'crit_damage',
    name: 'Shatter Precision',
    description: 'Boosts critical strike multiplier by +0.2x per level',
    level: 0,
    baseCost: 150,
    costMultiplier: 1.20,
    baseValue: 2.0, // 2x base
    valueMultiplier: 0.2,
    icon: 'trending-up',
    category: 'damage'
  },
  {
    id: 'auto_damage',
    name: 'Gear Calibration',
    description: 'Increases automated helper drone base strength by +5%',
    level: 0,
    baseCost: 50,
    costMultiplier: 1.14,
    baseValue: 1.0,
    valueMultiplier: 0.05,
    icon: 'zap',
    category: 'auto'
  },
  {
    id: 'attack_speed',
    name: 'Overcharge Pistons',
    description: 'Speeds up helper automation tick triggers by +2% per level',
    level: 0,
    maxLevel: 30,
    baseCost: 200,
    costMultiplier: 1.30,
    baseValue: 1.0,
    valueMultiplier: 0.02,
    icon: 'clock',
    category: 'auto'
  },
  {
    id: 'block_value',
    name: 'Salvage Operations',
    description: 'Sifts denser fragments to boost coin payout by +10%',
    level: 0,
    baseCost: 80,
    costMultiplier: 1.16,
    baseValue: 1.0,
    valueMultiplier: 0.1,
    icon: 'coins',
    category: 'utility'
  },
  {
    id: 'offline_earning',
    name: 'Chrono Capacitor',
    description: 'Increases offline production efficiency by +5% per level',
    level: 0,
    maxLevel: 16,
    baseCost: 120,
    costMultiplier: 1.22,
    baseValue: 0.20, // 20% base
    valueMultiplier: 0.05,
    icon: 'clock',
    category: 'utility'
  }
];

export const INITIAL_TOOLS: Tool[] = [
  {
    id: 'pickaxe',
    name: 'Starter Pickaxe',
    description: 'A solid rusty pickaxe. Standard manual swings.',
    requiredWorld: 1,
    cost: 0,
    multiplier: 1.0,
    icon: 'pickaxe',
    color: '#94a3b8',
    unlocked: true
  },
  {
    id: 'drill',
    name: 'Pneumatic Drill',
    description: 'Fast spinning mechanical drill. Generates 2.5x hit impact.',
    requiredWorld: 1,
    cost: 100,
    multiplier: 2.5,
    icon: 'drill',
    color: '#3b82f6',
    unlocked: false
  },
  {
    id: 'hammer',
    name: 'Tungsten Mallet',
    description: 'A balanced steel mallet. Devastatingly heavy, giving 6x hits.',
    requiredWorld: 1,
    cost: 500,
    multiplier: 6.0,
    icon: 'hammer',
    color: '#e2e8f0',
    unlocked: false
  },
  {
    id: 'sledgehammer',
    name: 'Sledge Breaker',
    description: 'Heavy industrial breaching sledge. 15x multiplier damage.',
    requiredWorld: 2,
    cost: 2500,
    multiplier: 15.0,
    icon: 'sledgehammer',
    color: '#f59e0b',
    unlocked: false
  },
  {
    id: 'laser_drill',
    name: 'Fusion Laser Cutter',
    description: 'A laser drill focused down to atomic thickness. 45x tap multiplier.',
    requiredWorld: 2,
    cost: 12000,
    multiplier: 45.0,
    icon: 'laser_drill',
    color: '#ef4444',
    unlocked: false
  },
  {
    id: 'plasma_cutter',
    name: 'Cosmic Plasma Arc',
    description: 'Slices stone and brick as if it were butter. Massive 120x damage.',
    requiredWorld: 3,
    cost: 60000,
    multiplier: 120.0,
    icon: 'plasma_cutter',
    color: '#06b6d4',
    unlocked: false
  },
  {
    id: 'tnt_bomb',
    name: 'Seismic Shock Demolisher',
    description: 'High-yield shock core weapon. Unleashes 350x force per swing.',
    requiredWorld: 3,
    cost: 300000,
    multiplier: 350.0,
    icon: 'tnt_bomb',
    color: '#ec4899',
    unlocked: false
  },
  {
    id: 'quantum_breaker',
    name: 'Quantum Splitter',
    description: 'Dissolves atomic bonds to break walls instantly. Colossal 1000x multiplier.',
    requiredWorld: 4,
    cost: 1500000,
    multiplier: 1000.0,
    icon: 'quantum_breaker',
    color: '#8b5cf6',
    unlocked: false
  }
];

export const INITIAL_HELPERS: Helper[] = [
  {
    id: 'auto_hammer',
    name: 'Steam Golem Hammer',
    description: 'Swings automatically. Reliable steady impact.',
    level: 0,
    baseCost: 50,
    costMultiplier: 1.15,
    baseDps: 1.5,
    icon: 'hammer',
    color: '#d97706'
  },
  {
    id: 'drone',
    name: 'Shatter Drone V1',
    description: 'Hovering quadcopter zapping brick lines with energy.',
    level: 0,
    baseCost: 300,
    costMultiplier: 1.16,
    baseDps: 8.0,
    icon: 'drone',
    color: '#22c55e'
  },
  {
    id: 'laser_turret',
    name: 'Chronos Laser Column',
    description: 'Fixed high-energy battery focusing continuous heat rays.',
    level: 0,
    baseCost: 2400,
    costMultiplier: 1.18,
    baseDps: 45.0,
    icon: 'laser',
    color: '#ec4899'
  },
  {
    id: 'mini_bot',
    name: 'Cosmic Nanobot Cluster',
    description: 'Microscopic bots eating away brick structures from inside.',
    level: 0,
    baseCost: 18500,
    costMultiplier: 1.20,
    baseDps: 260.0,
    icon: 'bot',
    color: '#3b82f6'
  }
];

export const WORLDS: World[] = [
  {
    id: 1,
    name: 'Grass Meadow Wall',
    material: 'wood',
    color: '#15803d', // rich green
    crackColor: '#22c55e',
    baseHp: 30,
    hpMultiplier: 1.8,
    baseReward: 10,
    rewardMultiplier: 2.1,
    wallsToNextWorld: 10
  },
  {
    id: 2,
    name: 'Redwood Forest Fortress',
    material: 'wood',
    color: '#854d0e', // deep wood brown
    crackColor: '#ca8a04',
    baseHp: 200,
    hpMultiplier: 2.0,
    baseReward: 65,
    rewardMultiplier: 2.2,
    wallsToNextWorld: 10
  },
  {
    id: 3,
    name: 'Granite Cavern Vault',
    material: 'stone',
    color: '#4b5563', // dark gray granite
    crackColor: '#9ca3af',
    baseHp: 1200,
    hpMultiplier: 2.1,
    baseReward: 380,
    rewardMultiplier: 2.3,
    wallsToNextWorld: 10
  },
  {
    id: 4,
    name: 'Steel Bastion Citadel',
    material: 'metal',
    color: '#64748b', // heavy cold steel
    crackColor: '#cbd5e1',
    baseHp: 6500,
    hpMultiplier: 2.2,
    baseReward: 1800,
    rewardMultiplier: 2.4,
    wallsToNextWorld: 12
  },
  {
    id: 5,
    name: 'Glacial Ice Palisade',
    material: 'ice',
    color: '#0284c7', // frozen blue ice
    crackColor: '#38bdf8',
    baseHp: 35000,
    hpMultiplier: 2.3,
    baseReward: 9200,
    rewardMultiplier: 2.5,
    wallsToNextWorld: 12
  },
  {
    id: 6,
    name: 'Grid Neon Matrix',
    material: 'neon',
    color: '#06b6d4', // cyan synth outline
    crackColor: '#ec4899',
    baseHp: 180000,
    hpMultiplier: 2.4,
    baseReward: 48000,
    rewardMultiplier: 2.6,
    wallsToNextWorld: 15
  },
  {
    id: 7,
    name: 'Volcanic Basalt Crag',
    material: 'lava',
    color: '#1c1917', // craggy volcanic charcoal
    crackColor: '#f97316',
    baseHp: 950000,
    hpMultiplier: 2.5,
    baseReward: 240000,
    rewardMultiplier: 2.7,
    wallsToNextWorld: 15
  },
  {
    id: 8,
    name: 'Astral Crystal Spire',
    material: 'crystal',
    color: '#701a75', // purple crystal
    crackColor: '#e879f9',
    baseHp: 5000000,
    hpMultiplier: 2.6,
    baseReward: 1200000,
    rewardMultiplier: 2.8,
    wallsToNextWorld: 20
  },
  {
    id: 9,
    name: 'Nether Obsidian Core',
    material: 'boss',
    color: '#0f172a', // obsidian slate blue
    crackColor: '#dc2626',
    baseHp: 25000000,
    hpMultiplier: 2.7,
    baseReward: 6500000,
    rewardMultiplier: 2.9,
    wallsToNextWorld: 99999 // endless world
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'breaks_10',
    name: 'Apprentice Crusher',
    description: 'Demolish 10 walls in total',
    target: 10,
    current: 0,
    rewardGems: 10,
    completed: false,
    claimed: false,
    type: 'total_breaks'
  },
  {
    id: 'breaks_100',
    name: 'Seismic Force',
    description: 'Shatter 100 walls in total',
    target: 100,
    current: 0,
    rewardGems: 30,
    completed: false,
    claimed: false,
    type: 'total_breaks'
  },
  {
    id: 'coins_10k',
    name: 'Capitalist Smasher',
    description: 'Earn 10,000 coins in total',
    target: 10000,
    current: 0,
    rewardGems: 15,
    completed: false,
    claimed: false,
    type: 'total_coins'
  },
  {
    id: 'coins_1m',
    name: 'Billionaire Miner',
    description: 'Earn 1,000,000 coins in total',
    target: 1000000,
    current: 0,
    rewardGems: 50,
    completed: false,
    claimed: false,
    type: 'total_coins'
  },
  {
    id: 'reach_world_3',
    name: 'Geological Voyager',
    description: 'Reach World 3: Granite Cavern Vault',
    target: 3,
    current: 1,
    rewardGems: 20,
    completed: false,
    claimed: false,
    type: 'max_world'
  },
  {
    id: 'reach_world_6',
    name: 'Synth explorer',
    description: 'Reach World 6: Grid Neon Matrix',
    target: 6,
    current: 1,
    rewardGems: 45,
    completed: false,
    claimed: false,
    type: 'max_world'
  },
  {
    id: 'upgrades_25',
    name: 'Overclocked Mechanism',
    description: 'Acquire 25 upgrades in total',
    target: 25,
    current: 0,
    rewardGems: 25,
    completed: false,
    claimed: false,
    type: 'total_upgrades'
  },
  {
    id: 'prestige_once',
    name: 'Cosmic Rebirth',
    description: 'Trigger Quantum Rebirth once',
    target: 1,
    current: 0,
    rewardGems: 40,
    completed: false,
    claimed: false,
    type: 'prestiges'
  }
];

export const DEFAULT_GAME_STATE = (firstSaveTime: number): GameState => ({
  coins: 0,
  gems: 25, // start with a small gift of 25 gems
  prestigePoints: 0,
  prestigeCount: 0,
  prestigeMultiplier: 1.0,
  currentWorldId: 1,
  currentWorldWallIndex: 1,
  wallHp: 30,
  wallMaxHp: 30,
  lastSaveTime: firstSaveTime,
  dailyRewardClaimedTime: 0,
  
  upgrades: {},
  toolsUnlocked: ['pickaxe'],
  equippedToolId: 'pickaxe',
  helpers: {},
  achievementsClaimed: [],
  statTotalBreaks: 0,
  statTotalCoinsEarned: 0,
  statTotalClicks: 0
});

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  particlesLevel: 'high',
  vibrationEnabled: true
};
