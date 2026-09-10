class_name CityGen
## Procedural city generator: a 4x4 block urban grid with alleys, a central
## skyscraper anchor, street props, sun + sky. 100% code-generated so the game
## runs with zero external assets. Replace meshes with your Blender builds later
## (see docs/ASSET_SOURCES.md).

const PITCH := 56.0
const BLOCK := 42.0
const STREET := 14.0
const FLOOR_H := 3.4
const FACADE_TILE_W := 16.0
const FACADE_TILE_H := 13.6

var _env: Environment
var _sun: DirectionalLight3D
var _sky_mat: ProceduralSkyMaterial


static func build(world: Node3D, seed := 1337) -> Dictionary:
	var gen := CityGen.new()
	return gen._build(world, seed)


static func set_time_of_day(world: Node3D, night: bool) -> void:
	var gen := CityGen.new()
	gen._apply_sky(world, night)


func _build(world: Node3D, seed: int) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed

	# ---- materials
	var wall_colors := [
		Color(0.55, 0.56, 0.58),   # concrete
		Color(0.48, 0.30, 0.24),   # brick
		Color(0.62, 0.55, 0.42),   # tan
		Color(0.36, 0.38, 0.42),   # slate
		Color(0.68, 0.62, 0.52),   # cream
		Color(0.30, 0.35, 0.40),   # blue-grey
	]
	var facade_mats: Array = []
	for c in wall_colors:
		facade_mats.append(_tex_mat(Proctex.make_facade(rng, c)))
	var roof_mat := _tex_mat(Proctex.make_roof(rng))
	var metal_mat := _tex_mat(Proctex.make_metal(rng))
	var asphalt_mat := _tex_mat(Proctex.make_asphalt(rng))
	asphalt_mat.roughness = 0.95
	var concrete_mat := _tex_mat(Proctex.make_facade(rng, Color(0.42, 0.43, 0.45)))
	var car_mats: Array = []
	for c in [Color(0.7, 0.1, 0.1), Color(0.1, 0.2, 0.5), Color(0.8, 0.8, 0.82), Color(0.15, 0.15, 0.16), Color(0.75, 0.55, 0.1)]:
		var m := StandardMaterial3D.new()
		m.albedo_color = c
		m.metallic = 0.6
		m.roughness = 0.35
		car_mats.append(m)
	var dark_mat := StandardMaterial3D.new()
	dark_mat.albedo_color = Color(0.12, 0.13, 0.15)
	dark_mat.roughness = 0.8
	var lamp_mat := StandardMaterial3D.new()
	lamp_mat.albedo_color = Color(1.0, 0.85, 0.55)
	lamp_mat.emission_enabled = true
	lamp_mat.emission = Color(1.0, 0.85, 0.55)
	lamp_mat.emission_energy_multiplier = 3.0
	var beacon_mat := StandardMaterial3D.new()
	beacon_mat.albedo_color = Color(0.9, 0.1, 0.1)
	beacon_mat.emission_enabled = true
	beacon_mat.emission = Color(1.0, 0.15, 0.1)
	beacon_mat.emission_energy_multiplier = 4.0

	# ---- ground
	var ground := MeshInstance3D.new()
	ground.mesh = Proctex.scaled_plane(260.0, 260.0, 260.0 / 8.0)
	ground.material_override = asphalt_mat
	world.add_child(ground)
	var ground_body := StaticBody3D.new()
	ground_body.collision_layer = 1
	var gcs := CollisionShape3D.new()
	var gshape := BoxShape3D.new()
	gshape.size = Vector3(260.0, 1.0, 260.0)
	gcs.shape = gshape
	gcs.position = Vector3(0, -0.5, 0)
	ground_body.add_child(gcs)
	world.add_child(ground_body)

	# ---- building specs
	var specs: Array = []
	var outer_blocks: Array = []
	for i in 4:
		for j in 4:
			if (i == 1 or i == 2) and (j == 1 or j == 2):
				continue  # central plaza
			var c := Vector2((i - 1.5) * PITCH, (j - 1.5) * PITCH)
			outer_blocks.append(c)
			if rng.randf() < 0.25:
				specs.append({"pos": c, "w": 40.0, "d": 40.0, "h": _pick_height(rng, 0.7)})
			else:
				var ha := _pick_height(rng, 0.0)
				var hb := _pick_height(rng, 0.0)
				specs.append({"pos": c + Vector2(-11.5, 0), "w": 19.0, "d": 40.0, "h": ha})
				specs.append({"pos": c + Vector2(11.5, 0), "w": 19.0, "d": 40.0, "h": hb})
	# guarantee skyline variety: 3 tall towers + SE mid-tower + NW tower
	var shuffled := outer_blocks.duplicate()
	_shuffle(rng, shuffled)
	for b in shuffled.slice(0, 3):
		var best := -1
		for k in specs.size():
			if specs[k]["pos"].distance_to(b) < 20.0:
				best = k
				break
		if best >= 0:
			specs[best]["h"] = rng.randf_range(66.0, 88.0)
	var se: Vector2 = specs[0]["pos"]
	for s in specs:
		if s["pos"].x + s["pos"].y > se.x + se.y:
			se = s["pos"]
	var nw: Vector2 = specs[0]["pos"]
	for s in specs:
		if -s["pos"].x - s["pos"].y > -nw.x - nw.y:
			nw = s["pos"]
	for s in specs:
		if s["pos"] == se and s["h"] < 45.0:
			s["h"] = rng.randf_range(50.0, 62.0)
		if s["pos"] == nw and s["h"] < 60.0:
			s["h"] = rng.randf_range(60.0, 75.0)

	# ---- build buildings
	var buildings: Array = []
	var aabbs: Array = []
	for s in specs:
		var rec := _add_building(world, s["pos"], s["w"], s["d"], s["h"], facade_mats[rng.randi_range(0, facade_mats.size() - 1)], roof_mat, metal_mat, dark_mat, rng)
		buildings.append(rec)
		aabbs.append(rec["aabb"])

	# ---- anchor skyscraper (central plaza)
	var anchor := _add_building(world, Vector2.ZERO, 26.0, 26.0, 118.0, facade_mats[3], roof_mat, metal_mat, dark_mat, rng, true)
	buildings.append(anchor)
	aabbs.append(anchor["aabb"])
	# beacon
	var beacon := MeshInstance3D.new()
	var bmesh := CylinderMesh.new()
	bmesh.top_radius = 0.5
	bmesh.bottom_radius = 0.9
	bmesh.height = 3.0
	beacon.mesh = bmesh
	beacon.material_override = beacon_mat
	beacon.position = Vector3(0, 118.0 + 2.0, 0)
	world.add_child(beacon)

	# ---- street props
	_add_lamps(world, metal_mat, lamp_mat, rng)
	_add_cars(world, car_mats, dark_mat, rng)
	_add_dumpsters(world, metal_mat, dark_mat, rng)
	_add_benches(world, dark_mat, rng)
	_add_edge_walls(world, concrete_mat)

	# ---- lighting & sky
	_setup_lighting(world)
	_apply_sky(world, false)

	# ---- named points for missions
	var info := {
		"spawn": Vector3(0, 0.5, 40),
		"plaza_center": Vector3(0, 0.0, 0),
		"plaza_start": Vector3(0, 0.5, 44),
		"bank": Vector3(0, 0.0, 14),
		"chase_start": Vector3(0, 0.5, -44),
		"anchor_top": anchor["top"],
		"buildings": buildings,
	}
	# rooftop chase points: A mid-height SE, B taller, C tallest, then anchor
	var a_top: Vector3 = Vector3.ZERO
	var b_top: Vector3 = Vector3.ZERO
	var c_top: Vector3 = Vector3.ZERO
	for r in buildings:
		var t: Vector3 = r["top"]
		if t.x + t.z > a_top.x + a_top.z and r["h"] >= 20.0:
			a_top = t
		if t.x + t.z > b_top.x + b_top.z and r["h"] >= 45.0:
			b_top = t
		if -t.x - t.z > c_top.x - c_top.z and r["h"] >= 55.0:
			c_top = t
	if c_top == Vector3.ZERO:
		for r in buildings:
			if r["h"] > c_top.y and r["h"] < 110.0:
				c_top = r["top"]
	if b_top == Vector3.ZERO:
		b_top = a_top
	info["rooftop_A"] = a_top
	info["rooftop_B"] = b_top
	info["rooftop_C"] = c_top
	info["fugitive_path"] = [a_top, b_top, c_top, anchor["top"]]
	var rings := [
		Vector3(0, 36, 92), Vector3(52, 50, 52), Vector3(10, 66, 6),
		Vector3(-50, 60, -46), Vector3(-4, 86, -90),
	]
	var cleared: Array = []
	for rp in rings:
		cleared.append(_clear_point(rp, aabbs))
	info["rings"] = cleared
	var roam: Array = []
	for p in [
		Vector3(30, 0.5, 40), Vector3(-30, 0.5, 52), Vector3(56, 0.5, 20), Vector3(-56, 0.5, -10),
		Vector3(10, 0.5, -56), Vector3(-20, 0.5, 70), Vector3(70, 0.5, -56), Vector3(-70, 0.5, 70),
		Vector3(30, 0.5, -70), Vector3(-70, 0.5, -30), Vector3(70, 0.5, 30), Vector3(-10, 0.5, 90),
	]:
		roam.append(_clear_point(p, aabbs))
	info["free_roam_spawns"] = roam
	return info


