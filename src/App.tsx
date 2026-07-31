import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  GameState, 
  GameSettings, 
  Upgrade, 
  Tool, 
  Helper, 
  World, 
  Achievement,
  SpecialWallType,
  ActiveEvent
} from './types';
import { 
  INITIAL_UPGRADES, 
  INITIAL_TOOLS, 
  INITIAL_HELPERS, 
  WORLDS, 
  INITIAL_ACHIEVEMENTS, 
  DEFAULT_GAME_STATE, 
  DEFAULT_SETTINGS 
} from './utils/constants';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import UpgradesTab from './components/UpgradesTab';
import ToolsTab from './components/ToolsTab';
import HelpersTab from './components/HelpersTab';
import WorldsTab from './components/WorldsTab';
import AchievementsTab from './components/AchievementsTab';
import PrestigeTab from './components/PrestigeTab';
import ShopTab from './components/ShopTab';
import SettingsTab from './components/SettingsTab';
import GuideTab from './components/GuideTab';
import OfflineModal from './components/OfflineModal';
import { audio } from './components/AudioEngine';

import { 
  Coins, 
  Gem, 
  RefreshCw, 
  Settings as SettingsIcon, 
  Trophy, 
  Wrench, 
  Bot, 
  Globe, 
  Sparkles,
  ShoppingBag,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  Zap,
  Flame,
  Award,
  X,
  Gift,
  HelpCircle,
  Info,
  TrendingUp,
  Hammer,
  Sliders,
  Store
} from 'lucide-react';

const LOCAL_STORAGE_STATE_KEY = 'idle_wall_destroyer_save_state';
const LOCAL_STORAGE_SETTINGS_KEY = 'idle_wall_destroyer_settings';

