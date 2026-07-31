import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { World, Tool, GameState } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  life: number; // 0 to 1
  decay: number;
  isSpark?: boolean;
  bounces?: number;
}

interface DustCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  alpha: number;
  color: string;
}

interface Meteor {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  size: number;
  trail: { x: number; y: number }[];
  alpha: number;
}

interface Ember {
  x: number;
  y: number;
  size: number;
  speedY: number;
  swaySpeed: number;
  swayOffset: number;
  alpha: number;
  color: string;
}

interface Star {
  baseAngle: number;
  radius: number;
  size: number;
  baseAlpha: number;
  layer: number; // 1 (far), 2 (mid), 3 (near)
  color: string;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ImpactFlare {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface FlyingCoin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  alpha: number;
  life: number;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  isCrit?: boolean;
  scale: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface LaserBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  alpha: number;
}

export interface GameCanvasHandle {
  spawnFloatingText: (text: string, x: number, y: number, isCrit: boolean) => void;
  triggerBlockBreak: (clickX: number, clickY: number, count?: number) => void;
  triggerCritSparkExplosion: (clickX: number, clickY: number) => void;
  triggerWallShatter: () => void;
  fireDroneLaser: (droneId: string, droneX: number, droneY: number) => void;
  triggerMeteor: (targetX?: number, targetY?: number) => void;
  triggerCoinRain: () => void;
}

interface GameCanvasProps {
  currentWorld: World;
  equippedTool: Tool;
  gameState: GameState;
  onTapDamage: (x: number, y: number) => void;
  idleDps: number;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  currentWorld,
  equippedTool,
  gameState,
  onTapDamage,
  idleDps
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas size state
  const [dimensions, setDimensions] = useState({ width: 500, height: 450 });

  // Animation assets & dynamic states
  const particlesRef = useRef<Particle[]>([]);
  const dustRef = useRef<DustCloud[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const embersRef = useRef<Ember[]>([]);
  const starsRef = useRef<Star[]>([]);
  const flaresRef = useRef<ImpactFlare[]>([]);
  const coinsRef = useRef<FlyingCoin[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);

  // Hit feel feedback states
  const cameraShakeRef = useRef({ power: 0, decay: 0.65 });
  const hitStopFramesRef = useRef<number>(0);

  // Tool animation states
  const toolSwingAngleRef = useRef(0); // in radians
  const toolSwingTargetRef = useRef(0);
  const toolSwingXRef = useRef(0);
  const toolSwingYRef = useRef(0);
  const toolActiveRef = useRef(false);

  // Wall structure state: grid of blocks (7 rows, 6 columns = 42 blocks)
  const rows = 7;
  const cols = 6;
  const totalBlocks = rows * cols;
  const blocksRef = useRef<boolean[]>(Array(totalBlocks).fill(true));

  // Initialize ambient background embers and parallax stars
  useEffect(() => {
    const embers: Ember[] = [];
    for (let i = 0; i < 35; i++) {
      embers.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: 1 + Math.random() * 2.5,
        speedY: 0.3 + Math.random() * 0.7,
        swaySpeed: 0.01 + Math.random() * 0.02,
        swayOffset: Math.random() * Math.PI * 2,
        alpha: 0.2 + Math.random() * 0.6,
        color: Math.random() > 0.4 ? '#f59e0b' : '#38bdf8',
      });
    }
    embersRef.current = embers;

    // Initialize 90 parallax stars for background circular movement
    const stars: Star[] = [];
    const colors = ['#ffffff', '#bae6fd', '#fef08a', '#e0e7ff', '#f472b6'];
    for (let i = 0; i < 90; i++) {
      const layer = Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : 3;
      const baseAngle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 600;
      const size = layer === 1 ? (0.8 + Math.random() * 0.8) : layer === 2 ? (1.5 + Math.random() * 1.0) : (2.2 + Math.random() * 1.5);
      const baseAlpha = layer === 1 ? (0.2 + Math.random() * 0.3) : layer === 2 ? (0.4 + Math.random() * 0.35) : (0.6 + Math.random() * 0.4);
      const color = colors[Math.floor(Math.random() * colors.length)];

      stars.push({
        baseAngle,
        radius,
        size,
        baseAlpha,
        layer,
        color,
        twinkleSpeed: 0.0015 + Math.random() * 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Sync blocks state with current HP percentage
  useEffect(() => {
    const hpPercent = gameState.wallHp / gameState.wallMaxHp;
    const activeBlockCount = Math.ceil(hpPercent * totalBlocks);
    const newBlocks = Array(totalBlocks).fill(false);
    
    // Seeded scattering order so bricks chip away realistically
    const seededOrder = [
      20, 21, 26, 27, 14, 15, 32, 33, 19, 22, 25, 28, 8, 9, 38, 39,
      13, 16, 31, 34, 7, 10, 37, 40, 2, 3, 44, 45, 12, 17, 30, 35,
      6, 11, 36, 41, 1, 4, 43, 46, 0, 5, 42, 47, 18, 23, 24, 29
    ];

    const order = seededOrder.slice(0, totalBlocks);

    for (let i = 0; i < activeBlockCount; i++) {
      if (order[i] !== undefined) {
        newBlocks[order[i]] = true;
      }
    }
    blocksRef.current = newBlocks;
  }, [gameState.wallHp, gameState.wallMaxHp, totalBlocks]);

  // Expose triggers to parent
  useImperativeHandle(ref, () => ({
    spawnFloatingText(text, x, y, isCrit) {
      floatingTextsRef.current.push({
        id: Math.random().toString(),
        text: isCrit ? `💥 CRIT! +${text}` : `+${text}`,
        x,
        y,
        vy: isCrit ? -4 : -2.5,
        color: isCrit ? '#f43f5e' : '#fbbf24', // neon rose for crit, bright gold for standard
        size: isCrit ? 26 : 18,
        alpha: 1,
        life: 1.0,
        isCrit,
        scale: 1.5, // initial spring scale pop
      });
    },

    triggerBlockBreak(clickX, clickY, count = 14) {
      // Hit feel feedback - light subtle punch
      hitStopFramesRef.current = 0;
      cameraShakeRef.current.power = Math.max(cameraShakeRef.current.power, count > 16 ? 4 : 2);

      // 1. Spawn solid rock debris particles that bounce
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 6;
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5, // upward velocity burst
          color: getRandomMaterialColor(currentWorld.material),
          size: 5 + Math.random() * 10,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          alpha: 1.0,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.02,
          bounces: 0,
        });
      }

      // 2. Spawn subtle small dust puff
      if (dustRef.current.length < 10) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.2;
        dustRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          size: 5 + Math.random() * 5,
          maxSize: 14 + Math.random() * 8,
          alpha: 0.25,
          color: currentWorld.color || '#9ca3af',
        });
      }

      // 3. Spawn bright sparks
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4.5 + Math.random() * 7;
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          color: '#ffffff',
          size: 2 + Math.random() * 3.5,
          rotation: 0,
          rotationSpeed: 0,
          alpha: 1.0,
          life: 1.0,
          decay: 0.03 + Math.random() * 0.04,
          isSpark: true,
        });
      }