## In-place Fisher-Yates with the project's seeded RNG (RandomNumberGenerator has
## no shuffle() method, and this keeps generation deterministic per seed).
func _shuffle(rng: RandomNumberGenerator, arr: Array) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp


func _pick_height(rng: RandomNumberGenerator, podium_bias: float) -> float:
	var r := rng.randf()
	var floors: int
	if r < 0.6:
		floors = rng.randi_range(4, 9)
	elif r < 0.9:
		floors = rng.randi_range(10, 16)
	else:
		floors = rng.randi_range(18, 26)
	if podium_bias > 0.0 and rng.randf() < podium_bias:
		floors = rng.randi_range(4, 8)
	return float(floors) * FLOOR_H


func _add_building(world: Node3D, pos: Vector2, w: float, d: float, h: float,
		body_mat: Material, roof_mat: Material, metal_mat: Material, dark_mat: Material,
		rng: RandomNumberGenerator, is_anchor := false) -> Dictionary:
	var body := MeshInstance3D.new()
	body.mesh = Proctex.scaled_box(w, h, d, Vector2(w / FACADE_TILE_W, h / FACADE_TILE_H))
	body.material_override = body_mat
	body.position = Vector3(pos.x, h / 2.0, pos.y)
	world.add_child(body)

	var sb := StaticBody3D.new()
	sb.collision_layer = 1
	var cs := CollisionShape3D.new()
	var shp := BoxShape3D.new()
	shp.size = Vector3(w, h, d)
	cs.shape = shp
	cs.position = Vector3(pos.x, h / 2.0, pos.y)
	sb.add_child(cs)
	world.add_child(sb)

	# roof slab
	var roof := MeshInstance3D.new()
	var roof_msh := BoxMesh.new()
	roof_msh.size = Vector3(w + 0.8, 0.5, d + 0.8)
	roof.mesh = roof_msh
	roof.material_override = roof_mat
	roof.position = Vector3(pos.x, h + 0.25, pos.y)
	world.add_child(roof)

	# roof props
	var rpos := Vector3(pos.x, h + 0.5, pos.y)
	var ac_count := 0 if is_anchor else rng.randi_range(0, 3)
	for a in ac_count:
		var ac := MeshInstance3D.new()
		var ac_msh := BoxMesh.new()
		ac_msh.size = Vector3(rng.randf_range(1.6, 2.6), 1.2, rng.randf_range(1.6, 2.6))
		ac.mesh = ac_msh
		ac.material_override = metal_mat
		ac.position = rpos + Vector3(rng.randf_range(-w * 0.3, w * 0.3), 0.6, rng.randf_range(-d * 0.3, d * 0.3))
		world.add_child(ac)
	if not is_anchor and rng.randf() < 0.3:
		var tower := MeshInstance3D.new()
		var tm := CylinderMesh.new()
		tm.top_radius = 0.3
		tm.bottom_radius = 1.8
		tm.height = 3.4
		tower.mesh = tm
		tower.material_override = metal_mat
		tower.position = rpos + Vector3(rng.randf_range(-w * 0.25, w * 0.25), 1.7, rng.randf_range(-d * 0.25, d * 0.25))
		world.add_child(tower)
	if h > 25.0 or is_anchor:
		for edge in 4:
			var rail := MeshInstance3D.new()
			var rail_msh := BoxMesh.new()
			match edge:
				0, 1:
					rail_msh.size = Vector3(w + 0.8, 0.9, 0.12)
					rail.position = rpos + Vector3(0, 0.45, (d / 2 + 0.34) * (1.0 if edge == 0 else -1.0))
				_:
					rail_msh.size = Vector3(0.12, 0.9, d + 0.8)
					rail.position = rpos + Vector3((w / 2 + 0.34) * (1.0 if edge == 2 else -1.0), 0.45, 0)
			rail.mesh = rail_msh
			rail.material_override = metal_mat
			world.add_child(rail)

	# fire escape
	if not is_anchor and rng.randf() < 0.4:
		var side := 1.0 if rng.randf() < 0.5 else -1.0
		var count := mini(5, int(h / 17.0) + 2)
		var zoff := -d * 0.3
		for f in count:
			var py := h - 6.0 - f * 3.4
			if py < 5.0:
				break
			var plat := MeshInstance3D.new()
			var plat_msh := BoxMesh.new()
			plat_msh.size = Vector3(1.8, 0.12, 2.6)
			plat.mesh = plat_msh
			plat.material_override = metal_mat
			plat.position = Vector3(pos.x + side * (w / 2 + 0.9), py, pos.y + zoff + (f % 2) * 4.0)
			world.add_child(plat)
			var rail2 := MeshInstance3D.new()
			var rail2_msh := BoxMesh.new()
			rail2_msh.size = Vector3(0.08, 0.8, 2.6)
			rail2.mesh = rail2_msh
			rail2.material_override = metal_mat
			rail2.position = plat.position + Vector3(side * 0.85, 0.4, 0)
			world.add_child(rail2)

	# ledges every 17m on anchor + tall towers (zip targets & perch points)
	if is_anchor or h > 60.0:
		var first := 17.0
		var idx := 0
		for ly in range(first, int(h - 4), 17):
			var ledge := MeshInstance3D.new()
			var ledge_msh := BoxMesh.new()
			ledge_msh.size = Vector3(w + 1.4, 0.6, d + 1.4)
			ledge.mesh = ledge_msh
			ledge.material_override = roof_mat
			ledge.position = Vector3(pos.x, float(ly), pos.y)
			world.add_child(ledge)
			var lsb := StaticBody3D.new()
			lsb.collision_layer = 1
			var lcs := CollisionShape3D.new()
			var lshp := BoxShape3D.new()
			lshp.size = Vector3(w + 1.4, 0.6, d + 1.4)
			lcs.shape = lshp
			lcs.position = Vector3(pos.x, float(ly), pos.y)
			lsb.add_child(lcs)
			world.add_child(lsb)
			idx += 1

	return {
		"pos": Vector3(pos.x, 0.0, pos.y),
		"size": Vector3(w, h, d),
		"h": h,
		"top": Vector3(pos.x, h + 0.5, pos.y),
		"aabb": AABB(Vector3(pos.x - w / 2.0, 0.0, pos.y - d / 2.0), Vector3(w, h, d)),
		"is_anchor": is_anchor,
	}


