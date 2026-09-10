class_name Proctex
## Procedural texture & mesh helpers.
## These generate stand-in PBR-style albedo textures at startup so the game runs
## with 100% free, zero-download assets. Swap them with PolyHaven textures later
## (see docs/ASSET_SOURCES.md) — the material slots (albedo/normal/rough) are ready.

static func _noise_tile(rng: RandomNumberGenerator, w: int, h: int, base: Color, jitter: float) -> Image:
	var img := Image.new()
	img.create(w, h, false, Image.FORMAT_RGB8)
	for y in h:
		for x in w:
			var c := base
			var j := rng.randf_range(-jitter, jitter)
			c = c.lightened(j)
			img.set_pixel(x, y, c)
	return img


## Building facade: wall mottle + floor slabs + window grid (dark glass / warm lit).
## Designed to repeat: 4 window bays wide x 4 floors tall per texture tile.
static func make_facade(rng: RandomNumberGenerator, wall: Color, w: int = 256, h: int = 512) -> ImageTexture:
	var img := Image.new()
	img.create(w, h, false, Image.FORMAT_RGB8)
	img.fill(wall)
	# fine mottle
	var mottle := _noise_tile(rng, 128, 128, wall, 0.045)
	mottle.resize(w, h, Image.INTERPOLATE_NEAREST)
	img.blit_rect(mottle, Rect2i(0, 0, mottle.get_width(), mottle.get_height()), Vector2i.ZERO)
	var bays := 4
	var floors := 4
	var bw := w / bays
	var fh := h / floors
	for fy in floors:
		for bx in bays:
			var x0 := bx * bw
			var y0 := fy * fh
			# floor slab band at bottom of each floor
			img.fill_rect(Rect2i(x0, y0 + fh - 14, bw, 14), wall.darkened(0.28))
			# pilaster edge
			img.fill_rect(Rect2i(x0, y0, 4, fh), wall.darkened(0.18))
			# window
			var ww := bw - 26
			var wh := fh - 44
			var wx := x0 + 13
			var wy := y0 + 20
			var roll := rng.randf()
			var win: Color
			if roll < 0.28:
				win = Color(1.0, 0.82, 0.52).darkened(rng.randf_range(0.0, 0.25))  # lit warm
			elif roll < 0.45:
				win = Color(0.55, 0.75, 0.85).darkened(0.35)                        # sky reflection
			else:
				win = Color(0.10, 0.13, 0.17).darkened(rng.randf_range(0.0, 0.35))  # dark glass
			img.fill_rect(Rect2i(wx, wy, ww, wh), win)
			# mullions
			img.fill_rect(Rect2i(wx + ww / 2 - 1, wy, 2, wh), wall.darkened(0.3))
			img.fill_rect(Rect2i(wx, wy + wh / 2 - 1, ww, 2), wall.darkened(0.3))
			# window frame
			img.fill_rect(Rect2i(wx - 2, wy - 2, ww + 4, 2), wall.darkened(0.4))
			img.fill_rect(Rect2i(wx - 2, wy + wh, ww + 4, 2), wall.darkened(0.4))
	return ImageTexture.create_from_image(img)


## Dark asphalt with patches and cracks.
static func make_asphalt(rng: RandomNumberGenerator, w: int = 256, h: int = 256) -> ImageTexture:
	var base := Color(0.16, 0.165, 0.18)
	var img := _noise_tile(rng, w, h, base, 0.02)
	# dark oil-ish patches
	for p in 14:
		var x := rng.randi_range(0, w - 24)
		var y := rng.randi_range(0, h - 24)
		img.fill_rect(Rect2i(x, y, rng.randi_range(8, 26), rng.randi_range(8, 26)), base.darkened(0.12))
	# cracks: short axis-aligned dark segments
	for c in 40:
		var x := rng.randi_range(0, w - 1)
		var y := rng.randi_range(0, h - 1)
		if rng.randf() < 0.5:
			img.fill_rect(Rect2i(x, y, rng.randi_range(4, 22), 1), Color(0.07, 0.07, 0.08))
		else:
			img.fill_rect(Rect2i(x, y, 1, rng.randi_range(4, 22)), Color(0.07, 0.07, 0.08))
	# faint manhole covers
	for m in 3:
		var x := rng.randi_range(16, w - 32)
		var y := rng.randi_range(16, h - 32)
		img.fill_rect(Rect2i(x, y, 14, 14), Color(0.10, 0.10, 0.11))
	return ImageTexture.create_from_image(img)


## Gravel roof.
static func make_roof(rng: RandomNumberGenerator, w: int = 256, h: int = 256) -> ImageTexture:
	var base := Color(0.22, 0.21, 0.20)
	var img := _noise_tile(rng, w, h, base, 0.05)
	for d in 2500:
		var x := rng.randi_range(0, w - 1)
		var y := rng.randi_range(0, h - 1)
		img.set_pixel(x, y, base.lightened(rng.randf_range(-0.09, 0.09)))
	return ImageTexture.create_from_image(img)


