# PHASE 1 — Character Creation in Blender (Arachnid)

Goal: an original spider-themed hero, **10,000–15,000 tris**, separate mask-lens
geometry, wrist web-shooters, PBR material with PolyHaven textures, Rigify
rig with IK + eye-lens controllers, and **14 animation clips** exported as GLB.

Everything below uses 100% free/open tools: Blender 4.x, PolyHaven, (optionally
Krita for the web pattern). The game in this repo already ships with a
procedural stand-in hero — when yours is ready, drop it in via the
**"Swapping your GLB into the game"** section at the end.

---

## 1.1 — Modeling (10–15k tris total)

1. **New scene** → delete default cube/light/camera → set Units to Metric,
   scale 1.0 → enable `Snap → Vertex / Face` and `Loop Cut (Ctrl+R)` habits.
2. **Blockout (box modeling, ~1–2 h):**
   - Start from a subdivided cube for the torso: 3 loops at chest/rib/ab/waist.
     Athletic build: shoulders ≈ 0.46 m, waist 0.30 m, hips 0.34 m, height 1.82 m.
   - Extrude ribbons for arms/legs (4–6 segments per limb), keep edge loops at
     shoulders, elbows, wrists, hips, knees, ankles (these become your deform loops).
   - Head: separate mesh (box-modeled), **eyes are separate small meshes**
     (2 boxes, slightly curved front) — they need to move/squint independently.
   - Web-shooters: 2 small cylinders + box on each wrist (parent to hand later,
     or keep as separate objects named `Shooter_L/R`).
   - Merge torso+limbs into one object `Arachnid_Body`. Keep `Eye_L`, `Eye_R`,
     `Shooter_L`, `Shooter_R` as separate objects (or separate loose parts).
3. **Proportion checkpoints** (measure with a metric ruler addon or by snapping):
   7-heads tall; elbows at waist; knees at mid-thigh; feet 0.26 m long.
