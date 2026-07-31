import React, { useState } from 'react';
import { GameSettings } from '../types';
import { 
  Settings, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldAlert, 
  Trash2, 
  Vibrate,
  Info
} from 'lucide-react';
import { audio } from './AudioEngine';

interface SettingsTabProps {
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onResetGame: () => void;
}

export default function SettingsTab({ settings, onUpdateSettings, onResetGame }: SettingsTabProps) {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const toggleSound = () => {
    const newVal = !settings.soundEnabled;
    onUpdateSettings({ soundEnabled: newVal });
    audio.setSoundEnabled(newVal);
    if (newVal) {
      audio.playTap(true);
    }
  };

  const setParticles = (level: 'low' | 'medium' | 'high') => {
    onUpdateSettings({ particlesLevel: level });
    audio.playBuy();
  };

  const toggleVibration = () => {
    onUpdateSettings({ vibrationEnabled: !settings.vibrationEnabled });
    audio.playTap();
  };

  const handleReset = () => {
    audio.playLocked();
    onResetGame();
    setShowConfirmReset(false);
  };

  return (
    <div className="flex flex-col gap-4 h-full" id="settings-tab-container">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-slate-800 pb-2 md:pb-3" id="settings-tab-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400 animate-spin" style={{ animationDuration: '8s' }} />
            Control Deck
          </h2>
          <p className="text-xs text-slate-400">Manage audio, visual density, and account persistence</p>
        </div>
      </div>

      {/* Main settings options list */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1" id="settings-options-list">
        
        {/* Row 1: Audio Volume */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between" id="setting-sound">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
              {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-amber-500" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Synthesizer Sound Effects</h3>
              <p className="text-xs text-slate-400">Play real-time Web Audio API chiptunes on smashing</p>
            </div>
          </div>

          <button
            onClick={toggleSound}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              settings.soundEnabled
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            id="toggle-sound-btn"
          >
            {settings.soundEnabled ? 'MUTE SOUNDS' : 'UNMUTE SOUNDS'}
          </button>
        </div>

        {/* Row 2: Screen Shake / Vibration */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between" id="setting-vibrate">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
              <Vibrate className={`w-5 h-5 ${settings.vibrationEnabled ? 'text-amber-500' : 'text-slate-500'}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Screen Impact Shake</h3>
              <p className="text-xs text-slate-400">Shake the UI slightly on critical bursts & breaks</p>
            </div>
          </div>

          <button
            onClick={toggleVibration}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              settings.vibrationEnabled
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            id="toggle-vibrate-btn"
          >
            {settings.vibrationEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Row 3: Particles Density */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3" id="setting-particles">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Shatter Particle Density</h3>
              <p className="text-xs text-slate-400">Select particle rendering limit to ensure silky smooth 60fps</p>
            </div>
          </div>

          <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-0.5" id="particle-selector-pills">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setParticles(level)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  settings.particlesLevel === level
                    ? 'bg-cyan-500 text-slate-950 shadow shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
                id={`particle-level-${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-slate-900/30 border border-slate-900/80 rounded-xl p-4 flex gap-3 text-xs text-slate-400" id="setting-info-box">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-slate-200 block mb-0.5">Automated Cloud Persistence</span>
            The destroyer platform automatically captures state benchmarks. Saving completes every 10 seconds and instantly when closing the browser tab.
          </div>
        </div>

        {/* Row 4: Account Reset */}
        <div className="bg-red-950/10 border border-red-950/40 rounded-xl p-4 flex flex-col gap-3 mt-4" id="setting-reset">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-red-200 text-sm">Wipe Save Progress</h3>
              <p className="text-xs text-red-400/80">Irreversibly delete all local storage, coin levels, upgrades, and gems</p>
            </div>
          </div>

          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="py-2.5 px-4 rounded-xl bg-red-900/20 hover:bg-red-900/35 text-red-400 hover:text-red-300 font-bold text-xs transition-all border border-red-900/30 cursor-pointer self-start"
              id="confirm-reset-trigger"
            >
              DELETE SAVE DATA
            </button>
          ) : (
            <div className="flex flex-col gap-2.5 bg-red-950/30 border border-red-900/40 p-3 rounded-lg" id="reset-safety-warning">
              <div className="flex items-start gap-1.5 text-xs text-red-300 font-bold leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>ARE YOU ABSOLUTELY SURE? This deletes everything, including rebirth points, achievements, and shop boosters.</span>
              </div>
              <div className="flex gap-2 justify-end mt-1.5 text-xs">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-slate-100 font-bold hover:bg-slate-800 transition-all cursor-pointer"
                  id="cancel-reset-btn"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold transition-all cursor-pointer select-none"
                  id="execute-reset-btn"
                >
                  CONFIRM WIPE
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