func _add_lamps(world: Node3D, metal_mat: Material, lamp_mat: Material, rng: RandomNumberGenerator) -> void:
	for axis in 2:
		for line in [-56.0, 0.0, 56.0]:
			for t in range(-100, 101, 25):
				var p := Vector3(line, 0, float(t)) if axis == 0 else Vector3(float(t), 0, line)
				if absf(p.x) < 52.0 and absf(p.z) < 52.0:
					continue  # keep the plaza clean
				var pole := MeshInstance3D.new()
				var pm := CylinderMesh.new()
				pm.top_radius = 0.09
				pm.bottom_radius = 0.12
				pm.height = 5.4
				pole.mesh = pm
				pole.material_override = metal_mat
				pole.position = p + Vector3(0, 2.7, 0)
				world.add_child(pole)
				var arm_dir := Vector3(1, 0, 0).rotated(Vector3.UP, rng.randf() * TAU)
				var arm := MeshInstance3D.new()
				var arm_msh := BoxMesh.new()
				arm_msh.size = Vector3(1.6, 0.08, 0.08)
				arm.mesh = arm_msh
				arm.material_override = metal_mat
				arm.position = p + Vector3(0, 5.3, 0) + arm_dir * 0.8
				world.add_child(arm)
				arm.look_at(p + Vector3(0, 5.3, 0) + arm_dir * 4.0)
				var bulb := MeshInstance3D.new()
				var bulb_msh := SphereMesh.new()
				bulb_msh.radius = 0.16
				bulb_msh.height = 0.32
				bulb.mesh = bulb_msh
				bulb.material_override = lamp_mat
				bulb.position = arm.position + arm_dir * 1.5
				world.add_child(bulb)