4. **Shaping pass:** loop-cuts for chest plate and abdomen; taper forearms/calves.
   Model the mask as part of the head with a separate material region for the
   lenses (they'll be the emissive parts).
5. **Retopology / tri budget check:** select all,
   `Mesh → Show Vertex Count`, then `Stats` (N-panel) shows **Tris**.
   Target **10,000–15,000 tris** for body+head+eyes+shooters combined.
   - Capsules for limbs: 8–12 sides each is plenty at game distance.
   - If over budget: remove interior loops, merge close verts
     (`M → By Distance`), decimate *only as a last resort* (Decimate 0.85,
     then clean normals).
6. **Apply scale** (`Ctrl+A → Scale`) on all meshes before rigging.
7. **Naming (matters for export):** `Arachnid_Body`, `Arachnid_Eye_L`,
   `Arachnid_Eye_R`, `Arachnid_Shooter_L`, `Arachnid_Shooter_R`.
8. Save: `arachnid_v1.blend`.

> Web pattern: do it in the texture (1.2), NOT geometry — geometry webs add
> thousands of tris and zero game value.

## 1.2 — UV Unwrapping + PolyHaven PBR texturing

1. **Smart UV (fast path):** select all meshes → Edit Mode → `U → Smart UV
   Project` (island margin 0.02). For a suit, Smart UV is acceptable; for a
   seam-free suit look, do manual seam marking:
   - Mark seams: spine center-line, inner arms, inner legs, under mask.
   - `U → Unwrap` (angle limit 66°) → pack islands.
2. **Bake-friendly setup:** give the body one material `M_Arachnid_Suit`;
   eyes `M_Arachnid_Eye`; shooters `M_Arachnid_Metal`.
3. **PolyHaven download** (CC0, all include BaseColor/Normal/Roughness/Metallic):
   - Suit base: **"Neoprene"** or **"Stretch Fabric"** / **"Sports Fabric"** —
     synthetic spandex look. (polyhaven.com → Textures → search *fabric*.)
   - Accent/boots/shooters: **"Black Leather"** or **"Racing Leather"**.
   - Metal for shooters: **"Steel Plate"** or **"Rough Metal"**.
4. **Build the PBR node setup** (Shader Editor):
   ```
   Image(BaseColor, sRGB) ────────────────┐
   Image(Normal, Non-Color) → NormalMap ──┤→ Principled BSDF → Output
   Image(Roughness, Non-Color) ───────────┤
   Image(Metallic, Non-Color) ────────────┘
   ```
   - Set **Normal / Roughness / Metallic** image color-space to **Non-Color**.
   - Repeat wrapping: enable **Repeat** on each image node (or use Mapping node
     with scale) so the fabric tiles per UV island — 2–4 repeats looks right.
5. **Web pattern overlay (the hero look):**
   - In Krita (or Blender texture paint): on the BaseColor copy, draw a black
     web lattice (radial spokes + concentric rings) at 2048² with 0–35% alpha.
   - Back in Blender: `BaseColor → MixRGB (Multiply, fac 0.85) with the web
     texture → BSDF`. Optionally drive a faint **Roughness** variation from the
     same web mask (rougher between webs).
   - Color scheme (original, not a copy): primary deep teal `#12304f`,
     accent crimson `#b81f28`, lenses white.
6. **Emissive lenses:** on `M_Arachnid_Eye`:
   - `Emission` shader (or Principled with Emission color white,
     Emission Strength **3.0**) → the eyes glow and will pick up the game's
     bloom automatically.
7. **Material for shooters:** metalness 0.9, roughness 0.35, small emissive
   tip (optional).
8. Sanity check: switch viewport to **Rendered** (EEVEE) with a studio HDRI,
   orbit the model — check texel density (no obvious stretching), the web
   pattern, and the glow.

## 1.3 — Rigging (Rigify)

1. **Add armature:** `Shift+A → Armature` → enter Edit Mode. Build the **meta
   bones** for a `basic_human` (or duplicate the stock one):
   - `spine`, `spine.001`, `spine.002`, `neck`, `head`
   - per side: `shoulder_L/R`, `upper_arm_L/R`, `forearm_L/R`, `hand_L/R`
   - per side: `thigh_L/R`, `shin_L/R`, `foot_L/R`, `toe_L/R`
   - **Extras (your custom bits):**
     - `eye_L`, `eye_R` — small bones at each lens (for squint/look).
     - `shooter_L`, `shooter_R` — at the wrists (so the web line can attach).
   - Parent meshes: select mesh → armature bone → `Ctrl+P → With Automatic
     Weights` (body/limbs). Eyes & shooters: parent to the `head` / `hand`
     bone with **Bone** parenting (rigid, no weights needed).
2. **Generate Rigify:** select armature → `Object → Rigify → Generate Rig`
   (in 4.x: `Rigify` add-on panel → Generate). This creates the control rig:
   - IK legs (`IK_Thigh_L/R`), IK arms (`IK_Forearm_L/R`)
   - spine/chest/neck controls, foot/heel controls
   - Toggle **IK/FK** per limb in the rig properties (default arms FK, legs IK).
3. **Weight-paint troubleshooting** (clean deform at shoulders/elbows/knees):
   - Shoulder: select upper-arm + torso verts at the deltoid → smooth paint
     (50–70% arm, rest torso). Use `Weight → Normalize All` after edits.
   - Elbow/knee: verify the joint has **two** bones influencing (upper +
     lower) with a 50/50 gradient — no hard edge. Paint the falloff over ~4
     loops around the joint.
   - Common fix: `Object Data Properties → Vertex Groups → Smooth` (radius 4)
     on the limb group, then Normalize.
   - Test: pose the armature in Pose Mode (raise arms, bend knees, twist spine)
     and watch for tearing; repaint offenders.
4. **Eye-lens squint controllers:** select the `eye_L/R` bones (or their
   generated DEF bones) → in the rig, expose them: simplest working approach
   for game export is to keep the **DEF_ (deform)** bones — the game will
   scale/rotate them. Note the exact DEF bone names (e.g. `DEF-eye_L.001`) —
   you'll use them in-game for the spider-sense squint.
5. **Save** `arachnid_rigged.blend`.

> Why this design: the game in this repo procedurally animates a node
> hierarchy. When you export, the GLB carries the DEF bones; the game maps
> them to its animation state machine (see swap-in section).

## 1.4 — Animation (14 clips, 30 fps)

Set the timeline to 30 fps. For each clip: create an **Action**
(NLA → `+` or the Action editor), name it, and **keep clips isolated**
(apply as NLA strip only for preview; export each Action separately).

| # | Action name | Frames | Notes |
|---|-------------|--------|-------|
| 1 | `Idle` | 0–59 (loop) | breathing: chest +2% y, subtle arm sway, weight shift. First/last key identical. |
| 2 | `Run` | 0–23 (loop) | 24-frame sprint cycle; contact/passing/up/contact at 0/6/12/18. Loop: frame 24 == frame 0. |
| 3 | `Jump_Up` | 0–19 | anticipation crouch (0–8), leap with legs tucked (8–15), stretch (15–19). Not looped. |
| 4 | `Fall_Loop` | 0–29 (loop) | arms out, slight flutter; loop-safe. |
| 5 | `Landing` | 0–14 | superhero landing: knees deep, one knee down at frame 12, hold. |
| 6 | `Perch_Ledge` | 0–59 (loop) | gargoyle crouch, weight on one hand, tiny breathing. |
| 7 | `WebSwing_Loop` | 0–39 (loop) | one-arm hang, body swings 35°→-35°→35°; arm_r fixed up, body pendulums on `spine` + hips. Loop-safe. |
| 8 | `WebShoot` | 0–14 | arm_r snaps from rest to full extension with wrist flick (IK arm off, FK on for this clip). |
| 9 | `WallClimb_Loop` | 0–29 (loop) | 4-point climb cycle, 30 f; body flat, alternate limbs. |
| 10 | `WallIdle` | 0–59 (loop) | clinging, head look-around (neck ±20°), breathing. |
| 11 | `Punch_Combo` | 0–44 | 3 hits: jab (0–12), cross (12–28), spinning hook/kick (28–44). One action, 3 beats. |
| 12 | `Kick_Roundhouse` | 0–19 | windup twist (0–6), hip-rotating kick (6–14), recover (14–19). |
| 13 | `Dodge_Backflip` | 0–24 | 360° back rotation with tuck at frame 12. |
| 14 | `Zip_Launch` | 0–19 | horizontal body, both arms forward, legs trailing; motion streak pose. |

Tips:
- Animate in **Pose Mode**, key `LocRot` only for DEF/CTRL bones you used.
- Use `N-panel → Relations → Influence` to fade bones (e.g. IK 0 during
  `WebShoot` so the FK arm reads cleanly).
- For loops: set `Action → Property → Interpolation = Linear` per track and
  verify `frame 0 == frame N` with `N-panel → Animation → Compare` or by
  playing in a loop.

## 1.5 — Export (glTF 2.0 / GLB)

For **each** of the 14 Actions (and once for the model+rig itself):

1. Select armature + all meshes.
2. `File → Export → glTF 2.0 (.gltf/.glb)`:
   - Format: **glTF Binary (.glb)**
   - Export Active Object: **off**
   - Animations: **Only Active** — set the desired Action as active first
     (NLA → make active), or use **Active Scene** and export all at once.
   - Export Deformation: **on**; Bone Orientation: **Quaternions**.
   - Apply modifiers: **on**.
   - Scale: leave **1.0** (Blender 4 exports Y-up correctly for glTF).
3. Save as `Arachnid.glb` (all animations in one file is simplest) into
   `assets/models/character/` in this repo.

## Swapping your GLB into the game

The game builds its hero procedurally in `scripts/player/player.gd`
(`_build_model()`). To use your model:

1. Put `Arachnid.glb` in `assets/models/character/` (create the folder).
2. In `player.gd`, replace `_build_model()` with:
   ```gdscript
   func _build_model() -> void:
       var gl := GLTFResourceLoader.load("res://assets/models/character/Arachnid.glb")
       model = gl.glTF as Node3D   # gltf scene
       add_child(model)
       # map bones: find your DEF bones by name
       var sk := model.get_node("Armature") if model.has_node("Armature") else model
       for bone in bones:
           var n = sk.find_child(_BONE_MAP[bone], true, false)
           if n: bones[bone] = n
       hand_l_node = sk.find_child("DEF-shooter_L", true, false)
       hand_r_node = sk.find_child("DEF-shooter_R", true, false)
       # eyes (squint):
       var el = sk.find_child("DEF-eye_L", true, false)
       var er = sk.find_child("DEF-eye_R", true, false)
       if el: eye_l = el.get_parent()  # scale the visual node
       ...
   ```
   with a map like `_BONE_MAP = {"chest":"DEF-spine.002", "head":"DEF-head",
   "arm_l":"DEF-upper_arm_L.001", "fore_l":"DEF-forearm_L.001", ...}`.
3. To play your clips instead of procedural poses: load an
   `AnimationPlayer`/`AnimationMixer` on the model, and in `_update_pose()`
   call `mixer.play("Idle")` etc. per state (the state machine already tracks
   `current_pose`).
4. Keep the capsule collision + web-shooter hand nodes as-is — they're what
   the web line and physics use.

You do **not** need to redo the city/audio/systems — they're engine-side.
