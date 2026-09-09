# Asset Sources — PolyHaven & Pixabay (swap guide)

The game in this repo runs with **zero external assets**: the city, hero, and
all audio are generated procedurally at startup. This document is the
replacement path for real CC0 assets when you want them.

## PolyHaven (CC0) — textures & HDRIs

Everything on polyhaven.com is CC0 (no attribution required). Download the
`4K` or `2K` set (BaseColor, Normal, Roughness, Metallic, AO, Height).

### Where each texture plugs in

| What in-game | PolyHaven search | Used in code |
|---|---|---|
| Building facades | `brick wall`, `concrete wall`, `stucco` | `CityGen._build()` → `Proctex.make_facade()` — replace the 6 generated facades with 6 ImageTextures from your files |
| Sidewalks / ground | `concrete pavement`, `cobblestone` | `Proctex.make_asphalt()` |
| Roads | `asphalt`, `road markings` | same material as ground, or a second plane per street |
| Fire escapes / railings / AC | `corrugated metal`, `rust metal`, `steel plate` | `Proctex.make_metal()` |
| Rooftops | `gravel`, `roof shingles` | `Proctex.make_roof()` |
| Windows/glass (if modeling real windows) | `architectural glass` | extra material on a window mesh |

**How to swap (5 minutes per texture):**
1. Drop images in `assets/textures/<name>/` (keep the file names:
   `<name>_BaseColor.png`, `<name>_Normal.png`, `<name>_Roughness.png`,
   `<name>_Metallic.png`).
2. In `CityGen._tex_mat()`, replace the procedural call:
   ```gdscript
   func _tex_mat_from_files(base: String) -> StandardMaterial3D:
       var m := StandardMaterial3D.new()
       var bc := load("res://assets/textures/" + base + "/" + base + "_BaseColor.png")
       var nm := load("res://assets/textures/" + base + "/" + base + "_Normal.png")
       var rg := load("res://assets/textures/" + base + "/" + base + "_Roughness.png")
       var mt := load("res://assets/textures/" + base + "/" + base + "_Metallic.png")
       for t in [bc, nm, rg, mt]:
           t.repeat_enabled = true
       m.albedo_texture = bc
       m.normal_enabled = true
       m.normal_texture = nm
       m.roughness_texture = rg
       m.metallic_texture = mt
       return m
   ```
3. Texel density: the generator already tiles UVs at real-world scale
   (facade tile = 16 m × 13.6 m). If your texture covers e.g. 8 m, change
   `FACADE_TILE_W/H` accordingly — no visible repeat over skyscrapers.

### HDRIs (day + night)

- Day: `kloppenheim_06` or `qwantani` (open urban sky), 2K is enough for
  lighting; use 8K only if you want visible sky detail.
- Night: `moonless_golf` (dark) or a city night like `boston_street` —
  check the *indoor/outdoor* tag.

**How to swap** (replaces `ProceduralSkyMaterial` in
`CityGen._setup_lighting()` / `_apply_sky()`):
1. Save the `.exr` into `assets/hdris/`.
2. In `_apply_sky()`:
   ```gdscript
   var tex := load("res://assets/hdris/kloppenheim_06_2k.exr")
   env.background_mode = Environment.BG_SKY
   env.sky.material = _sky_mat  # keep: set sky_mat to SkyTexture instead:
   var sky_tex := SkyTexture.new()
   sky_tex.texture = tex
   env.sky.material = sky_tex
   env.background_energy = 1.0
   ```
   (Assign a `SkyTexture` as the sky material — Godot uses it for both sky and
   IBL, giving you PBR reflections on the suit's metallic parts and the
   glass. Add a `VoxelGI` node or `ReflectionProbe` on rooftops for local
   reflections.)

## Pixabay — SFX & music

Search these exact queries on pixabay.com/sound-effects and /music (all
free, no attribution needed — still, keep the download links in
`assets/audio/credits.md` out of habit):

### SFX

| Game event | Pixabay search terms | In code |
|---|---|---|
| Web shoot | `whoosh`, `rope throw`, `whip` | `sfx["web_shoot"]` |
| Web stick/impact | `splat`, `sticky`, `thud` | `sfx["web_hit"]` |
| Swing wind loop | `wind swoosh`, `rushing wind` (loopable) | `sfx["wind"]` |
| Landing | `thud`, `heavy landing` | `sfx["landing"]` |
| Wall-crawl scuffs | `scraping`, `climbing`, `scratching` | `sfx["scuff"]` |
| Light hit / heavy hit | `punch`, `hit impact`, `fight strike` | `sfx["hit_light" / "hit_heavy"]` |
| Enemy grunts | `grunt`, `pain`, `oof` | `sfx["grunt"]` |
| Sirens | `police siren`, `siren` | `sfx["siren"]` |
| City ambience loop | `city traffic`, `urban ambience`, `city night` | `sfx["ambience"] |
| Zip whoosh | `whoosh fast`, `dodge sound` | `sfx["zip"] / "dodge"` |
| Spider-sense ping | `heartbeat`, `warning beep` | `sfx["sense"]` |
| Gunshot (armed thug) | `small pistol shot` | `sfx["shot"]` |

### Music

| Mood | Pixabay search | In code |
|---|---|---|
| Exploration (hero, urban) | `urban chill`, `cinematic ambient`, `city beat` | `music["explore" / "menu"]` |
| Combat | `action music`, `intense battle`, `fight music` (≥120 BPM) | `music["combat"]` |
| Stealth/tension | `suspense`, `tension loop`, `dark ambient` | `music["stealth"]` |
| Victory sting | `victory fanfare`, `success jingle` | `sfx["victory"]` |
| Defeat sting | `defeat`, `sad cinematic` | `sfx["defeat"]` |

**How to swap:** put files in `assets/audio/sfx/<name>.ogg` and
`assets/audio/music/<name>.ogg`, then in `audio_manager.gd` replace the
synthesized streams with `load("res://audio/...")`:
```gdscript
sfx["web_shoot"] = load("res://assets/audio/sfx/web_shoot.ogg")
music["combat"] = load("res://assets/audio/music/combat.ogg")
```
(Keep the generator as fallback — if the file is missing, `load` fails, so
guard with `ResourceLoader.exists` and fall back to the synthesized version.)

## Blender — city kit & enemies (Phase 2–3)

When you model your own buildings/thugs (see the guide in the parent repo
docs), export modular kits as GLB with one material per surface:
- Buildings: base/mid/top segments + corner pieces; box collision only
  (the game uses box colliders, so no need for 1:1 mesh colliders).
- Enemies: thug / armed / brute GLBs; the game's `enemy.gd` `_build_model()`
  is the drop-in point (same pattern as the player swap).