func _add_cars(world: Node3D, car_mats: Array, dark_mat: Material, rng: RandomNumberGenerator) -> void:
	var lines := [-56.0, 0.0, 56.0]
	for c in 16:
		var line: float = lines[rng.randi_range(0, 2)]
		var horizontal := rng.randf() < 0.5
		var t := rng.randf_range(-95.0, 95.0)
		var off := rng.randf_range(4.5, 6.5) * (1.0 if rng.randf() < 0.5 else -1.0)
		var p := Vector3(line + off, 0, t) if horizontal else Vector3(t, 0, line + off)
		if absf(p.x) < 52.0 and absf(p.z) < 52.0:
			continue
		var sb := StaticBody3D.new()
		sb.collision_layer = 1
		var cs := CollisionShape3D.new()
		var shp := BoxShape3D.new()
		shp.size = Vector3(2.0, 1.4, 4.4)
		cs.shape = shp
		cs.position = Vector3(p.x, 0.7, p.z)
		sb.add_child(cs)
		sb.rotation_degrees = Vector3(0, rng.randi_range(0, 3) * 90.0, 0)
		world.add_child(sb)
		var mat: Material = car_mats[rng.randi_range(0, car_mats.size() - 1)]
		var body := MeshInstance3D.new()
		var body_msh := BoxMesh.new()
		body_msh.size = Vector3(1.9, 0.7, 4.3)
		body.mesh = body_msh
		body.material_override = mat
		body.position = Vector3(p.x, 0.55, p.z)
		body.rotation_degrees = sb.rotation_degrees
		world.add_child(body)
		var cabin := MeshInstance3D.new()
		var cabin_msh := BoxMesh.new()
		cabin_msh.size = Vector3(1.7, 0.6, 2.1)
		cabin.mesh = cabin_msh
		cabin.material_override = dark_mat
		cabin.position = Vector3(p.x, 1.2, p.z - 0.3)
		cabin.rotation_degrees = sb.rotation_degrees
		world.add_child(cabin)