## Weathered / rusty corrugated metal.
static func make_metal(rng: RandomNumberGenerator, w: int = 128, h: int = 128) -> ImageTexture:
	var base := Color(0.32, 0.33, 0.35)
	var img := _noise_tile(rng, w, h, base, 0.05)
	# vertical corrugation
	for x in range(0, w, 8):
		img.fill_rect(Rect2i(x, 0, 3, h), base.lightened(0.07))
		img.fill_rect(Rect2i(x + 5, 0, 2, h), base.darkened(0.12))
	# rust streaks
	for s in 22:
		var x := rng.randi_range(0, w - 4)
		var y := rng.randi_range(0, h - 20)
		img.fill_rect(Rect2i(x, y, rng.randi_range(2, 5), rng.randi_range(8, 40)), Color(0.28, 0.14, 0.07).lightened(rng.randf_range(0, 0.1)))
	return ImageTexture.create_from_image(img)


## Billboard-free glowing diamond used for objective markers.
static func make_diamond(size: int = 128) -> ImageTexture:
	var img := Image.new()
	img.create(size, size, false, Image.FORMAT_RGBA8)
	var c := size / 2
	var col := Color(1.0, 0.85, 0.2)
	var edge := Color(1.0, 1.0, 0.6)
	for y in size:
		for x in size:
			var d := absi(x - c) + absi(y - c)
			if d < 30:
				var e := d >= 25
				img.set_pixel(x, y, edge if e else col)
			elif d < 40:
				img.set_pixel(x, y, Color(1.0, 0.85, 0.2, 0.0))
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))
	return ImageTexture.create_from_image(img)


## Spidersuit fabric: base color + fine weave noise + a black web lattice
## (12 radial spokes + concentric sagging rings) that tiles like suit panels.
static func make_suit(base: Color, web: Color, w: int = 256, h: int = 256) -> ImageTexture:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var img := _noise_tile(rng, 128, 128, base, 0.03)
	img.resize(w, h, Image.INTERPOLATE_NEAREST)
	var c := Vector2(w / 2.0, h / 2.0)
	var maxr := w * 0.48
	# radial spokes
	for s in 12:
		var a := TAU * float(s) / 12.0
		var dirv := Vector2(cos(a), sin(a))
		for t in range(0, int(maxr), 2):
			_pencil(img, c + dirv * float(t), web, 1)
	# concentric rings, sagging between spokes
	for r in [0.16, 0.30, 0.42, 0.56, 0.72, 0.90]:
		var rad := maxr * r
		for i in 220:
			var a := TAU * float(i) / 220.0
			var sag := 1.0 + 0.05 * sin(a * 6.0)
			_pencil(img, c + Vector2(cos(a), sin(a)) * (rad * sag), web, 1)
	# hub dot
	_pencil(img, c, web, 3)
	return ImageTexture.create_from_image(img)


static func _pencil(img: Image, p: Vector2, col: Color, r: int) -> void:
	var x0 := int(p.x) - r
	var y0 := int(p.y) - r
	var w := img.get_width()
	var h := img.get_height()
	for y in range(y0, y0 + r * 2 + 1):
		if y < 0 or y >= h:
			continue
		for x in range(x0, x0 + r * 2 + 1):
			if x < 0 or x >= w:
				continue
			img.set_pixel(x, y, col)


## Rescales the UV channel of a primitive mesh's first surface and returns the baked mesh.
## (PrimitiveMesh surfaces are generated on demand, so the UVs are read with
## `get_mesh_arrays()` and baked into an ArrayMesh.)
static func _retex_primitive(src: PrimitiveMesh, uv_scale: Vector2, vertex_offset: Vector3) -> Mesh:
	var arr: Array = src.get_mesh_arrays()
	var uvs: PackedVector2Array = arr[Mesh.ARRAY_TEX_UV]
	if uv_scale != Vector2.ONE:
		for i in uvs.size():
			var u := uvs[i] * uv_scale
			uvs[i] = u
		arr[Mesh.ARRAY_TEX_UV] = uvs
	if vertex_offset != Vector3.ZERO:
		var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		for i in verts.size():
			var v := verts[i] + vertex_offset
			verts[i] = v
		arr[Mesh.ARRAY_VERTEX] = verts
	var out := ArrayMesh.new()
	out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return out


## Box mesh with per-face UVs scaled so facade/asphalt textures tile at real-world size.
## uv_scale = (world_width / tile_width, world_height / tile_height)
static func scaled_box(w: float, h: float, d: float, uv_scale: Vector2) -> Mesh:
	var m := BoxMesh.new()
	m.size = Vector3(w, h, d)
	return _retex_primitive(m, uv_scale, Vector3.ZERO)


## Plane mesh with tiling UVs.
static func scaled_plane(w: float, d: float, uv_scale: float) -> Mesh:
	var m := PlaneMesh.new()
	m.size = Vector2(w, d)
	return _retex_primitive(m, Vector2(uv_scale, uv_scale), Vector3.ZERO)


## Cylinder mesh whose origin is at its base (for web lines: node +Y points along the line).
static func unit_cyl_from_base(radius: float, segments: int = 6) -> Mesh:
	var m := CylinderMesh.new()
	m.top_radius = radius
	m.bottom_radius = radius
	m.height = 1.0
	m.radial_segments = segments
	return _retex_primitive(m, Vector2.ONE, Vector3(0, 0.5, 0))
