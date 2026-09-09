# ARACHNID — Web Slinger (Godot 4)

A playable third-person, spider-themed superhero action game:
**web-swing** (true pendulum physics) across a procedurally built 4×4 city,
**wall-crawl & cling**, **zip/strike** traversal, 3-hit **combat combos** with
spider-sense slow-mo, enemy AI (thugs, armed thugs, a brute, a fugitive),
3 missions + free roam, full HUD/minimap, and 100% synthesized audio.

**Every asset is generated in code** — the game runs with zero downloads.
See `docs/` for the step-by-step path to swap in your own Blender models,
PolyHaven textures/HDRIs, and Pixabay audio (all free/CC0).

## Requirements

- **Godot 4.2 or newer** (4.3/4.4 recommended) — [godotengine.org](https://godotengine.org)
- Standard build (no .NET needed)

## Run

1. Open Godot → **Import** → select this folder's `project.godot`.
2. Press **F5** (or ▶). The game generates the city + audio on first launch
   (~1–3 s), then shows the main menu.

> Headless smoke test (CI): `godot --headless --path . --quit-after 300`
> `ARACHNID_AUTOSTART=free godot --headless --path . --quit-after 600` skips
> the menu and plays free roam for a few seconds.

## Controls

| Input | Action |
|---|---|
| `W A S D` | Move (relative to camera) |
| `Shift` | Sprint |
| `Space` | Jump (also **wall-jump** while clinging) |
| Mouse | Camera orbit |
| `RMB` **hold** | Web-swing (raycast anchor; `W/S` or wheel = rope length; release to launch) |
| `F` | Zip to the point you aim at (fast traverse) |
| `Q` | Web-strike: fly at the targeted enemy + flying kick |
| `LMB` | Melee — 3-hit combo (punch, punch, roundhouse) |
| `E` | Backflip dodge (i-frames) |
| `Tab` | Lock-on nearest enemy |
| `Esc` | Pause |

Gamepad: left stick move, RT/A jump, X attack, LB web-swing, RB zip,
LS web-strike, RS dodge, right stick camera, Start pause.

## The loop

- **Free roam** — fight street-level enemies, swing the skyline, perch on
  the anchor tower.
- **Mission 1 — Stop the Robbery**: reach the bank plaza, clear two waves
  (8 enemies).
- **Mission 2 — Rooftop Chase**: swing to the marked rooftop, chase the
  fugitive across the skyline to the anchor tower, defeat his crew (incl. a
  brute) on the roof.
- **Mission 3 — Time Trial: Ring Run**: thread 5 swing rings in under 90 s
  (S/A/B/C rank).

Missions save progress (`user://arachnid_save.json`), including settings.

## Project layout

```
project.godot                 # input map, autoloads, renderer settings
scenes/main.tscn              # entry scene
scripts/
  main.gd                     # builds world/player/HUD/menus, menu orbit cam
  fx.gd                       # hit sparks & dust (autoload "Fx")
  autoload/
    game_manager.gd           # modes, missions, spawning, spider-sense, saves
    audio_manager.gd          # all SFX + music, synthesized at startup
    time_controller.gd        # hit-stop & slow-mo (unscaled timing)
  city/city_generator.gd      # procedural 4x4 city, props, sun/sky (day/night)
  player/player.gd            # controller: swing/wall/zip/combat/anim/camera
  enemy/enemy.gd              # AI state machine (4 types)
  enemy/projectile.gd         # armed-thug projectile
  ui/hud.gd                   # bars, combo, minimap, vignettes, marker
  ui/menus.gd                 # main/settings/pause/result screens
  utils/proctex.gd            # procedural PBR-ish textures & tiling meshes
docs/
  PHASE1_CHARACTER_BLENDER.md # full Blender workflow: model→UV→Rigify→14 anims
  ASSET_SOURCES.md            # PolyHaven / Pixabay swap-in guide
```

### Collision layers

| Bit | Layer |
|---|---|
| 1 | City (buildings, ground, props, walls) — web anchors + wall-crawl surfaces |
| 2 | Player |
| 4 | Enemies |

## Tuning

All feel knobs are constants at the top of `scripts/player/player.gd`
(gravity, jump, swing boost, rope range, zip time, dodge, fluid economy)
and `scripts/enemy/enemy.gd` (speeds, damage). City layout/heights live in
`scripts/city/city_generator.gd` (`PITCH`, `BLOCK`, `_pick_height`, seed).

## Roadmap (next phases)

- Replace procedural hero/city/enemies with your Blender + PolyHaven builds
  (drop-in points are documented in `docs/`).
- Save more state (per-mission best times), controller rebinding UI.
- More enemy types (stealth, aerial), side missions, night-mission variant
  (the day/night toggle already exists in Settings).