func _add_dumpsters(world: Node3D, metal_mat: Material, dark_mat: Material, rng: RandomNumberGenerator) -> void:
	for d in 10:
		var p := Vector3(rng.randf_range(-100, 100), 0, rng.randf_range(-100, 100))
		if absf(p.x) < 50.0 and absf(p.z) < 50.0:
			p.x += 55.0
		var mi := MeshInstance3D.new()
		var mi_msh := BoxMesh.new()
		mi_msh.size = Vector3(2.4, 1.2, 1.3)
		mi.mesh = mi_msh
		mi.material_override = metal_mat
		mi.position = p + Vector3(0, 0.6, 0)
		mi.rotation_degrees = Vector3(0, rng.randf() * 90.0, 0)
		world.add_child(mi)
		var sb := StaticBody3D.new()
		sb.collision_layer = 1
		var cs := CollisionShape3D.new()
		var shp := BoxShape3D.new()
		shp.size = Vector3(2.4, 1.2, 1.3)
		cs.shape = shp
		cs.position = mi.position
		sb.add_child(cs)
		world.add_child(sb)


func _add_benches(world: Node3D, dark_mat: Material, rng: RandomNumberGenerator) -> void:
	var spots := [
		Vector3(8, 0, 20), Vector3(-8, 0, -20), Vector3(16, 0, -8), Vector3(-16, 0, 8),
		Vector3(30, 0, 60), Vector3(-30, 0, -60), Vector3(60, 0, 30), Vector3(-60, 0, -30),
	]
	for s in spots:
		var mi := MeshInstance3D.new()
		var mi_msh := BoxMesh.new()
		mi_msh.size = Vector3(2.0, 0.45, 0.5)
		mi.mesh = mi_msh
		mi.material_override = dark_mat
		mi.position = s + Vector3(0, 0.22, 0)
		mi.rotation_degrees = Vector3(0, rng.randf() * 180.0, 0)
		world.add_child(mi)
		var back := MeshInstance3D.new()
		var back_msh := BoxMesh.new()
		back_msh.size = Vector3(2.0, 0.5, 0.08)
		back.mesh = back_msh
		back.material_override = dark_mat
		back.position = mi.position + Vector3(0, 0.45, -0.24)
		back.rotation_degrees = mi.rotation_degrees
		world.add_child(back)