export default function App() {
  // Game states
  const [gameState, setGameState] = useState<GameState>(() => DEFAULT_GAME_STATE(Date.now()));
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'upgrades' | 'tools' | 'helpers' | 'worlds' | 'achievements' | 'prestige' | 'shop' | 'settings' | 'guide' | null>(null);

  // Combo multiplier
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const lastTapTimeRef = useRef<number>(0);

  // Loot box chest timer (seconds remaining)
  const [lootSecondsLeft, setLootSecondsLeft] = useState<number>(205); // 03:25 like reference image!
  const [lootRewardModal, setLootRewardModal] = useState<{ coins: number; gems: number } | null>(null);

  // Modal for offline earnings
  const [offlineEarnings, setOfflineEarnings] = useState<{ coins: number; sec: number } | null>(null);

  // Screen shake animation trigger state
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Flashing world unlock notification
  const [worldUnlockAlert, setWorldUnlockAlert] = useState<string | null>(null);

  // References to Canvas handle
  const canvasRef = useRef<GameCanvasHandle>(null);

  // Get current active structures
  const currentWorld = useMemo(() => {
    return WORLDS.find(w => w.id === gameState.currentWorldId) || WORLDS[0];
  }, [gameState.currentWorldId]);

  const currentTool = useMemo(() => {
    return INITIAL_TOOLS.find(t => t.id === gameState.equippedToolId) || INITIAL_TOOLS[0];
  }, [gameState.equippedToolId]);

  // Merge loaded save or initialize
  useEffect(() => {
    // 1. Load settings
    const savedSettingsRaw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    let loadedSettings = DEFAULT_SETTINGS;
    if (savedSettingsRaw) {
      try {
        const parsed = JSON.parse(savedSettingsRaw);
        loadedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(loadedSettings);
        audio.setSoundEnabled(loadedSettings.soundEnabled);
      } catch (e) {
        console.error('Failed to parse settings, loading defaults.');
      }
    }

    // 2. Load game state
    const savedStateRaw = localStorage.getItem(LOCAL_STORAGE_STATE_KEY);
    let finalState = DEFAULT_GAME_STATE(Date.now());
    if (savedStateRaw) {
      try {
        const parsed = JSON.parse(savedStateRaw);
        
        // Safely merge with default state so old save structures do not crash
        finalState = {
          ...DEFAULT_GAME_STATE(Date.now()),
          ...parsed,
          upgrades: { ...parsed.upgrades },
          toolsUnlocked: [...(parsed.toolsUnlocked || ['pickaxe'])],
          helpers: { ...parsed.helpers },
          achievementsClaimed: [...(parsed.achievementsClaimed || [])]
        };
      } catch (e) {
        console.error('Failed to parse save, initializing new game.');
      }
    }

    // Calculate offline production
    const nowMs = Date.now();
    const elapsedSec = Math.floor((nowMs - finalState.lastSaveTime) / 1000);
    
    // Calculate current idle DPS based on loaded state helpers
    const loadedIdleDps = calculateDpsForState(finalState);

    if (elapsedSec > 30 && loadedIdleDps > 0) {
      // Offline rate = base 20% + upgrade level * 5%
      const upgradeLv = finalState.upgrades['offline_earning'] || 0;
      const offlineMultiplier = 0.20 + upgradeLv * 0.05;
      
      const coinsEarned = Math.floor(elapsedSec * loadedIdleDps * offlineMultiplier);
      if (coinsEarned > 5) {
        setOfflineEarnings({ coins: coinsEarned, sec: elapsedSec });
      }
    }

    // Update last save time to now
    finalState.lastSaveTime = nowMs;
    setGameState(finalState);
  }, []);

  // Sync settings helper
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Helper calculation function for loading sequence
  const calculateDpsForState = (state: GameState): number => {
    let dps = 0;
    INITIAL_HELPERS.forEach(h => {
      const level = state.helpers[h.id] || 0;
      dps += level * h.baseDps;
    });
    
    // Adjust by regular calibration multiplier (+5% per level)
    const calibrationLevel = state.upgrades['auto_damage'] || 0;
    const calibrationMultiplier = 1.0 + calibrationLevel * 0.05;

    // Adjust by permanent Chrono Accelerator speed modifiers bought in shop (+50% each)
    const speedLevel = state.upgrades['speed_multiplier'] || 0;
    const speedMultiplier = 1.0 + speedLevel * 0.5;

    return dps * state.prestigeMultiplier * calibrationMultiplier * speedMultiplier;
  };

  // -------------------------------------------------------------
  // DYNAMIC CALCULATORS FOR LIVE STATE
  // -------------------------------------------------------------
  const tapDamage = useMemo(() => {
    // Base is 1
    let base = 1;
    // Add levels from sledge power
    const tapPowerLv = gameState.upgrades['tap_damage'] || 0;
    base += tapPowerLv * 1.5;

    // Multiply by equipped tool multiplier
    base *= currentTool.multiplier;

    // Multiply by permanent Celestial Magnetism booster bought in Shop (+100% per tier)
    const shopBoosterLevel = gameState.upgrades['tap_multiplier'] || 0;
    const shopMultiplier = 1.0 + shopBoosterLevel * 1.0;

    // Multiply by permanent prestige bonus multiplier
    const prestigeMultiplier = gameState.prestigeMultiplier;

    return Math.max(1, Math.floor(base * shopMultiplier * prestigeMultiplier));
  }, [gameState.upgrades, currentTool, gameState.prestigeMultiplier]);

  // Calculate affordance indicators for HUD buttons
  const canAffordAnyUpgrade = useMemo(() => {
    return INITIAL_UPGRADES.some(upg => {
      const currentLv = gameState.upgrades[upg.id] || 0;
      if (upg.maxLevel && currentLv >= upg.maxLevel) return false;
      const cost = Math.floor(upg.baseCost * Math.pow(upg.costMultiplier, currentLv));
      return gameState.coins >= cost;
    });
  }, [gameState.coins, gameState.upgrades]);

  const canAffordAnyTool = useMemo(() => {
    return INITIAL_TOOLS.some(tool => {
      const isUnlocked = gameState.toolsUnlocked.includes(tool.id);
      if (isUnlocked) return false;
      const worldReached = gameState.currentWorldId >= tool.requiredWorld;
      return worldReached && gameState.coins >= tool.cost;
    });
  }, [gameState.coins, gameState.toolsUnlocked, gameState.currentWorldId]);

  const canAffordAnyHelper = useMemo(() => {
    return INITIAL_HELPERS.some(helper => {
      const currentCount = gameState.helpers[helper.id] || 0;
      const cost = Math.floor(helper.baseCost * Math.pow(1.15, currentCount));
      return gameState.coins >= cost;
    });
  }, [gameState.coins, gameState.helpers]);

  const canPrestige = useMemo(() => {
    return gameState.statTotalWallsDestroyed >= 10;
  }, [gameState.statTotalWallsDestroyed]);

  const idleDps = useMemo(() => {
    let dps = 0;
    INITIAL_HELPERS.forEach(h => {
      const level = gameState.helpers[h.id] || 0;
      dps += level * h.baseDps;
    });

    const calibrationLevel = gameState.upgrades['auto_damage'] || 0;
    const calibrationMultiplier = 1.0 + calibrationLevel * 0.05;

    const speedLevel = gameState.upgrades['speed_multiplier'] || 0;
    const speedMultiplier = 1.0 + speedLevel * 0.5;

    return dps * gameState.prestigeMultiplier * calibrationMultiplier * speedMultiplier;
  }, [gameState.helpers, gameState.upgrades, gameState.prestigeMultiplier]);

  // Loot timer tick down
  useEffect(() => {
    const lootInterval = setInterval(() => {
      setLootSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(lootInterval);
  }, []);

  // Combo decay check
  useEffect(() => {
    const comboInterval = setInterval(() => {
      if (Date.now() - lastTapTimeRef.current > 1800) {
        setComboMultiplier(prev => Math.max(1, prev - 1));
      }
    }, 400);
    return () => clearInterval(comboInterval);
  }, []);

  // Active Event countdown timer tick (1 second resolution)
  useEffect(() => {
    const eventTimer = setInterval(() => {
      setGameState(prev => {
        if (!prev.activeEvent) return prev;

        const left = prev.activeEvent.durationLeft - 1;
        if (left <= 0) {
          return { ...prev, activeEvent: null };
        }
        return {
          ...prev,
          activeEvent: {
            ...prev.activeEvent,
            durationLeft: left
          }
        };
      });
    }, 1000);

    return () => clearInterval(eventTimer);
  }, []);

  // Periodic Random Event Spawner (checks every 25s, 40% chance)
  useEffect(() => {
    const randomEventChecker = setInterval(() => {
      setGameState(prev => {
        if (prev.activeEvent) return prev;
        if (Math.random() < 0.40) {
          setTimeout(() => triggerRandomEvent(), 50);
        }
        return prev;
      });
    }, 25000);

    return () => clearInterval(randomEventChecker);
  }, []);

  // Active Event effect handlers
  useEffect(() => {
    if (!gameState.activeEvent) return;

    if (gameState.activeEvent.type === 'meteor_shower') {
      const meteorTicker = setInterval(() => {
        if (canvasRef.current) {
          const tx = window.innerWidth * 0.35 + Math.random() * (window.innerWidth * 0.3);
          const ty = window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.3);
          canvasRef.current.triggerMeteor(tx, ty);
          applyWallDamage(tapDamage * 1.5, false, tx, ty, true);
        }
      }, 700);
      return () => clearInterval(meteorTicker);
    } else if (gameState.activeEvent.type === 'coin_rain') {
      const coinRainTicker = setInterval(() => {
        if (canvasRef.current) {
          canvasRef.current.triggerCoinRain();
        }
      }, 1000);
      return () => clearInterval(coinRainTicker);
    }
  }, [gameState.activeEvent?.type, tapDamage]);

  const handleClaimLootChest = () => {
    if (lootSecondsLeft > 0) return;
    const rewardCoins = Math.floor((300 + gameState.currentWorldId * 400) * gameState.prestigeMultiplier);
    const rewardGems = 20;
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + rewardCoins,
      gems: prev.gems + rewardGems
    }));
    audio.playBuy();
    setLootRewardModal({ coins: rewardCoins, gems: rewardGems });
    setLootSecondsLeft(205); // 03:25 reset
  };

  // Helper time formatter
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-Save interval every 10 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      setGameState(prev => {
        const stateToSave = {
          ...prev,
          lastSaveTime: Date.now()
        };
        localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(stateToSave));
        return stateToSave;
      });
    }, 10000);

    // Save on browser tab close/exit
    const handleBeforeUnload = () => {
      setGameState(prev => {
        const stateToSave = {
          ...prev,
          lastSaveTime: Date.now()
        };
        localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(stateToSave));
        return stateToSave;
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // -------------------------------------------------------------
  // TICK AUTODAMAGE LOOP (100ms resolution for ultra fluid progression)
  // -------------------------------------------------------------
  useEffect(() => {
    if (idleDps <= 0) return;

    const tickMs = 100;
    const damagePerTick = idleDps * (tickMs / 1000);

    const ticker = setInterval(() => {
      // Zap helper drone lasers visually on canvas occasionally for immersion!
      if (canvasRef.current) {
        const rand = Math.random();
        if (gameState.helpers['drone'] > 0 && rand < 0.08) {
          // Shatter Drone on left zaps
          canvasRef.current.fireDroneLaser('drone', window.innerWidth * 0.12, window.innerHeight * 0.28);
        }
        if (gameState.helpers['mini_bot'] > 0 && rand > 0.92) {
          // Cosmic Nanobot on right zaps
          canvasRef.current.fireDroneLaser('mini_bot', window.innerWidth * 0.88, window.innerHeight * 0.48);
        }
        if (gameState.helpers['laser_turret'] > 0 && rand > 0.45 && rand < 0.53) {
          // Chronos Laser Turret fires hot magenta beam
          canvasRef.current.fireDroneLaser('laser_turret', window.innerWidth * 0.72, window.innerHeight * 0.72);
        }
        if (gameState.helpers['auto_hammer'] > 0 && rand > 0.20 && rand < 0.26) {
          // Steam Golem Hammer releases kinetic gold shock
          canvasRef.current.fireDroneLaser('auto_hammer', window.innerWidth * 0.28, window.innerHeight * 0.75);
        }
      }

      applyWallDamage(damagePerTick, false, 0, 0);
    }, tickMs);

    return () => clearInterval(ticker);
  }, [idleDps, gameState.helpers]);

  // -------------------------------------------------------------
  // PRIMARY CORE GAMEPLAY ROUTINES
  // -------------------------------------------------------------
  const triggerRandomEvent = () => {
    const events: ActiveEvent['type'][] = ['coin_rain', 'frenzy', 'crit_frenzy', 'meteor_shower', 'golden_time'];
    const chosen = events[Math.floor(Math.random() * events.length)];
    let name = 'COIN RAIN!';
    let desc = 'Golden coins falling everywhere!';

    if (chosen === 'frenzy') {
      name = 'FRENZY MODE!';
      desc = '3x Damage per hit!';
    } else if (chosen === 'crit_frenzy') {
      name = 'CRIT FRENZY!';
      desc = '100% Critical Hit Chance!';
    } else if (chosen === 'meteor_shower') {
      name = 'METEOR SHOWER!';
      desc = 'Fiery meteors raining on the wall!';
    } else if (chosen === 'golden_time') {
      name = 'GOLDEN TIME!';
      desc = '5x Bounty multiplier on all breaks!';
    }

    audio.playEvent();
    setGameState(prev => ({
      ...prev,
      activeEvent: {
        type: chosen,
        name,
        description: desc,
        durationLeft: 12
      }
    }));
  };

  const applyWallDamage = (amount: number, isManualTap = false, x = 0, y = 0, isCrit = false) => {
    // Trigger critical spark particle explosion if crit occurred
    if (isCrit && canvasRef.current) {
      canvasRef.current.triggerCritSparkExplosion(x || 250, y || 200);
    }

    setGameState(prev => {
      const nextHp = prev.wallHp - amount;

      if (nextHp <= 0) {
        // WALL IS DESTROYED!
        audio.playBreak();
        
        // Shatter effects on canvas
        if (canvasRef.current) {
          canvasRef.current.triggerWallShatter();
          if (isManualTap) {
            canvasRef.current.spawnFloatingText('SHATTERED!', x || 250, y || 200, true);
          }
        }

        // Calculate Bounty coins
        const baseReward = currentWorld.baseReward * Math.pow(currentWorld.rewardMultiplier, prev.currentWorldId);
        
        // Regular gold salvage upgrade (+10% per level)
        const salvageLv = prev.upgrades['block_value'] || 0;
        const salvageMultiplier = 1.0 + salvageLv * 0.1;

        // Permanent Alchemist booster from shop (+50% per level)
        const shopAlchemistLv = prev.upgrades['gold_multiplier'] || 0;
        const shopAlchemistMultiplier = 1.0 + shopAlchemistLv * 0.5;

        // Special Wall multiplier & Event multiplier
        let wallCoinMult = 1.0;
        if (prev.specialWallType === 'treasure') wallCoinMult = 10.0;
        else if (prev.specialWallType === 'boss') wallCoinMult = 5.0;
        else if (prev.specialWallType === 'lucky') wallCoinMult = 2.5;

        let eventCoinMult = 1.0;
        if (prev.activeEvent?.type === 'golden_time') eventCoinMult = 5.0;

        // Cumulative bounty
        const coinBounty = Math.floor(
          baseReward * salvageMultiplier * shopAlchemistMultiplier * prev.prestigeMultiplier * (1.0 + prev.currentWorldWallIndex * 0.05) * wallCoinMult * eventCoinMult
        );

        // Gem reward chance (10% standard, special walls yield more!)
        let gemBounty = 0;
        if (prev.specialWallType === 'crystal') {
          gemBounty = 15;
        } else if (prev.specialWallType === 'lucky') {
          gemBounty = 10;
        } else if (Math.random() < 0.12) {
          gemBounty = 1 + Math.floor(Math.random() * 3);
        }

        // Mystery wall triggers event!
        if (prev.specialWallType === 'mystery') {
          setTimeout(() => triggerRandomEvent(), 100);
        }

        const updatedCoins = prev.coins + coinBounty;
        const updatedGems = prev.gems + gemBounty;
        const updatedTotalCoins = prev.statTotalCoinsEarned + coinBounty;
        const updatedBreaks = prev.statTotalBreaks + 1;

        // Progress to next wall index
        let nextWallIndex = prev.currentWorldWallIndex + 1;
        let nextWorldId = prev.currentWorldId;

        // Auto transition world on completing final wall
        if (nextWallIndex > currentWorld.wallsToNextWorld) {
          const nextWorldExists = WORLDS.some(w => w.id === prev.currentWorldId + 1);
          if (nextWorldExists) {
            nextWorldId = prev.currentWorldId + 1;
            nextWallIndex = 1;
            
            const upcomingWorld = WORLDS.find(w => w.id === nextWorldId);
            if (upcomingWorld) {
              setWorldUnlockAlert(`WARPED TO WORLD ${nextWorldId}: ${upcomingWorld.name}!`);
              setTimeout(() => setWorldUnlockAlert(null), 4000);
            }
          } else {
            nextWallIndex = 1;
          }
        }

        // Compute next Special Wall type
        let nextSpecialWallType: SpecialWallType = 'normal';
        if (nextWallIndex % 5 === 0) {
          nextSpecialWallType = 'boss';
        } else {
          const rand = Math.random();
          if (rand < 0.08) nextSpecialWallType = 'treasure';
          else if (rand < 0.16) nextSpecialWallType = 'lucky';
          else if (rand < 0.24) nextSpecialWallType = 'crystal';
          else if (rand < 0.32) nextSpecialWallType = 'explosive';
          else if (rand < 0.40) nextSpecialWallType = 'mystery';
        }

        // Compute fresh wall Max HP
        const upcomingWorld = WORLDS.find(w => w.id === nextWorldId) || WORLDS[0];
        let freshMaxHp = Math.floor(
          upcomingWorld.baseHp * Math.pow(upcomingWorld.hpMultiplier, nextWorldId) * Math.pow(1.15, nextWallIndex)
        );
        if (nextSpecialWallType === 'boss') freshMaxHp = Math.floor(freshMaxHp * 2.5);
        else if (nextSpecialWallType === 'crystal') freshMaxHp = Math.floor(freshMaxHp * 1.4);

        return {
          ...prev,
          coins: updatedCoins,
          gems: updatedGems,
          statTotalCoinsEarned: updatedTotalCoins,
          statTotalBreaks: updatedBreaks,
          currentWorldWallIndex: nextWallIndex,
          currentWorldId: nextWorldId,
          specialWallType: nextSpecialWallType,
          wallHp: freshMaxHp,
          wallMaxHp: freshMaxHp,
          lastSaveTime: Date.now()
        };
      }

      // Standard damage reduction
      return {
        ...prev,
        wallHp: Math.max(0, parseFloat(nextHp.toFixed(2)))
      };
    });
  };

  const handleManualTap = (clickX: number, clickY: number) => {
    // Play audio and hit mechanics
    const now = Date.now();
    let currentCombo = comboMultiplier;
    if (now - lastTapTimeRef.current < 450) {
      currentCombo = Math.min(comboMultiplier + 1, 10);
      setComboMultiplier(currentCombo);
    }
    lastTapTimeRef.current = now;

    // Critical Hits rolls
    const critChanceLv = gameState.upgrades['crit_chance'] || 0;
    let critChance = 0.05 + critChanceLv * 0.01; // base 5% + 1% per scan tier

    if (gameState.activeEvent?.type === 'crit_frenzy') critChance = 1.0;
    if (gameState.specialWallType === 'lucky') critChance += 0.30;

    const critDamageLv = gameState.upgrades['crit_damage'] || 0;
    const critMultiplier = 2.0 + critDamageLv * 0.2; // base 2x + 0.2x per accuracy tier

    const isCrit = Math.random() < critChance;
    let baseDamage = isCrit ? Math.floor(tapDamage * critMultiplier) : tapDamage;

    if (gameState.activeEvent?.type === 'frenzy') baseDamage *= 3;

    const finalDamage = Math.floor(baseDamage * currentCombo);

    // Dynamic pitch audio with material type!
    audio.playTap(isCrit, currentCombo, currentWorld.material);

    // Screen shake trigger on crits or massive hits
    if (settings.vibrationEnabled && (isCrit || finalDamage > 100)) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 150);
    }

    // Trigger canvas effects & numbers
    if (canvasRef.current) {
      canvasRef.current.triggerBlockBreak(clickX, clickY, isCrit ? 18 : 8);
      const textPrefix = isCrit ? 'CRIT! -' : '-';
      canvasRef.current.spawnFloatingText(`${textPrefix}${formatNumber(finalDamage)}`, clickX, clickY, isCrit);
    }

    // Deduct HP
    applyWallDamage(finalDamage, true, clickX, clickY, isCrit);

    // Explosive Wall collateral blast effect!
    if (gameState.specialWallType === 'explosive') {
      const blastDamage = Math.floor(finalDamage * 0.8);
      if (canvasRef.current) {
        canvasRef.current.triggerCritSparkExplosion(clickX + 30, clickY - 20);
      }
      applyWallDamage(blastDamage, false, clickX + 30, clickY - 20, true);
    }

    // Increment click statistics
    setGameState(prev => ({
      ...prev,
      statTotalClicks: prev.statTotalClicks + 1
    }));
  };

  // -------------------------------------------------------------
  // TAB UPGRADE OPERATIONS
  // -------------------------------------------------------------
  const handleBuyUpgrade = (id: string, count: number) => {
    const upgrade = INITIAL_UPGRADES.find(u => u.id === id);
    if (!upgrade) return;

    setGameState(prev => {
      let coins = prev.coins;
      let level = prev.upgrades[id] || 0;
      let totalCost = 0;

      for (let i = 0; i < count; i++) {
        const cost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level);
        if (coins >= cost) {
          coins -= cost;
          totalCost += cost;
          level++;
        } else {
          break;
        }
      }

      if (totalCost > 0) {
        audio.playBuy();
        return {
          ...prev,
          coins,
          upgrades: {
            ...prev.upgrades,
            [id]: level
          }
        };
      }
      return prev;
    });
  };

  // -------------------------------------------------------------
  // TAB TOOL OPERATIONS
  // -------------------------------------------------------------
  const handleUnlockTool = (id: string) => {
    const tool = INITIAL_TOOLS.find(t => t.id === id);
    if (!tool) return;

    setGameState(prev => {
      if (prev.coins >= tool.cost && !prev.toolsUnlocked.includes(id)) {
        audio.playBuy();
        return {
          ...prev,
          coins: prev.coins - tool.cost,
          toolsUnlocked: [...prev.toolsUnlocked, id],
          equippedToolId: id // auto-equip upon unlocking!
        };
      }
      return prev;
    });
  };

  const handleEquipTool = (id: string) => {
    setGameState(prev => {
      if (prev.toolsUnlocked.includes(id)) {
        audio.playTap(true);
        return {
          ...prev,
          equippedToolId: id
        };
      }
      return prev;
    });
  };

  // -------------------------------------------------------------
  // TAB HELPER OPERATIONS
  // -------------------------------------------------------------
  const handleBuyHelper = (id: string, count: number) => {
    const helper = INITIAL_HELPERS.find(h => h.id === id);
    if (!helper) return;

    setGameState(prev => {
      let coins = prev.coins;
      let level = prev.helpers[id] || 0;
      let totalCost = 0;

      for (let i = 0; i < count; i++) {
        const cost = helper.baseCost * Math.pow(helper.costMultiplier, level);
        if (coins >= cost) {
          coins -= cost;
          totalCost += cost;
          level++;
        } else {
          break;
        }
      }

      if (totalCost > 0) {
        audio.playBuy();
        return {
          ...prev,
          coins,
          helpers: {
            ...prev.helpers,
            [id]: level
          }
        };
      }
      return prev;
    });
  };

  // -------------------------------------------------------------
  // TAB WORLD WARPING OPERATIONS
  // -------------------------------------------------------------
  const handleSelectWorld = (worldId: number) => {
    setGameState(prev => {
      if (prev.currentWorldId >= worldId) {
        audio.playTap();
        
        // Reset wall index and max HP to world baseline parameters
        const selected = WORLDS.find(w => w.id === worldId) || WORLDS[0];
        const freshMaxHp = Math.floor(
          selected.baseHp * Math.pow(selected.hpMultiplier, worldId) * Math.pow(1.15, 1)
        );

        return {
          ...prev,
          currentWorldId: worldId,
          currentWorldWallIndex: 1,
          wallHp: freshMaxHp,
          wallMaxHp: freshMaxHp
        };
      }
      return prev;
    });
  };

  // -------------------------------------------------------------
  // ACHIEVEMENT AND CLAIM OPERATIONS
  // -------------------------------------------------------------
  const handleClaimAchievement = (id: string) => {
    const ach = activeAchievements.find(a => a.id === id);
    if (!ach || !ach.completed || gameState.achievementsClaimed.includes(id)) return;

    setGameState(prev => {
      audio.playPrestige();
      return {
        ...prev,
        gems: prev.gems + ach.rewardGems,
        achievementsClaimed: [...prev.achievementsClaimed, id]
      };
    });
  };

  // -------------------------------------------------------------
  // PRESTIGE REBIRTH OPERATIONS
  // -------------------------------------------------------------
  const handlePrestige = () => {
    const calculatedTotalPoints = Math.floor(Math.sqrt(gameState.statTotalCoinsEarned / 20000));
    const claimable = Math.max(0, calculatedTotalPoints - gameState.prestigePoints);

    if (claimable <= 0) {
      audio.playLocked();
      return;
    }

    setGameState(prev => {
      audio.playPrestige();

      const newPrestigePoints = prev.prestigePoints + claimable;
      const newPrestigeCount = prev.prestigeCount + 1;
      
      // prestige multiplier: 1 point = +5% boost
      const newMultiplier = 1.0 + newPrestigePoints * 0.05;

      // Re-initialize standard world state
      const world1 = WORLDS[0];
      const startingMaxHp = Math.floor(
        world1.baseHp * Math.pow(world1.hpMultiplier, 1)
      );

      // Return clean reset state except tools unlocked, gems, and stats
      return {
        ...prev,
        coins: 0,
        prestigePoints: newPrestigePoints,
        prestigeCount: newPrestigeCount,
        prestigeMultiplier: newMultiplier,
        currentWorldId: 1,
        currentWorldWallIndex: 1,
        wallHp: startingMaxHp,
        wallMaxHp: startingMaxHp,
        upgrades: {},
        helpers: {},
        lastSaveTime: Date.now()
      };
    });
  };

  // -------------------------------------------------------------
  // SHOP BOOSTER OPERATIONS
  // -------------------------------------------------------------
  const handleBuyShopBoost = (boostId: string, gemCost: number) => {
    if (gameState.gems < gemCost) {
      audio.playLocked();
      return;
    }

    setGameState(prev => {
      audio.playBuy();
      const currentLv = prev.upgrades[boostId] || 0;
      return {
        ...prev,
        gems: prev.gems - gemCost,
        upgrades: {
          ...prev.upgrades,
          [boostId]: currentLv + 1
        }
      };
    });
  };

  const handleOpenMysteryChest = (gemCost: number) => {
    // Spends gems only, reward logic is handled directly in ShopTab
    setGameState(prev => ({
      ...prev,
      gems: Math.max(0, prev.gems - gemCost)
    }));
  };

  const handleClaimDailyReward = (rewardGems: number, rewardCoins: number) => {
    setGameState(prev => ({
      ...prev,
      gems: prev.gems + rewardGems,
      coins: prev.coins + rewardCoins,
      dailyRewardClaimedTime: Date.now()
    }));
  };

  // -------------------------------------------------------------
  // RESET ENTIRE GAME
  // -------------------------------------------------------------
  const handleResetEntireGame = () => {
    localStorage.removeItem(LOCAL_STORAGE_STATE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
    setGameState(DEFAULT_GAME_STATE(Date.now()));
    setSettings(DEFAULT_SETTINGS);
    audio.setSoundEnabled(true);
    setActiveTab(null);
  };

  // -------------------------------------------------------------
  // OFFLINE EARNINGS MODAL ACTIONS
  // -------------------------------------------------------------
  const handleCollectOffline = () => {
    if (!offlineEarnings) return;
    audio.playBuy();
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + offlineEarnings.coins,
      statTotalCoinsEarned: prev.statTotalCoinsEarned + offlineEarnings.coins
    }));
    setOfflineEarnings(null);
  };

  const handleDoubleOffline = () => {
    if (!offlineEarnings) return;
    const doubleCost = 15;
    if (gameState.gems < doubleCost) {
      audio.playLocked();
      return;
    }

    audio.playPrestige();
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + offlineEarnings.coins * 2,
      gems: prev.gems - doubleCost,
      statTotalCoinsEarned: prev.statTotalCoinsEarned + offlineEarnings.coins * 2
    }));
    setOfflineEarnings(null);
  };

  // -------------------------------------------------------------
  // MERGED LIVE LISTS FOR INTERFACES
  // -------------------------------------------------------------
  const activeUpgrades = useMemo(() => {
    return INITIAL_UPGRADES.map(u => ({
      ...u,
      level: gameState.upgrades[u.id] || 0
    }));
  }, [gameState.upgrades]);

  const activeTools = useMemo(() => {
    return INITIAL_TOOLS.map(t => ({
      ...t,
      unlocked: gameState.toolsUnlocked.includes(t.id)
    }));
  }, [gameState.toolsUnlocked]);

  const activeHelpers = useMemo(() => {
    return INITIAL_HELPERS.map(h => ({
      ...h,
      level: gameState.helpers[h.id] || 0
    }));
  }, [gameState.helpers]);

  const activeAchievements = useMemo(() => {
    return INITIAL_ACHIEVEMENTS.map(ach => {
      let currentVal = 0;
      switch (ach.type) {
        case 'total_breaks':
          currentVal = gameState.statTotalBreaks;
          break;
        case 'total_coins':
          currentVal = gameState.statTotalCoinsEarned;
          break;
        case 'max_world':
          currentVal = gameState.currentWorldId;
          break;
        case 'total_upgrades':
          // sum of all upgrade levels
          currentVal = (Object.values(gameState.upgrades) as number[]).reduce((sum, lv) => sum + (lv || 0), 0);
          break;
        case 'prestiges':
          currentVal = gameState.prestigeCount;
          break;
        case 'tools_unlocked':
          currentVal = gameState.toolsUnlocked.length;
          break;
      }
      return {
        ...ach,
        current: currentVal,
        completed: currentVal >= ach.target
      };
    });
  }, [gameState]);

  // Utility Number Formatter
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const hpPercent = Math.max(0, (gameState.wallHp / gameState.wallMaxHp) * 100);

  return (
    <div 
      className={`relative h-[100dvh] w-full overflow-hidden bg-[#0a0f1a] text-slate-100 flex flex-col transition-transform duration-100 select-none ${
        screenShake ? 'scale-[1.006] translate-y-1 translate-x-1 rotate-0.5' : ''
      }`}
      id="app-root-frame"
    >
      {/* 1. GAME CANVAS BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <GameCanvas
          ref={canvasRef}
          currentWorld={currentWorld}
          equippedTool={currentTool}
          gameState={gameState}
          onTapDamage={handleManualTap}
          idleDps={idleDps}
        />
        {/* Dark Vignette Gradient Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(6, 9, 14, 0.75) 100%)'
          }}
        />
      </div>

      {/* 2. HUD OVERLAY */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        {/* TOP BAR */}
        <header className="pointer-events-auto flex items-center justify-between p-2.5 md:p-4 gap-2">
          {/* LEFT: Game Title + Info Guide button */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col drop-shadow-md">
              <h1 className="text-lg md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-none" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                IDLE WALL
                <span className="block text-amber-500 bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-transparent text-sm md:text-xl">DESTROYER</span>
              </h1>
            </div>
            <button 
              onClick={() => { audio.playTap(); setActiveTab('guide'); }}
              className="flex items-center gap-1 bg-[#121b2d]/90 hover:bg-amber-500/20 text-amber-400 border border-amber-500/50 px-2.5 py-1 rounded-xl shadow-lg backdrop-blur-md transition-all text-xs font-bold"
              title="Guide & Core Loop"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </button>
          </div>

          {/* CENTER: World Badge matching Reference */}
          <div className="hidden md:flex items-center gap-2 bg-[#0b0f19]/90 border border-slate-700/80 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
            <Globe className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold text-slate-100 uppercase tracking-wide">
              World {gameState.currentWorldId}: {currentWorld.name}
            </span>
            <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              {hpPercent}%
            </span>
          </div>

          {/* RIGHT: Currencies */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 bg-[#0b0f19]/90 border border-amber-500/40 px-2.5 sm:px-3 py-1.5 rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.15)] backdrop-blur-md">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs md:text-sm font-bold text-amber-100 font-mono">{formatNumber(gameState.coins)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0b0f19]/90 border border-cyan-500/40 px-2.5 sm:px-3 py-1.5 rounded-full shadow-[0_2px_10px_rgba(6,182,212,0.15)] backdrop-blur-md">
              <Gem className="w-4 h-4 text-cyan-400" />
              <span className="text-xs md:text-sm font-bold text-cyan-100 font-mono">{gameState.gems}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0b0f19]/90 border border-purple-500/40 px-2.5 sm:px-3 py-1.5 rounded-full shadow-[0_2px_10px_rgba(168,85,247,0.15)] backdrop-blur-md">
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <span className="text-xs md:text-sm font-bold text-purple-100 font-mono">+{Math.round((gameState.prestigeMultiplier - 1) * 100)}%</span>
            </div>
          </div>
        </header>

        {/* ACTIVE EVENT BANNER */}
        {gameState.activeEvent && (
          <div className="pointer-events-auto mx-auto -mt-1 bg-gradient-to-r from-amber-600/90 via-rose-600/90 to-amber-600/90 border border-amber-300 text-white px-5 py-2 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.5)] backdrop-blur-md flex items-center gap-3 animate-pulse">
            <Zap className="w-5 h-5 text-yellow-300 animate-bounce" />
            <div className="flex flex-col text-center">
              <span className="text-xs md:text-sm font-black uppercase tracking-wider font-mono">
                {gameState.activeEvent.name}
              </span>
              <span className="text-[10px] text-amber-100 font-medium">
                {gameState.activeEvent.description} ({gameState.activeEvent.durationLeft}s)
              </span>
            </div>
          </div>
        )}

        {/* MIDDLE SECTION (Side Buttons) */}
        <div className="flex-1 flex justify-between items-center px-3 md:px-5 pb-16">
          
          {/* LEFT HUD BUTTONS */}
          <div className="pointer-events-auto flex flex-col gap-2.5 md:gap-3">
            <HudButton 
              icon={<Store className="w-4 h-4 md:w-5 md:h-5 text-emerald-300 group-hover:scale-110 transition-transform" />} 
              label="Shop" 
              onClick={() => { audio.playTap(); setActiveTab('shop'); }} 
              color="emerald"
            />
            <HudButton 
              icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-amber-300 group-hover:scale-110 transition-transform" />} 
              label="Upgrades" 
              onClick={() => { audio.playTap(); setActiveTab('upgrades'); }} 
              color="amber"
              affordable={canAffordAnyUpgrade}
            />
            <HudButton 
              icon={<Hammer className="w-4 h-4 md:w-5 md:h-5 text-cyan-300 group-hover:scale-110 transition-transform" />} 
              label="Tools" 
              onClick={() => { audio.playTap(); setActiveTab('tools'); }} 
              color="slate"
              affordable={canAffordAnyTool}
            />
            <HudButton 
              icon={<Bot className="w-4 h-4 md:w-5 md:h-5 text-sky-300 group-hover:scale-110 transition-transform" />} 
              label="Helpers" 
              onClick={() => { audio.playTap(); setActiveTab('helpers'); }} 
              color="blue"
              affordable={canAffordAnyHelper}
            />
            <HudButton 
              icon={<Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-300 group-hover:scale-110 transition-transform" />} 
              label="Trophies" 
              onClick={() => { audio.playTap(); setActiveTab('achievements'); }} 
              color="yellow"
              badge={activeAchievements.some(a => a.completed && !gameState.achievementsClaimed.includes(a.id))}
            />
          </div>

          {/* RIGHT HUD BUTTONS */}
          <div className="pointer-events-auto flex flex-col gap-2.5 md:gap-3 items-end">
             <HudButton 
              icon={<Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-300 group-hover:rotate-12 transition-transform" />} 
              label="Prestige" 
              onClick={() => { audio.playTap(); setActiveTab('prestige'); }} 
              color="purple"
              affordable={canPrestige}
            />
             <HudButton 
              icon={<Globe className="w-4 h-4 md:w-5 md:h-5 text-teal-300 group-hover:scale-110 transition-transform" />} 
              label="Worlds" 
              onClick={() => { audio.playTap(); setActiveTab('worlds'); }} 
              color="cyan"
            />
             <HudButton 
              icon={<Sliders className="w-4 h-4 md:w-5 md:h-5 text-slate-200 group-hover:rotate-45 transition-transform duration-300" />} 
              label="Settings" 
              onClick={() => { audio.playTap(); setActiveTab('settings'); }} 
              color="gray"
            />

            {/* Loot Chest Button matching Reference */}
            <button
              onClick={handleClaimLootChest}
              disabled={lootSecondsLeft > 0}
              className={`mt-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-all backdrop-blur-md shadow-xl ${
                lootSecondsLeft === 0 
                  ? 'bg-gradient-to-b from-amber-500/30 to-yellow-600/30 border-amber-400 animate-pulse cursor-pointer hover:scale-105' 
                  : 'bg-[#121827]/80 border-slate-700/80 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1 text-amber-400">
                <Gift className={`w-4 h-4 ${lootSecondsLeft === 0 ? 'animate-bounce' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {lootSecondsLeft === 0 ? 'CLAIM!' : 'LOOT BOX'}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-200 mt-0.5">
                {lootSecondsLeft === 0 ? 'Ready! 🎁' : formatTime(lootSecondsLeft)}
              </span>
            </button>

            {/* DPS & Stats display */}
            <div className="bg-[#121827]/80 border border-slate-700/80 p-2 md:p-3 rounded-xl text-right backdrop-blur-sm shadow-xl min-w-[80px]">
              <span className="block text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">DPS</span>
              <span className="block text-xs md:text-base font-bold text-amber-400 font-mono">{formatNumber(idleDps)}<span className="text-[10px] text-amber-600">/s</span></span>
              
              <div className="w-full h-px bg-slate-700/50 my-1" />
              
              <span className="block text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Tap DMG</span>
              <span className="block text-xs md:text-base font-bold text-rose-400 font-mono">{formatNumber(tapDamage)}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM HP BAR matching Reference */}
        <div className="pointer-events-auto px-2 sm:px-6 md:px-8 flex flex-col items-center justify-end pb-3 md:pb-6">
          
          {/* Quick Tool Switcher Dock */}
          <div className="flex items-center gap-1.5 bg-[#0b0f19]/90 border border-amber-500/30 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md mb-2 max-w-full overflow-x-auto">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1 flex-none mr-1">
              <Wrench className="w-3.5 h-3.5" />
              Equipped:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              {INITIAL_TOOLS.map(tool => {
                const isUnlocked = gameState.toolsUnlocked.includes(tool.id);
                const isEquipped = gameState.equippedToolId === tool.id;
                if (!isUnlocked) return null;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      handleEquipTool(tool.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isEquipped
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-md scale-105'
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={`${tool.name} (${tool.multiplier}x Tap Damage)`}
                  >
                    <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: isEquipped ? '#020617' : tool.color }} />
                    <span className="truncate max-w-[85px] sm:max-w-[120px]">{tool.name}</span>
                    <span className="text-[10px] font-mono opacity-90">({tool.multiplier}x)</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { audio.playTap(); setActiveTab('tools'); }}
              className="ml-1 text-[10px] font-black text-amber-300 hover:text-amber-200 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 flex-none transition-all cursor-pointer"
            >
              ARSENAL
            </button>
          </div>

          {/* World Name Title Pill */}
          <div className="text-center mb-2 drop-shadow-md bg-black/75 px-4 py-1 rounded-full backdrop-blur-md border border-slate-700/80 shadow-lg pointer-events-auto cursor-pointer" onClick={() => handleManualTap(window.innerWidth / 2, window.innerHeight / 2)}>
            <div className="text-xs sm:text-sm md:text-base text-slate-200 font-bold flex items-center gap-2">
              <span>World {gameState.currentWorldId}: {currentWorld.name}</span>
              <span className="text-amber-400 text-xs font-mono font-black">({hpPercent}%)</span>
            </div>
          </div>

          {/* Level, Bar & Combo Container */}
          <div className="w-full max-w-2xl flex items-center gap-2">
            {/* Level Badge */}
            <div className="bg-[#121827] border-2 border-slate-700 px-2.5 py-1 rounded-xl text-center shadow-xl flex-none">
              <span className="block text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Level</span>
              <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">Lv.{gameState.currentWorldWallIndex}</span>
            </div>

            {/* Health Bar */}
            <div className="flex-1 bg-[#0a0f1a] h-7 md:h-9 rounded-full border-2 border-slate-700 relative shadow-2xl overflow-hidden pointer-events-auto cursor-pointer" onClick={() => handleManualTap(window.innerWidth / 2, window.innerHeight / 2)}>
              {/* Fill */}
              <div 
                className="bg-gradient-to-r from-emerald-500 via-green-400 to-amber-400 h-full transition-all duration-75 relative"
                style={{ width: `${hpPercent}%` }}
              >
                {/* Shine effect */}
                <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/20 rounded-full" />
              </div>
              {/* Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] md:text-sm font-black text-white font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,1)] tracking-wider">
                  {formatNumber(gameState.wallHp)} / {formatNumber(gameState.wallMaxHp)}
                </span>
              </div>
            </div>

            {/* Combo Badge */}
            <div className={`bg-[#121827] border-2 transition-all px-2.5 py-1 rounded-xl text-center shadow-xl flex-none ${comboMultiplier > 1 ? 'border-amber-400 bg-amber-950/40 text-amber-300 animate-pulse' : 'border-slate-700 text-slate-400'}`}>
              <span className="block text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Combo</span>
              <span className="text-xs sm:text-sm font-black font-mono">x{comboMultiplier}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. MODAL SYSTEM FOR TABS */}
      {activeTab && (
        <div className="absolute inset-0 z-50 pointer-events-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 opacity-100 transition-opacity animate-in fade-in">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-2xl h-[90vh] md:h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden transform animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => { audio.playTap(); setActiveTab(null); }}
              className="absolute top-3 right-3 md:top-4 md:right-4 z-10 p-2 bg-slate-800/80 hover:bg-rose-500 hover:text-white text-slate-400 rounded-lg transition-colors border border-slate-700"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Modal Body (Tab Content) */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 custom-scrollbar flex flex-col relative pt-14">
               {activeTab === 'guide' && <GuideTab />}
               {activeTab === 'upgrades' && (
                 <UpgradesTab
                   upgrades={activeUpgrades}
                   gameState={gameState}
                   onBuyUpgrade={handleBuyUpgrade}
                 />
               )}
               {activeTab === 'tools' && (
                 <ToolsTab
                   tools={activeTools}
                   worlds={WORLDS}
                   gameState={gameState}
                   onUnlockTool={handleUnlockTool}
                   onEquipTool={handleEquipTool}
                 />
               )}
               {activeTab === 'helpers' && (
                 <HelpersTab
                   helpers={activeHelpers}
                   gameState={gameState}
                   onBuyHelper={handleBuyHelper}
                 />
               )}
               {activeTab === 'worlds' && (
                 <WorldsTab
                   worlds={WORLDS}
                   gameState={gameState}
                   onSelectWorld={handleSelectWorld}
                 />
               )}
               {activeTab === 'achievements' && (
                 <AchievementsTab
                   achievements={activeAchievements}
                   gameState={gameState}
                   onClaimReward={handleClaimAchievement}
                 />
               )}
               {activeTab === 'prestige' && (
                 <PrestigeTab
                   gameState={gameState}
                   onPrestige={handlePrestige}
                 />
               )}
               {activeTab === 'shop' && (
                 <ShopTab
                   gameState={gameState}
                   onBuyPermanentBoost={handleBuyShopBoost}
                   onOpenMysteryChest={handleOpenMysteryChest}
                   onClaimDailyReward={handleClaimDailyReward}
                 />
               )}
               {activeTab === 'settings' && (
                 <SettingsTab
                   settings={settings}
                   onUpdateSettings={handleUpdateSettings}
                   onResetGame={handleResetEntireGame}
                 />
               )}
            </div>
          </div>
        </div>
      )}

      {/* BANNER NOTIFICATION */}
      {worldUnlockAlert && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center pointer-events-none">
           <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-2.5 px-6 rounded-full shadow-lg shadow-orange-500/30 text-white text-sm md:text-base font-extrabold tracking-wider uppercase animate-bounce border-2 border-white/20 drop-shadow-xl">
             🚀 {worldUnlockAlert}
           </div>
        </div>
      )}

      {/* OFFLINE EARNINGS MODAL */}
      {offlineEarnings && (
        <OfflineModal
          coinsEarned={offlineEarnings.coins}
          timeAwaySec={offlineEarnings.sec}
          gemCostToDouble={15}
          playerGems={gameState.gems}
          onCollect={handleCollectOffline}
          onDouble={handleDoubleOffline}
        />
      )}

      {/* LOOT REWARD MODAL */}
      {lootRewardModal && (
        <div className="absolute inset-0 z-50 pointer-events-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f172a] border-2 border-amber-500/80 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] relative transform animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg mb-3 animate-bounce">
              <Gift className="w-9 h-9 text-slate-950" />
            </div>
            <h3 className="text-xl font-black italic uppercase text-amber-400 tracking-wider mb-1">
              LOOT BOX UNLOCKED!
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Here are your bonus resources for keeping the destruction active!
            </p>
            <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex justify-around mb-5">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-base font-bold text-amber-100 font-mono">+{formatNumber(lootRewardModal.coins)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-bold text-cyan-100 font-mono">+{lootRewardModal.gems}</span>
              </div>
            </div>
            <button
              onClick={() => { audio.playTap(); setLootRewardModal(null); }}
              className="w-full py-2.5 rounded-xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              COLLECT REWARDS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// HELPER COMPONENT FOR FLOATING HUD BUTTONS
// -------------------------------------------------------------
function HudButton({ 
  icon, 
  label, 
  onClick, 
  color, 
  badge = false, 
  affordable = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void, 
  color: string, 
  badge?: boolean,
  affordable?: boolean
}) {
  const badgeColorMap: Record<string, { bg: string; border: string; shadow: string; text: string }> = {
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-950/90 to-teal-950/90',
      border: 'border-emerald-400/60 group-hover:border-emerald-300',
      shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      text: 'text-emerald-300'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-950/90 to-yellow-950/90',
      border: 'border-amber-400/60 group-hover:border-amber-300',
      shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      text: 'text-amber-300'
    },
    slate: {
      bg: 'bg-gradient-to-br from-cyan-950/90 to-slate-900/90',
      border: 'border-cyan-400/60 group-hover:border-cyan-300',
      shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      text: 'text-cyan-300'
    },
    blue: {
      bg: 'bg-gradient-to-br from-sky-950/90 to-indigo-950/90',
      border: 'border-sky-400/60 group-hover:border-sky-300',
      shadow: 'shadow-[0_0_15px_rgba(56,189,248,0.3)]',
      text: 'text-sky-300'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-950/90 to-amber-950/90',
      border: 'border-yellow-400/60 group-hover:border-yellow-300',
      shadow: 'shadow-[0_0_15px_rgba(250,204,21,0.3)]',
      text: 'text-yellow-300'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-950/90 to-fuchsia-950/90',
      border: 'border-purple-400/60 group-hover:border-purple-300',
      shadow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]',
      text: 'text-purple-300'
    },
    cyan: {
      bg: 'bg-gradient-to-br from-teal-950/90 to-emerald-950/90',
      border: 'border-teal-400/60 group-hover:border-teal-300',
      shadow: 'shadow-[0_0_15px_rgba(45,212,191,0.3)]',
      text: 'text-teal-300'
    },
    gray: {
      bg: 'bg-gradient-to-br from-slate-900/90 to-zinc-900/90',
      border: 'border-slate-500/60 group-hover:border-slate-300',
      shadow: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]',
      text: 'text-slate-300'
    },
  };
  
  const styleConf = badgeColorMap[color] || badgeColorMap.slate;

  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-[62px] h-[62px] md:w-[74px] md:h-[74px] rounded-2xl bg-[#0a0f1d]/95 border border-slate-700/80 shadow-[0_8px_25px_rgba(0,0,0,0.7)] hover:border-slate-400 hover:scale-105 active:scale-95 transition-all overflow-hidden group backdrop-blur-md cursor-pointer ${
        affordable 
          ? 'ring-2 ring-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse' 
          : ''
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
      
      {/* Icon Medallion Badge */}
      <div className={`z-10 w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center mb-1 transition-all group-hover:scale-110 ${styleConf.bg} ${styleConf.border} ${styleConf.shadow}`}>
        {icon}
      </div>

      <span className={`z-10 text-[8px] md:text-[9px] font-black uppercase tracking-wider ${styleConf.text} drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`}>
        {label}
      </span>

      {/* Affordability Glowing Green Badge Dot */}
      {affordable && (
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399] border border-slate-900" />
      )}

      {/* Achievement / Notification Badge */}
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#0a0f1a] animate-ping" />
      )}
    </button>
  );
}