      // 4. Spawn radial light flare
      flaresRef.current.push({
        x: clickX,
        y: clickY,
        radius: 10,
        maxRadius: 75,
        color: currentWorld.crackColor,
        alpha: 0.95,
      });

      // 5. Spawn flying golden coin particles
      for (let i = 0; i < 4; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
        const speed = 3.5 + Math.random() * 4.5;
        coinsRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 10 + Math.random() * 4,
          rotation: Math.random() * Math.PI,
          alpha: 1.0,
          life: 1.0,
        });
      }

      // 6. Add shockwave ring
      shockwavesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 5,
        maxRadius: 50,
        color: currentWorld.crackColor,
        alpha: 0.85,
      });
    },

    triggerCritSparkExplosion(clickX, clickY) {
      hitStopFramesRef.current = 0;
      cameraShakeRef.current.power = 5;

      // High intensity critical spark particle burst
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 6 + Math.random() * 10;
        const color = Math.random() > 0.4 ? '#f43f5e' : (Math.random() > 0.5 ? '#fbbf24' : '#ffffff');
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.5,
          color,
          size: 2.5 + Math.random() * 4.5,
          rotation: 0,
          rotationSpeed: 0,
          alpha: 1.0,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.03,
          isSpark: true,
        });
      }

      // Crit dust puffs
      for (let i = 0; i < 2; i++) {
        if (dustRef.current.length >= 10) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.5;
        dustRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          size: 8 + Math.random() * 6,
          maxSize: 20 + Math.random() * 10,
          alpha: 0.3,
          color: '#f43f5e',
        });
      }

      // Crit shockwave expansion
      shockwavesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 10,
        maxRadius: 100,
        color: '#f43f5e',
        alpha: 1.0,
      });

      // Crit radial light flare
      flaresRef.current.push({
        x: clickX,
        y: clickY,
        radius: 20,
        maxRadius: 110,
        color: '#f43f5e',
        alpha: 1.0,
      });
    },

    triggerWallShatter() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      hitStopFramesRef.current = 1;
      cameraShakeRef.current.power = 9;

      const wWidth = canvas.width;
      const wHeight = canvas.height;
      const minDimension = Math.min(wWidth, wHeight);
      const wallSize = Math.min(minDimension * 0.7, 700);
      const wallW = wallSize;
      const wallH = wallSize * 0.85;
      const wallX = wWidth / 2 - wallW / 2;
      const wallY = wHeight / 2 - wallH / 2;

      // Shatter entire wall - big particle explosion
      for (let i = 0; i < 65; i++) {
        const px = wallX + Math.random() * wallW;
        const py = wallY + Math.random() * wallH;
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 8;
        particlesRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4.5,
          color: getRandomMaterialColor(currentWorld.material),
          size: 8 + Math.random() * 16,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.35,
          alpha: 1.0,
          life: 1.0,
          decay: 0.01 + Math.random() * 0.015,
          bounces: 0,
        });
      }

      // Subtle dust puffs
      for (let i = 0; i < 4; i++) {
        if (dustRef.current.length >= 10) break;
        const px = wallX + Math.random() * wallW;
        const py = wallY + Math.random() * wallH;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.0;
        dustRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: 10 + Math.random() * 10,
          maxSize: 25 + Math.random() * 15,
          alpha: 0.35,
          color: currentWorld.crackColor || '#fbbf24',
        });
      }

      // Big flying coin cascade
      for (let i = 0; i < 16; i++) {
        const px = wallX + Math.random() * wallW;
        const py = wallY + Math.random() * wallH;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const speed = 4.5 + Math.random() * 6.5;
        coinsRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 12 + Math.random() * 5,
          rotation: Math.random() * Math.PI,
          alpha: 1.0,
          life: 1.0,
        });
      }

      // Massive flare burst
      flaresRef.current.push({
        x: wWidth / 2,
        y: wHeight / 2,
        radius: 20,
        maxRadius: 220,
        color: '#fbbf24',
        alpha: 1.0,
      });

      shockwavesRef.current.push({
        x: wWidth / 2,
        y: wHeight / 2,
        radius: 10,
        maxRadius: 180,
        color: '#ffffff',
        alpha: 1.0,
      });
    },

    triggerMeteor(targetX, targetY) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tx = targetX || canvas.width * 0.5;
      const ty = targetY || canvas.height * 0.45;

      meteorsRef.current.push({
        x: tx + 200 + Math.random() * 100,
        y: -50,
        targetX: tx,
        targetY: ty,
        speed: 16,
        size: 14,
        trail: [],
        alpha: 1.0,
      });
    },

    triggerCoinRain() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (let i = 0; i < 12; i++) {
        coinsRef.current.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 2,
          vy: 3 + Math.random() * 4,
          size: 10 + Math.random() * 4,
          rotation: Math.random() * Math.PI,
          alpha: 1.0,
          life: 1.2,
        });
      }
    },

    fireDroneLaser(droneId, droneX, droneY) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const wWidth = canvas.width;
      const wHeight = canvas.height;

      const targetX = wWidth * 0.35 + Math.random() * (wWidth * 0.3);
      const targetY = wHeight * 0.3 + Math.random() * (wHeight * 0.35);

      let laserColor = '#22c55e';
      let sparkColor = '#4ade80';

      if (droneId === 'mini_bot') {
        laserColor = '#3b82f6';
        sparkColor = '#60a5fa';
      } else if (droneId === 'laser_turret') {
        laserColor = '#ec4899';
        sparkColor = '#f43f5e';
      } else if (droneId === 'auto_hammer') {
        laserColor = '#f59e0b';
        sparkColor = '#fbbf24';
      }

      lasersRef.current.push({
        startX: droneX,
        startY: droneY,
        endX: targetX,
        endY: targetY,
        color: laserColor,
        alpha: 1.0,
      });

      // Impact sparks
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: sparkColor,
          size: 2 + Math.random() * 3,
          rotation: 0,
          rotationSpeed: 0,
          alpha: 1.0,
          life: 0.8,
          decay: 0.05,
          isSpark: true,
        });
      }
    }
  }));

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 100),
          height: Math.max(height, 100)
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Hit stop freeze frame mechanism (2-5 frames)
      if (hitStopFramesRef.current > 0) {
        hitStopFramesRef.current--;
      } else {
        update(dt, canvas.width, canvas.height);
      }

      render(ctx, time);

      animationFrameId = requestAnimationFrame(loop);
    };

    const update = (dt: number, width: number, height: number) => {
      const floorY = height * 0.92;

      // 1. Update particles with floor bounce physics
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (!p.isSpark) {
          p.vy += 0.35; // gravity for rock debris
          p.rotation += p.rotationSpeed;

          // Floor bounce
          if (p.y >= floorY && p.vy > 0 && (p.bounces || 0) < 2) {
            p.y = floorY;
            p.vy *= -0.4; // elastic bounce loss
            p.vx *= 0.6;
            p.bounces = (p.bounces || 0) + 1;
          }
        } else {
          p.vy += 0.1; // light gravity for sparks
        }

        p.life -= p.decay;
        p.alpha = Math.max(p.life, 0);

        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // 1b. Update expanding dust clouds
      const dust = dustRef.current;
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.x += d.vx;
        d.y += d.vy;
        d.size += (d.maxSize - d.size) * 0.12;
        d.alpha -= 0.04; // fast fading
        if (d.alpha <= 0) {
          dust.splice(i, 1);
        }
      }

      // 1c. Update meteors
      const meteors = meteorsRef.current;
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const dx = m.targetX - m.x;
        const dy = m.targetY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        m.trail.push({ x: m.x, y: m.y });
        if (m.trail.length > 8) m.trail.shift();

        if (dist < m.speed) {
          // Impact target!
          if (ref && typeof ref === 'object' && ref.current) {
            ref.current.triggerCritSparkExplosion(m.targetX, m.targetY);
          }
          meteors.splice(i, 1);
        } else {
          m.x += (dx / dist) * m.speed;
          m.y += (dy / dist) * m.speed;
        }
      }

      // 2. Update background embers
      embersRef.current.forEach(e => {
        e.y -= e.speedY;
        e.swayOffset += e.swaySpeed;
        e.x += Math.sin(e.swayOffset) * 0.5;

        if (e.y < -10) {
          e.y = height + 10;
          e.x = Math.random() * width;
        }
      });

      // 3. Update impact light flares
      const flares = flaresRef.current;
      for (let i = flares.length - 1; i >= 0; i--) {
        const fl = flares[i];
        fl.radius += (fl.maxRadius - fl.radius) * 0.25;
        fl.alpha -= 0.08;
        if (fl.alpha <= 0) {
          flares.splice(i, 1);
        }
      }

      // 4. Update flying gold coins
      const coins = coinsRef.current;
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.2; // gravity drop
        c.rotation += 0.2;
        c.life -= dt * 1.8;
        c.alpha = Math.max(c.life, 0);

        if (c.life <= 0) {
          coins.splice(i, 1);
        }
      }

      // 5. Update floating damage texts
      const floatingTexts = floatingTextsRef.current;
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.vy += 0.06;
        if (ft.scale > 1.0) {
          ft.scale -= 0.08; // scale down pop effect
        }
        ft.life -= dt * 1.4;
        ft.alpha = Math.max(ft.life, 0);

        if (ft.life <= 0) {
          floatingTexts.splice(i, 1);
        }
      }

      // 6. Update shockwaves
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.18;
        sw.alpha -= 0.06;
        if (sw.alpha <= 0) {
          shockwaves.splice(i, 1);
        }
      }

      // 7. Update lasers
      const lasers = lasersRef.current;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const beam = lasers[i];
        beam.alpha -= dt * 9;
        if (beam.alpha <= 0) {
          lasers.splice(i, 1);
        }
      }

      // 8. Update tool swing rotation
      if (toolActiveRef.current) {
        toolSwingAngleRef.current += (toolSwingTargetRef.current - toolSwingAngleRef.current) * 0.28;
        if (Math.abs(toolSwingAngleRef.current - toolSwingTargetRef.current) < 0.05) {
          toolSwingTargetRef.current = 0;
          if (toolSwingAngleRef.current < 0.1) {
            toolActiveRef.current = false;
          }
        }
      } else {
        toolSwingAngleRef.current += (0 - toolSwingAngleRef.current) * 0.12;
      }
    };

    const render = (ctx: CanvasRenderingContext2D, time: number) => {
      const width = canvas.width;
      const height = canvas.height;

      // Camera shake translation offset
      let shakeX = 0;
      let shakeY = 0;
      if (cameraShakeRef.current.power > 0.2) {
        shakeX = (Math.random() - 0.5) * cameraShakeRef.current.power;
        shakeY = (Math.random() - 0.5) * cameraShakeRef.current.power;
        cameraShakeRef.current.power *= cameraShakeRef.current.decay;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 1. Draw atmospheric world-dynamic CrazyGames background
      ctx.clearRect(0, 0, width, height);

      const mat = currentWorld.material || 'stone';
      const cx = width / 2;
      const cy = height / 2;

      // World-specific base color themes
      let bgCenter = '#151d2a';
      let bgMid = '#0d121c';
      let bgEdge = '#06090e';
      let gridColor = '#1a2234';

      if (mat === 'wood') {
        bgCenter = '#2a1b0e';
        bgMid = '#170f07';
        bgEdge = '#080502';
        gridColor = '#3b2210';
      } else if (mat === 'metal') {
        bgCenter = '#0f1c3f';
        bgMid = '#0a1024';
        bgEdge = '#030612';
        gridColor = '#1e2952';
      } else if (mat === 'ice') {
        bgCenter = '#0f2f4a';
        bgMid = '#071828';
        bgEdge = '#020a12';
        gridColor = '#1e3a5f';
      } else if (mat === 'neon') {
        bgCenter = '#3b0764';
        bgMid = '#1e0538';
        bgEdge = '#0a0114';
        gridColor = '#581c87';
      } else if (mat === 'lava') {
        bgCenter = '#450a0a';
        bgMid = '#220303';
        bgEdge = '#0a0101';
        gridColor = '#571111';
      } else if (mat === 'crystal') {
        bgCenter = '#4c1d95';
        bgMid = '#2e1065';
        bgEdge = '#0f0524';
        gridColor = '#6b21a8';
      } else if (mat === 'boss') {
        bgCenter = '#3f0707';
        bgMid = '#1e0303';
        bgEdge = '#020000';
        gridColor = '#450a0a';
      }

      // Draw rich radial background gradient
      const bgGradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(width, height) * 0.75);
      bgGradient.addColorStop(0, bgCenter);
      bgGradient.addColorStop(0.55, bgMid);
      bgGradient.addColorStop(1, bgEdge);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // World-specific thematic grid / horizon background elements
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      if (mat === 'neon') {
        // Synthwave 3D Perspective Grid
        const horizonY = height * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Sun/Glow on horizon
        const sunGrad = ctx.createRadialGradient(cx, horizonY, 5, cx, horizonY, 120);
        sunGrad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
        sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, width, height);

        // Perspective grid lines
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.lineWidth = 1;
        for (let x = -width; x <= width * 2; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, height);
          ctx.lineTo(cx + (x - cx) * 0.1, horizonY);
          ctx.stroke();
        }
        const gridSpeed = (time * 0.05) % 30;
        for (let y = horizonY; y < height; y += 15) {
          const ly = y + gridSpeed;
          if (ly < height) {
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.lineTo(width, ly);
            ctx.stroke();
          }
        }
      } else if (mat === 'metal') {
        // Cyber Grid with moving pulse line
        const bGridW = 50;
        const bGridH = 50;
        for (let y = 0; y < height; y += bGridH) {
          for (let x = 0; x < width; x += bGridW) {
            ctx.strokeRect(x, y, bGridW, bGridH);
          }
        }
        // Animated scanning line
        const scanY = (time * 0.12) % height;
        const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
        scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
        scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 20, width, 40);
      } else {
        // Standard masonry background grid
        const bGridW = 60;
        const bGridH = 30;
        for (let y = 0; y < height; y += bGridH) {
          const shift = ((y / bGridH) % 2) * (bGridW / 2);
          for (let x = -bGridW; x < width + bGridW; x += bGridW) {
            ctx.strokeRect(x + shift, y, bGridW, bGridH);
          }
        }
      }
      ctx.restore();

      // Parallax Circular Rotating Starfield Effect
      ctx.save();
      starsRef.current.forEach(star => {
        // Rotation speed scales with layer (layer 3 rotates faster for depth)
        const rotationSpeed = 0.00004 + star.layer * 0.00003;
        const currentAngle = star.baseAngle + time * rotationSpeed;
        
        const sx = cx + Math.cos(currentAngle) * star.radius;
        const sy = cy + Math.sin(currentAngle) * star.radius;
        
        // Skip stars outside visible viewport
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return;

        // Twinkle luminance calculation
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = Math.max(0.08, Math.min(1.0, star.baseAlpha + twinkle * 0.22));

        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;

        if (star.layer === 3) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = star.color;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Ambient radial light glow behind the wall - synchronized with idle DPS!
      const dpsFactor = Math.min(1 + Math.log10(Math.max(1, idleDps)), 3.5);
      const pulseSpeed = 1200 / (1 + Math.min(idleDps / 20, 4));
      const pulse = (Math.sin(time / pulseSpeed) + 1) / 2; // 0 to 1 smooth oscillation
      const pulseRadius = 240 + pulse * 60 * dpsFactor;
      const glowColor = currentWorld.crackColor || '#f59e0b';
      
      const wallGlow = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, pulseRadius);
      const alphaVal = 0.12 + pulse * 0.15 * (dpsFactor * 0.5);
      wallGlow.addColorStop(0, glowColor);
      wallGlow.addColorStop(0.5, glowColor + '30');
      wallGlow.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.save();
      ctx.globalAlpha = alphaVal;
      ctx.fillStyle = wallGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Radiating energy ring expanding outwards when idle DPS is active
      if (idleDps > 0) {
        const ringTime = (time / pulseSpeed) % 1; // 0 to 1 loop
        const ringRadius = 100 + ringTime * (width * 0.4);
        const ringAlpha = (1 - ringTime) * 0.25 * Math.min(dpsFactor, 2);
        
        ctx.save();
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Draw rising background embers
      embersRef.current.forEach(e => {
        ctx.save();
        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = e.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Wall calculations
      const minDimension = Math.min(width, height);
      const wallSize = Math.min(minDimension * 0.7, 700);
      const wallW = wallSize;
      const wallH = wallSize * 0.85;
      const wallX = width / 2 - wallW / 2;
      const wallY = height / 2 - wallH / 2;

      // Draw background helper drones
      drawBackgroundHelpers(ctx, width, height, time);

      // 4. Heavy stone wall frame & pedestal
      // Pedestal shadow underneath
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(width / 2, wallY + wallH + 18, wallW * 0.58, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pedestal metallic platform base
      const pedGrad = ctx.createLinearGradient(wallX - 20, wallY + wallH, wallX + wallW + 20, wallY + wallH + 16);
      pedGrad.addColorStop(0, '#0f172a');
      pedGrad.addColorStop(0.5, '#334155');
      pedGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = pedGrad;
      ctx.fillRect(wallX - 20, wallY + wallH, wallW + 40, 16);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wallX - 20, wallY + wallH, wallW + 40, 16);

      // Calculate HP ratio for dynamic glow color shifting
      const hpRatio = gameState.wallHp / gameState.wallMaxHp;
      let hpGlowColor = currentWorld.crackColor || '#38bdf8';
      let hpGlowBlur = 20;

      if (hpRatio <= 0.25) {
        // Critical status: urgent pulse red/rose
        const fastPulse = (Math.sin(time / 80) + 1) / 2;
        hpGlowColor = '#f43f5e'; // neon rose
        hpGlowBlur = 25 + fastPulse * 20;
      } else if (hpRatio <= 0.6) {
        // Warning status: vibrant amber
        hpGlowColor = '#f59e0b';
        hpGlowBlur = 22;
      } else {
        // Normal status: healthy world aura
        hpGlowColor = currentWorld.crackColor || '#10b981';
        hpGlowBlur = 18;
      }

      // Outer heavy industrial wall frame with dynamic HP glow
      ctx.save();
      ctx.shadowBlur = hpGlowBlur;
      ctx.shadowColor = hpGlowColor;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 8;
      ctx.strokeRect(wallX - 8, wallY - 8, wallW + 16, wallH + 16);

      ctx.strokeStyle = hpGlowColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(wallX - 4, wallY - 4, wallW + 8, wallH + 8);

      // Frame corner rivets / brackets
      const corners = [
        [wallX - 10, wallY - 10],
        [wallX + wallW + 2, wallY - 10],
        [wallX - 10, wallY + wallH + 2],
        [wallX + wallW + 2, wallY + wallH + 2],
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx, cy, 8, 8);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx + 2, cy + 2, 4, 4);
      });
      ctx.restore();

      // 5. EXPOSED INNER CORE CAVITY (Layer beneath active bricks)
      ctx.save();
      ctx.fillStyle = '#090d16'; // Deep subterranean cavern dark core
      ctx.fillRect(wallX, wallY, wallW, wallH);

      // Inner core background radial energy glow
      const coreGrad = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, wallW * 0.5
      );
      coreGrad.addColorStop(0, currentWorld.crackColor + '40');
      coreGrad.addColorStop(0.7, currentWorld.color + '20');
      coreGrad.addColorStop(1, '#05070c');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(wallX, wallY, wallW, wallH);

      // Mortar channel grid recessed background lines
      const blockW = wallW / cols;
      const blockH = wallH / rows;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(wallX, wallY + r * blockH);
        ctx.lineTo(wallX + wallW, wallY + r * blockH);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(wallX + c * blockW, wallY);
        ctx.lineTo(wallX + c * blockW, wallY + wallH);
        ctx.stroke();
      }
      ctx.restore();

      // 6. DRAW THE 3D BRICKS GRID
      const activeBlocks = blocksRef.current;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c;
          if (activeBlocks[index]) {
            const bx = wallX + c * blockW;
            const by = wallY + r * blockH;
            draw3DBrick(ctx, bx, by, blockW, blockH, r, c, time);
          }
        }
      }

      // WALL-WIDE PROCEDURAL SURFACE OVERLAY PASS (Dynamic overlay based on currentWorldId)
      ctx.save();
      ctx.beginPath();
      ctx.rect(wallX, wallY, wallW, wallH);
      ctx.clip();

      const overlayPulse = 0.5 + 0.5 * Math.sin(time * 0.0025);
      
      // World-specific global wall texture energy sweep
      if (currentWorld.crackColor) {
        const sweepGrad = ctx.createLinearGradient(
          wallX + Math.sin(time * 0.001) * wallW * 0.2,
          wallY,
          wallX + wallW,
          wallY + wallH
        );
        sweepGrad.addColorStop(0, 'rgba(0,0,0,0)');
        sweepGrad.addColorStop(0.5, currentWorld.crackColor + Math.floor(12 + overlayPulse * 22).toString(16).padStart(2, '0'));
        sweepGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(wallX, wallY, wallW, wallH);
      }

      // Depth vignette framing
      const wallVignette = ctx.createRadialGradient(
        wallX + wallW / 2, wallY + wallH / 2, wallW * 0.35,
        wallX + wallW / 2, wallY + wallH / 2, wallW * 0.75
      );
      wallVignette.addColorStop(0, 'rgba(0,0,0,0)');
      wallVignette.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = wallVignette;
      ctx.fillRect(wallX, wallY, wallW, wallH);
      ctx.restore();

      // 6. Draw laser beams from drones
      ctx.lineWidth = 4;
      lasersRef.current.forEach((beam) => {
        ctx.save();
        ctx.strokeStyle = beam.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = beam.color;
        ctx.globalAlpha = beam.alpha;
        ctx.beginPath();
        ctx.moveTo(beam.startX, beam.startY);
        ctx.lineTo(beam.endX, beam.endY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(beam.startX, beam.startY);
        ctx.lineTo(beam.endX, beam.endY);
        ctx.stroke();
        ctx.restore();
      });

      // 7. Draw shockwaves
      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = sw.alpha;
        ctx.shadowBlur = 14;
        ctx.shadowColor = sw.color;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 8. Draw impact radial light flares
      flaresRef.current.forEach((fl) => {
        ctx.save();
        ctx.globalAlpha = fl.alpha;
        const flareGrad = ctx.createRadialGradient(fl.x, fl.y, 2, fl.x, fl.y, fl.radius);
        flareGrad.addColorStop(0, '#ffffff');
        flareGrad.addColorStop(0.3, fl.color);
        flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 9. Draw debris particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.isSpark) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

          // Dark bevel outline for 3D block chunk
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      });

      // 10. Draw flying shiny gold coins
      coinsRef.current.forEach((c) => {
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);

        // Gold outer ring
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, c.size, 0, Math.PI * 2);
        ctx.fill();

        // Inner shiny core
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, c.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 11. Draw swinging tool
      drawEquippedTool(ctx, width, height);

      // 12. Draw floating damage text numbers
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.translate(ft.x, ft.y);
        ctx.scale(ft.scale, ft.scale);

        ctx.font = `black ${ft.size}px Orbitron, sans-serif, system-ui`;
        ctx.textAlign = 'center';

        // Outer heavy drop shadow stroke
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, 0, 0);

        // Glow fill
        ctx.fillStyle = ft.color;
        ctx.shadowBlur = ft.isCrit ? 14 : 8;
        ctx.shadowColor = ft.color;
        ctx.fillText(ft.text, 0, 0);

        ctx.restore();
      });

      // 12b. Draw dust clouds (subtle, non-obscuring)
      dustRef.current.forEach((d) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, d.alpha * 0.25);
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 12c. Draw active meteors
      meteorsRef.current.forEach((m) => {
        ctx.save();
        if (m.trail.length > 1) {
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
          ctx.lineWidth = m.size * 1.4;
          ctx.beginPath();
          ctx.moveTo(m.trail[0].x, m.trail[0].y);
          for (let i = 1; i < m.trail.length; i++) {
            ctx.lineTo(m.trail[i].x, m.trail[i].y);
          }
          ctx.stroke();
        }
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#f97316';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Restore camera shake transform context
      ctx.restore();
    };

    // Render high-quality 3D Stone/Metal Bricks
    const draw3DBrick = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      row: number,
      col: number,
      time: number
    ) => {
      ctx.save();

      const material = currentWorld.material;
      const baseCol = currentWorld.color;

      // Base brick fill with subtle row lighting shade
      ctx.fillStyle = baseCol;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

      // Top-to-bottom ambient lighting shade on brick grid
      const rowRatio = row / rows;
      if (rowRatio < 0.4) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.15 * (1 - rowRatio / 0.4)).toFixed(2)})`;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      } else if (rowRatio > 0.6) {
        ctx.fillStyle = `rgba(0, 0, 0, ${(0.22 * ((rowRatio - 0.6) / 0.4)).toFixed(2)})`;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }

      // Top & Left Highlight Bevel Edge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + h - 1);
      ctx.lineTo(x + 1, y + 1);
      ctx.lineTo(x + w - 1, y + 1);
      ctx.lineTo(x + w - 4, y + 4);
      ctx.lineTo(x + 4, y + 4);
      ctx.lineTo(x + 4, y + h - 4);
      ctx.closePath();
      ctx.fill();

      // Bottom & Right Shadow Bevel Edge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x + w - 1, y + 1);
      ctx.lineTo(x + w - 1, y + h - 1);
      ctx.lineTo(x + 1, y + h - 1);
      ctx.lineTo(x + 4, y + h - 4);
      ctx.lineTo(x + w - 4, y + h - 4);
      ctx.lineTo(x + w - 4, y + 4);
      ctx.closePath();
      ctx.fill();

      // Material-specific artistic embellishments
      if (material === 'wood') {
        // Natural curved wood grain lines & knots
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + h * 0.3);
        ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.1, x + w - 4, y + h * 0.4);
        ctx.moveTo(x + 4, y + h * 0.7);
        ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.85, x + w - 4, y + h * 0.65);
        ctx.stroke();

        // Occasional wood knot
        if ((row * 7 + col * 13) % 5 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.arc(x + w * 0.6, y + h * 0.5, Math.min(w, h) * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (material === 'stone') {
        // Granite stippling & natural rock crack line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.15, y + 4);
        ctx.lineTo(x + w * 0.45, y + h * 0.55);
        ctx.lineTo(x + w * 0.82, y + h - 4);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + w * 0.3, y + h * 0.2, 3, 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x + w * 0.7, y + h * 0.6, 2, 2);
      } else if (material === 'metal') {
        // Brushed metallic sheen band
        const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        sheen.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = sheen;
        ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

        // Metallic corner hex rivets
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + 5, y + 5, 3, 3);
        ctx.fillRect(x + w - 8, y + 5, 3, 3);
        ctx.fillRect(x + 5, y + h - 8, 3, 3);
        ctx.fillRect(x + w - 8, y + h - 8, 3, 3);
      } else if (material === 'ice') {
        // Glassy ice reflection glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + w * 0.4, y + 4);
        ctx.lineTo(x + 4, y + h * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5, y + 6);
        ctx.lineTo(x + w * 0.3, y + h - 6);
        ctx.stroke();
      } else if (material === 'neon') {
        // Synth matrix neon border & center node
        ctx.strokeStyle = currentWorld.crackColor || '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

        ctx.fillStyle = baseCol;
        ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4);
      } else if (material === 'lava') {
        // Volcanic rock face with magma fissure
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y + h * 0.8);
        ctx.lineTo(x + w * 0.5, y + h * 0.4);
        ctx.lineTo(x + w * 0.85, y + h * 0.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (material === 'crystal') {
        // Gem faceted geometric cuts
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + 4);
        ctx.lineTo(x + w - 4, y + h / 2);
        ctx.lineTo(x + w / 2, y + h - 4);
        ctx.closePath();
        ctx.fill();
      } else if (material === 'boss') {
        // Obsidian sheen & crimson rune
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#dc2626';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // --- PROCEDURAL TEXTURE OVERLAY SYSTEM (based on currentWorld.id) ---
      const worldSeed = currentWorld.id * 1000 + 437;
      const getNoise = (offset: number) => {
        const val = Math.sin((row * 37 + col * 19 + offset) * 12.9898 + worldSeed) * 43758.5453;
        return val - Math.floor(val);
      };

      // 1. Procedural Noise Grain Stippling per brick
      const grainCount = 3 + Math.floor(getNoise(1) * 3);
      for (let g = 0; g < grainCount; g++) {
        const gx = x + 4 + getNoise(10 + g * 3) * (w - 8);
        const gy = y + 4 + getNoise(20 + g * 3) * (h - 8);
        const gSize = 1 + getNoise(30 + g * 3) * 1.5;
        const isLight = getNoise(40 + g * 3) > 0.5;
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.18)';
        ctx.fillRect(gx, gy, gSize, gSize);
      }

      // 2. Dynamic Shifting Procedural Energy & Crack Overlay by World ID
      const pulseTime = time * 0.003;
      const pulseVal = 0.5 + 0.5 * Math.sin(pulseTime + row * 0.4 + col * 0.3);

      if (currentWorld.id === 1) {
        // World 1: Grass/Dirt - Procedural Organic Moss Specks & Root Filaments
        if (row === 0 || getNoise(50) > 0.55) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.28)';
          ctx.fillRect(x + 4, y + 2, w * (0.3 + getNoise(51) * 0.5), 3);
        }
        ctx.strokeStyle = 'rgba(20, 83, 45, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y + 2);
        ctx.lineTo(x + w * 0.35, y + h * 0.5);
        ctx.lineTo(x + w * 0.15, y + h - 2);
        ctx.stroke();

      } else if (currentWorld.id === 2) {
        // World 2: Wood - Concentric Grain Ring Segment
        const knotX = x + w * (0.3 + getNoise(52) * 0.4);
        const knotY = y + h * (0.3 + getNoise(53) * 0.4);
        ctx.strokeStyle = 'rgba(69, 26, 3, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(knotX, knotY, Math.min(w, h) * 0.35, 0, Math.PI * 1.5);
        ctx.stroke();

      } else if (currentWorld.id === 3) {
        // World 3: Stone - Branching Fractured Rock Fissure
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 1.2;
        const fx1 = x + w * (0.2 + getNoise(54) * 0.2);
        const fy1 = y + 3;
        const fx2 = x + w * (0.4 + getNoise(55) * 0.3);
        const fy2 = y + h * 0.5;
        const fx3 = x + w * (0.7 + getNoise(56) * 0.2);
        const fy3 = y + h - 3;
        ctx.beginPath();
        ctx.moveTo(fx1, fy1);
        ctx.lineTo(fx2, fy2);
        ctx.lineTo(fx3, fy3);
        ctx.stroke();

      } else if (currentWorld.id === 4) {
        // World 4: Metal - Procedural Cyber Circuit Traces with Pulsing Nodes
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.25 + pulseVal * 0.35})`;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = pulseVal * 6;
        ctx.shadowColor = '#06b6d4';
        const cx1 = x + 5;
        const cy1 = y + h * 0.5;
        const cx2 = x + w * 0.5;
        const cy2 = y + h * 0.5;
        const cy3 = y + (getNoise(57) > 0.5 ? 5 : h - 5);
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx2, cy3);
        ctx.stroke();

        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(cx2, cy3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (currentWorld.id === 5) {
        // World 5: Neon - Shifting Neon Grid Lattice & Edge Glow
        ctx.strokeStyle = `rgba(236, 72, 153, ${0.3 + pulseVal * 0.45})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8 * pulseVal;
        ctx.shadowColor = '#ec4899';
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
        
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.2 + (1 - pulseVal) * 0.4})`;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y + h * 0.2);
        ctx.lineTo(x + w * 0.8, y + h * 0.8);
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (currentWorld.id === 6) {
        // World 6: Lava / Volcanic - Pulsing Magma Veins & Heat Glow
        ctx.strokeStyle = `rgba(249, 115, 22, ${0.4 + pulseVal * 0.55})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10 * pulseVal;
        ctx.shadowColor = '#f97316';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.1, y + h * 0.9);
        ctx.lineTo(x + w * 0.4, y + h * 0.4);
        ctx.lineTo(x + w * 0.9, y + h * 0.1);
        ctx.stroke();

        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + pulseVal * 0.2})`;
        ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
        ctx.shadowBlur = 0;

      } else {
        // World 7+ / Cosmic Crystal Void - Shifting Rainbow Prism / Rune Lines
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.3 + pulseVal * 0.4})`;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#c084fc';
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Outer black gap grid line for 3D mortar division
      ctx.strokeStyle = 'rgba(5, 8, 14, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      ctx.restore();
    };

    // Draw high-detail animated background helper drones, bots & turrets
    const drawBackgroundHelpers = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      time: number
    ) => {
      const droneCount = gameState.helpers['drone'] || 0;
      const botCount = gameState.helpers['mini_bot'] || 0;
      const turretCount = gameState.helpers['laser_turret'] || 0;
      const hammerCount = gameState.helpers['auto_hammer'] || 0;

      // Wall bounding box reference
      const minDimension = Math.min(width, height);
      const wallSize = Math.min(minDimension * 0.7, 700);
      const wallW = wallSize;
      const wallH = wallSize * 0.85;
      const wallX = width / 2 - wallW / 2;
      const wallY = height / 2 - wallH / 2;

      // 1. SHATTER DRONES (Hovering Quadrotor Combat Drones)
      if (droneCount > 0) {
        const droneCoords = [
          { x: width * 0.12, y: height * 0.28, phase: 0 },
          { x: width * 0.88, y: height * 0.28, phase: 1.5 },
          { x: width * 0.18, y: height * 0.18, phase: 3.0 },
          { x: width * 0.82, y: height * 0.18, phase: 4.5 },
        ];

        const activeDroneNum = Math.min(droneCoords.length, droneCount);
        for (let i = 0; i < activeDroneNum; i++) {
          const c = droneCoords[i];
          const hoverY = c.y + Math.sin(time / 220 + c.phase) * 10;
          const hoverX = c.x + Math.cos(time / 260 + c.phase) * 6;
          drawShatterDroneUnit(ctx, hoverX, hoverY, time, i);
        }
      }

      // 2. COSMIC NANOBOT CLUSTER (Orbiting Plasma Pods)
      if (botCount > 0) {
        const botCoords = [
          { x: width * 0.88, y: height * 0.48, phase: 0 },
          { x: width * 0.82, y: height * 0.62, phase: 2.1 },
          { x: width * 0.90, y: height * 0.35, phase: 4.2 },
        ];

        const activeBotNum = Math.min(botCoords.length, botCount);
        for (let i = 0; i < activeBotNum; i++) {
          const c = botCoords[i];
          const hoverY = c.y + Math.cos(time / 240 + c.phase) * 11;
          const hoverX = c.x + Math.sin(time / 280 + c.phase) * 5;
          drawCosmicNanobotUnit(ctx, hoverX, hoverY, time, i);
        }
      }

      // 3. CHRONOS LASER TURRET (Heavy Pedestal Pylons)
      if (turretCount > 0) {
        // Render turret on right pedestal base
        drawLaserTurretUnit(ctx, wallX + wallW + 10, wallY + wallH - 12, time, true);
        if (turretCount > 1) {
          // Render turret on left pedestal base
          drawLaserTurretUnit(ctx, wallX - 10, wallY + wallH - 12, time, false);
        }
      }

      // 4. STEAM GOLEM HAMMER (Pneumatic Mechanical Arm)
      if (hammerCount > 0) {
        drawSteamGolemArmUnit(ctx, wallX - 35, wallY + wallH + 8, time);
      }
    };

    // Helper: High-tech 2D Quadrotor Shatter Drone Unit
    const drawShatterDroneUnit = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      time: number,
      index: number
    ) => {
      ctx.save();
      ctx.translate(x, y);

      const tilt = Math.sin(time * 0.003 + index) * 0.08;
      ctx.rotate(tilt);

      // Drop shadow on ambient background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 32, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Green anti-grav thruster plume
      const plumeHeight = 10 + Math.sin(time * 0.02 + index) * 4;
      const thrusterGrad = ctx.createLinearGradient(0, 8, 0, 8 + plumeHeight);
      thrusterGrad.addColorStop(0, '#4ade80');
      thrusterGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.35)');
      thrusterGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = thrusterGrad;
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.lineTo(5, 8);
      ctx.lineTo(0, 8 + plumeHeight);
      ctx.closePath();
      ctx.fill();

      // Carbon Fiber Quad Rotor Arms
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      const armOffsets = [
        [-22, -12], [22, -12],
        [-24, 10], [24, 10]
      ];

      armOffsets.forEach(([ax, ay]) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        // Motor Hub
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotor Propeller Blur Disc
        ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(ax, ay, 12, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Fast spinning propeller blade lines
        const bladeAngle = time * 0.04 + index + (ax > 0 ? 1 : 0);
        const bx = Math.cos(bladeAngle) * 11;
        const by = Math.sin(bladeAngle) * 3;
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax - bx, ay - by);
        ctx.lineTo(ax + bx, ay + by);
        ctx.stroke();
      });

      // Main Armor Chassis Body
      const hullGrad = ctx.createLinearGradient(-14, -10, 14, 10);
      hullGrad.addColorStop(0, '#1e293b');
      hullGrad.addColorStop(0.5, '#0f172a');
      hullGrad.addColorStop(1, '#334155');

      ctx.fillStyle = hullGrad;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(14, -7);
      ctx.lineTo(14, 7);
      ctx.lineTo(0, 12);
      ctx.lineTo(-14, 7);
      ctx.lineTo(-14, -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bevel highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(0, -10);
      ctx.lineTo(10, -5);
      ctx.stroke();

      // Glowing Cyber Eye / Visor
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(0, -2, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.sin(time * 0.002) * 2, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Underside Laser Barrel Nozzles
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1;
      ctx.fillRect(-5, 9, 3, 6);
      ctx.fillRect(2, 9, 3, 6);

      // Flashing Wing LEDs
      const ledActive = (Math.floor(time / 400) + index) % 2 === 0;
      ctx.fillStyle = ledActive ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.arc(-13, -6, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ledActive ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(13, -6, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Helper: Cosmic Nanobot Unit
    const drawCosmicNanobotUnit = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      time: number,
      index: number
    ) => {
      ctx.save();
      ctx.translate(x, y);

      const floatWobble = Math.sin(time * 0.004 + index * 2) * 0.08;
      ctx.rotate(floatWobble);

      // Blue plasma aura
      ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      // Rotating energy ring
      ctx.save();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3b82f6';
      const ringAngle = time * 0.003 + index;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 6, ringAngle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Angular Cyber Hull
      const botGrad = ctx.createLinearGradient(-10, -12, 10, 12);
      botGrad.addColorStop(0, '#1e1b4b');
      botGrad.addColorStop(0.5, '#0f172a');
      botGrad.addColorStop(1, '#3b82f6');

      ctx.fillStyle = botGrad;
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, -5);
      ctx.lineTo(8, 10);
      ctx.lineTo(0, 15);
      ctx.lineTo(-8, 10);
      ctx.lineTo(-12, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Plasma Lens Core
      ctx.save();
      ctx.fillStyle = '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Orbiting Micro Nanobots
      for (let k = 0; k < 3; k++) {
        const orbAngle = time * 0.005 + (k * Math.PI * 2) / 3 + index;
        const ox = Math.cos(orbAngle) * 22;
        const oy = Math.sin(orbAngle) * 10;

        ctx.fillStyle = '#93c5fd';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#60a5fa';
        ctx.beginPath();
        ctx.arc(ox, oy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // Helper: Chronos Laser Turret Unit
    const drawLaserTurretUnit = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      time: number,
      isRightSide: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);

      // Pedestal Base Mount
      const baseGrad = ctx.createLinearGradient(-14, 0, 14, 18);
      baseGrad.addColorStop(0, '#0f172a');
      baseGrad.addColorStop(0.5, '#334155');
      baseGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = baseGrad;
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-14, 0, 28, 16);
      ctx.strokeRect(-14, 0, 28, 16);

      // Rotating Laser Turret Head
      const aimAngle = isRightSide ? -Math.PI * 0.65 : -Math.PI * 0.35;
      ctx.save();
      ctx.translate(0, -2);
      ctx.rotate(aimAngle + Math.sin(time * 0.002) * 0.04);

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-7, -14, 14, 16);
      ctx.strokeRect(-7, -14, 14, 16);

      // Glowing Magenta Core
      ctx.fillStyle = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ec4899';
      ctx.beginPath();
      ctx.arc(0, -14, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -14, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    };

    // Helper: Steam Golem Arm Unit
    const drawSteamGolemArmUnit = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      time: number
    ) => {
      ctx.save();
      ctx.translate(x, y);

      // Brass Pedestal Mount
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-12, 0, 24, 14);
      ctx.strokeRect(-12, 0, 24, 14);

      // Steampunk Brass Gear
      ctx.save();
      ctx.translate(0, -2);
      ctx.rotate(time * 0.002);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Swinging Shaft & Hammer Head
      const swing = Math.sin(time * 0.004) * 0.25;
      ctx.rotate(-Math.PI * 0.2 + swing);

      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -24);
      ctx.stroke();

      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-8, -32, 16, 10);
      ctx.strokeRect(-8, -32, 16, 10);

      ctx.restore();
    };

    // Draw swinging tool
    const drawEquippedTool = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();

      const tx = toolSwingXRef.current || (width / 2);
      const ty = toolSwingYRef.current || (height / 2);

      if (!toolActiveRef.current) {
        ctx.restore();
        return;
      }

      ctx.translate(tx + 28, ty - 28);
      ctx.rotate(toolSwingAngleRef.current);

      const toolId = equippedTool.id;
      const toolColor = equippedTool.color;

      ctx.shadowBlur = 16;
      ctx.shadowColor = toolColor;

      if (toolId === 'pickaxe') {
        // Wood Handle
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 44);
        ctx.lineTo(-28, -8);
        ctx.stroke();

        // Steel Pickaxe Head
        ctx.strokeStyle = toolColor;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(-28, -8, 22, Math.PI * 0.75, Math.PI * 1.85);
        ctx.stroke();

        // Gold Ring Center
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-28, -8, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (toolId === 'drill') {
        // Pneumatic Drill Body
        ctx.fillStyle = '#334155';
        ctx.fillRect(-10, 12, 14, 20);

        // Blue Casing
        ctx.fillStyle = toolColor;
        ctx.beginPath();
        ctx.arc(-3, 4, 12, 0, Math.PI * 2);
        ctx.fill();

        // Spiral Cone Drill Bit
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(-12, 4);
        ctx.lineTo(-34, -8);
        ctx.lineTo(-4, -12);
        ctx.closePath();
        ctx.fill();

        // Electric Sparks
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-34, -8);
        ctx.lineTo(-42, -14);
        ctx.stroke();

      } else if (toolId === 'hammer') {
        // Tungsten Shaft
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(0, 36);
        ctx.lineTo(-18, -2);
        ctx.stroke();

        // Tungsten Steel Head Block
        ctx.fillStyle = toolColor;
        ctx.fillRect(-28, -12, 18, 22);

        // Blue Power Core
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-24, -8, 10, 14);

      } else if (toolId === 'sledgehammer') {
        // Dark Handle
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(6, 48);
        ctx.lineTo(-22, -14);
        ctx.stroke();

        // Heavy Gold-Banded Head Block
        ctx.fillStyle = toolColor;
        ctx.fillRect(-38, -26, 28, 28);

        // Iron End Plates
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-42, -26, 4, 28);
        ctx.fillRect(-10, -26, 4, 28);

      } else if (toolId === 'laser_drill') {
        // Laser Rifle Body
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(-12, 10, 16, 24);

        // Futuristic Red Housing
        ctx.fillStyle = toolColor;
        ctx.beginPath();
        ctx.arc(-4, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Optical Lens Emitter
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-16, -10, 6, 0, Math.PI * 2);
        ctx.fill();

        // Laser Energy Beam
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-16, -10);
        ctx.lineTo(-60, -38);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-16, -10);
        ctx.lineTo(-60, -38);
        ctx.stroke();

      } else if (toolId === 'plasma_cutter') {
        // Cyan Torch Handle
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(-10, 14, 12, 22);

        // Dual Plasma Nozzle
        ctx.fillStyle = toolColor;
        ctx.beginPath();
        ctx.arc(-4, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        // Plasma Arc Stream
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.moveTo(-14, -6);
        ctx.lineTo(-44, -28);
        ctx.lineTo(-22, -32);
        ctx.closePath();
        ctx.fill();

        // Outer Plasma Ring Glow
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-30, -20, 12, 0, Math.PI * 2);
        ctx.stroke();

      } else if (toolId === 'tnt_bomb') {
        // Dynamite Stick Cluster (3 Sticks)
        ctx.fillStyle = '#be123c';
        ctx.fillRect(-28, -14, 24, 8);
        ctx.fillRect(-28, -4, 24, 8);
        ctx.fillRect(-28, 6, 24, 8);

        // Yellow Straps
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-24, -14, 4, 28);
        ctx.fillRect(-12, -14, 4, 28);

        // Digital Timer Screen
        ctx.fillStyle = '#020617';
        ctx.fillRect(-22, -2, 12, 6);
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 5px monospace';
        ctx.fillText('00', -20, 3);

        // Lit Sparking Fuse
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-28, -10);
        ctx.quadraticCurveTo(-38, -18, -42, -12);
        ctx.stroke();

        // Fuse Spark
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f97316';
        ctx.beginPath();
        ctx.arc(-42, -12, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (toolId === 'quantum_breaker') {
        // Purple Battleaxe Shaft
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(8, 48);
        ctx.lineTo(-24, -16);
        ctx.stroke();

        // Quantum Crescent Blades
        ctx.fillStyle = toolColor;
        ctx.beginPath();
        ctx.arc(-24, -16, 20, Math.PI * 0.5, Math.PI * 1.8);
        ctx.fill();

        // Singularity Core
        ctx.fillStyle = '#f0abfc';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#d8b4fe';
        ctx.beginPath();
        ctx.arc(-24, -16, 7, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting Quantum Ring
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(-24, -16, 16, 6, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();

      } else {
        // Fallback Pickaxe
        ctx.strokeStyle = toolColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 32);
        ctx.lineTo(-20, -20);
        ctx.stroke();
      }

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentWorld, equippedTool, gameState, rows, cols, totalBlocks]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const minDimension = Math.min(canvas.width, canvas.height);
    const wallSize = Math.min(minDimension * 0.7, 700);
    const wallW = wallSize;
    const wallH = wallSize * 0.85;

    const hitW = wallW * 1.25;
    const hitH = wallH * 1.25;

    if (
      Math.abs(clickX - canvas.width / 2) < hitW / 2 &&
      Math.abs(clickY - canvas.height / 2) < hitH / 2
    ) {
      toolSwingXRef.current = clickX;
      toolSwingYRef.current = clickY;
      toolSwingAngleRef.current = -Math.PI / 3;
      toolSwingTargetRef.current = Math.PI / 4;
      toolActiveRef.current = true;

      onTapDamage(clickX, clickY);
    } else {
      floatingTextsRef.current.push({
        id: Math.random().toString(),
        text: 'Miss',
        x: clickX,
        y: clickY,
        vy: -2,
        color: '#94a3b8',
        size: 14,
        alpha: 1,
        life: 1.0,
        scale: 1.0,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-[#0a0f1a]"
      id="game-canvas-container"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        className="block cursor-crosshair w-full h-full outline-none"
        style={{ touchAction: 'none' }}
        id="idle-game-canvas"
      />
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';

const getRandomMaterialColor = (material: string): string => {
  const colorsMap: { [key: string]: string[] } = {
    wood: ['#854d0e', '#a16207', '#ca8a04', '#78350f'],
    stone: ['#4b5563', '#374151', '#1f2937', '#9ca3af'],
    metal: ['#cbd5e1', '#9ca3af', '#64748b', '#475569'],
    ice: ['#38bdf8', '#0ea5e9', '#7dd3fc', '#e0f2fe'],
    neon: ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981'],
    lava: ['#ef4444', '#f97316', '#b91c1c', '#f97316'],
    crystal: ['#d946ef', '#a21caf', '#c084fc', '#e879f9'],
    boss: ['#dc2626', '#7f1d1d', '#3f1111', '#1e1b4b'],
  };

  const colors = colorsMap[material] || ['#ef4444', '#f59e0b', '#3b82f6'];
  return colors[Math.floor(Math.random() * colors.length)];
};