func _add_edge_walls(world: Node3D, concrete_mat: Material) -> void:
	var L := 130.0
	for e in 4:
		var size := Vector3(L * 2 + 4, 12.0, 4.0)
		var pos := Vector3.ZERO
		match e:
			0: pos = Vector3(0, 6, L + 2)
			1: pos = Vector3(0, 6, -L - 2)
			2:
				size = Vector3(4.0, 12.0, L * 2 + 4)
				pos = Vector3(L + 2, 6, 0)
			3:
				size = Vector3(4.0, 12.0, L * 2 + 4)
				pos = Vector3(-L - 2, 6, 0)
		var sb := StaticBody3D.new()
		sb.collision_layer = 1
		var cs := CollisionShape3D.new()
		var shp := BoxShape3D.new()
		shp.size = size
		cs.shape = shp
		cs.position = pos
		sb.add_child(cs)
		world.add_child(sb)
		var mi := MeshInstance3D.new()
		var mi_msh := BoxMesh.new()
		mi_msh.size = size
		mi.mesh = mi_msh
		mi.material_override = concrete_mat
		mi.position = pos
		world.add_child(mi)


func _setup_lighting(world: Node3D) -> void:
	_env = Environment.new()
	_env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	_sky_mat = ProceduralSkyMaterial.new()
	sky.sky_material = _sky_mat
	_env.sky = sky
	_env.tonemap_mode = Environment.TONE_MAPPER_ACES
	_env.glow_enabled = true
	_env.glow_intensity = 0.4
	_env.glow_bloom = 0.06
	_env.fog_enabled = true
	_env.fog_density = 0.0015
	var we := WorldEnvironment.new()
	we.environment = _env
	world.add_child(we)

	_sun = DirectionalLight3D.new()
	_sun.shadow_enabled = true
	_sun.light_energy = 1.7
	_sun.rotation_degrees = Vector3(-55, -30, 0)
	world.add_child(_sun)
	world.set_meta("world_env", we)
	world.set_meta("sun", _sun)


func _apply_sky(world: Node3D, night: bool) -> void:
	var we: WorldEnvironment = world.get_meta("world_env")
	var sun: DirectionalLight3D = world.get_meta("sun")
	if we == null or sun == null:
		return
	var env := we.environment
	var mat := ProceduralSkyMaterial.new()
	if night:
		mat.sky_top_color = Color(0.012, 0.02, 0.055)
		mat.sky_horizon_color = Color(0.07, 0.09, 0.16)
		mat.sky_curve = 0.12
		mat.ground_bottom_color = Color(0.01, 0.012, 0.02)
		mat.ground_horizon_color = Color(0.05, 0.06, 0.09)
		mat.ground_curve = 0.05
		env.fog_density = 0.0028
		env.fog_light_color = Color(0.06, 0.08, 0.14)
		env.glow_intensity = 0.7
		sun.light_energy = 0.14
		sun.light_color = Color(0.55, 0.65, 0.95)
		sun.rotation_degrees = Vector3(-40, 140, 0)
	else:
		mat.sky_top_color = Color(0.28, 0.5, 0.8)
		mat.sky_horizon_color = Color(0.72, 0.8, 0.88)
		mat.sky_curve = 0.16
		mat.ground_bottom_color = Color(0.18, 0.19, 0.21)
		mat.ground_horizon_color = Color(0.55, 0.58, 0.62)
		mat.ground_curve = 0.09
		env.fog_density = 0.0012
		env.fog_light_color = Color(0.75, 0.8, 0.88)
		env.glow_intensity = 0.4
		sun.light_energy = 1.7
		sun.light_color = Color(1.0, 0.96, 0.9)
		sun.rotation_degrees = Vector3(-55, -30, 0)
	env.sky.sky_material = mat


func _tex_mat(tex: ImageTexture) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_texture = tex
	# BaseMaterial3D.texture_repeat is a bool (default true) in Godot 4.2+; tiling
	# is what the generated facade/asphalt/roof UVs assume.
	m.texture_repeat = true
	m.roughness = 0.85
	m.metallic = 0.02
	return m


func _clear_point(p: Vector3, aabbs: Array) -> Vector3:
	var a := p
	var guard := 0
	while guard < 60:
		guard += 1
		var inside := false
		for b in aabbs:
			if (b as AABB).has_point(a):
				inside = true
				break
		if not inside:
			break
		a.y += 4.0
	return a
