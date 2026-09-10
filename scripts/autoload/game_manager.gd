extends Node
## GameManager — the game director: modes, missions, enemy spawning,
## spider-sense, group-attack stagger, scoring, save/load.

enum Mode { MENU, PLAY, PAUSED, DEAD, COMPLETE }

const SAVE_PATH := "user://arachnid_save.json"

var mode: int = Mode.MENU
var player = null
var world_root: Node3D = null
var city_info: Dictionary = {}
var enemies: Array = []
var active_mission := -1
var mission_obj_idx := 0
var mission_time := 0.0
var stats: Dictionary = {}
var score := 0
var missions_done: Array = []
var sense_t := 0.0
var sense_source: Node3D = null
var last_attack_t := -9.0
var settings: Dictionary = {"master": 1.0, "sfx": 1.0, "music": 1.0, "sens": 1.0, "night": false}

# mission-internal state
var _rob_wave := 0
var _rob_spawned := 0
var _fugitive = null
var _ring_idx := 0
var _ring_areas: Array = []
var _free_roam_t := 0.0

signal banner(text: String)
signal objective(text: String)
signal finished(success: bool, title: String)


func _ready() -> void:
	load_game.call_deferred()


func register_player(p: CharacterBody3D) -> void:
	player = p


func can_control_player() -> bool:
	return mode == Mode.PLAY


func mission_name(i: int) -> String:
	match i:
		0:
			return "STOP THE ROBBERY"
		1:
			return "ROOFTOP CHASE"
		2:
			return "TIME TRIAL: RING RUN"
	return "FREE ROAM"


# ------------------------------------------------------------------ modes

func start_free_roam() -> void:
	_reset_world(-1, "FREE ROAM")


func start_mission(i: int) -> void:
	_reset_world(i, mission_name(i))


func _reset_world(mi: int, title: String) -> void:
	active_mission = mi
	mission_obj_idx = 0
	mission_time = 0.0
	score = 0
	stats = {"time": 0.0, "max_combo": 0.0, "damage_taken": 0.0, "kills": 0}
	_rob_wave = 0
	_rob_spawned = 0
	_ring_idx = 0
	_fugitive = null
	_free_roam_t = 0.0
	get_tree().paused = false
	for e in get_tree().get_nodes_in_group("enemies"):
		e.queue_free()
	for r in _ring_areas:
		if is_instance_valid(r):
			r.queue_free()
	_ring_areas.clear()
	enemies.clear()
	sense_t = 0.0
	sense_source = null
	last_attack_t = -9.0
	TimeCtrl.clear()
	if player == null:
		return
	match mi:
		-1:
			player.reset(city_info["spawn"])
			_spawn_free_roam()
			AudioMan.play_music("explore")
			AudioMan.set_siren(false)
			emit_signal("objective", "Explore the city. Web-swing (hold RMB), zip (F), strike (Q).")
		0:
			player.reset(city_info["plaza_start"])
			AudioMan.play_music("combat")
			AudioMan.set_siren(true)
			emit_signal("objective", "Reach the bank plaza to stop the robbery.")
		1:
			player.reset(city_info["chase_start"])
			AudioMan.play_music("explore")
			AudioMan.set_siren(true)
			emit_signal("objective", "Swing to the marked rooftop.")
		2:
			player.reset(city_info["spawn"])
			_build_rings()
			AudioMan.play_music("explore")
			AudioMan.set_siren(false)
			emit_signal("objective", "Hit ring 1/5 — beat the clock!")
	mode = Mode.PLAY
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	emit_signal("banner", title)


func toggle_pause() -> void:
	if mode == Mode.PLAY:
		mode = Mode.PAUSED
		get_tree().paused = true
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif mode == Mode.PAUSED:
		mode = Mode.PLAY
		get_tree().paused = false
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func to_menu() -> void:
	mode = Mode.MENU
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	for e in get_tree().get_nodes_in_group("enemies"):
		e.queue_free()
	for r in _ring_areas:
		if is_instance_valid(r):
			r.queue_free()
	_ring_areas.clear()
	_fugitive = null
	sense_t = 0.0
	TimeCtrl.clear()
	AudioMan.play_music("menu")
	AudioMan.set_siren(false)
	if player != null:
		player.reset(city_info["spawn"])


func retry() -> void:
	if active_mission >= 0:
		_reset_world(active_mission, mission_name(active_mission))
	else:
		_reset_world(-1, "FREE ROAM")


# ------------------------------------------------------------------ spawning

func _spawn_enemy(etype: String, pos: Vector3, extra: Dictionary = {}):
	var e = preload("res://scripts/enemy/enemy.gd").new()
	e.type = etype
	if world_root != null:
		world_root.add_child(e)
	else:
		get_tree().root.add_child(e)
	e.player = player
	e.global_position = pos
	if extra.has("waypoints"):
		e.waypoints = extra["waypoints"]
	if extra.has("flee_path"):
		e.flee_path = extra["flee_path"]
	enemies.append(e)
	return e


func _spawn_free_roam() -> void:
	var spots: Array = city_info["free_roam_spawns"]
	for i in 8:
		var p: Vector3 = spots[i % spots.size()]
		var etype := "armed" if i % 3 == 2 else "thug"
		var e = _spawn_enemy(etype, p)
		e.waypoints = [
			p + Vector3(7.0, 0, 0),
			p + Vector3(-7.0, 0, 7.0),
			p + Vector3(0, 0, -9.0),
		]


# ------------------------------------------------------------------ ticking

func _physics_process(delta: float) -> void:
	if mode != Mode.PLAY:
		return
	mission_time += delta
	stats["time"] = mission_time
	sense_t = maxf(sense_t - delta, 0.0)
	match active_mission:
		0:
			_tick_robbery()
		1:
			_tick_chase()
		2:
			if mission_time > 90.0:
				_fail("OUT OF TIME")
		-1:
			_tick_free_roam(delta)


func _tick_robbery() -> void:
	if _rob_wave == 0:
		var p: Vector3 = player.global_position
		var bank: Vector3 = city_info["bank"]
		if Vector2(p.x, p.z).distance_to(Vector2(bank.x, bank.z)) < 26.0:
			_rob_wave = 1
			for i in 5:
				var a := TAU * float(i) / 5.0
				var sp := bank + Vector3(cos(a) * 13.0, 0, sin(a) * 13.0)
				_spawn_enemy("thug", sp)
			_rob_spawned = 5
			AudioMan.play_sfx("grunt", player.global_position, 1.0, -4.0)
			_emit_robbery_obj()
		return
	var alive := _alive_hostiles()
	if alive == 0 and _rob_spawned < 8:
		_rob_wave = 2
		var bank: Vector3 = city_info["bank"]
		for i in 3:
			var a := TAU * float(i) / 3.0 + 0.6
			var sp := bank + Vector3(cos(a) * 16.0, 0, sin(a) * 16.0)
			_spawn_enemy("armed" if i < 2 else "thug", sp)
		_rob_spawned = 8
		AudioMan.play_sfx("grunt", player.global_position, 1.1, -4.0)
		_emit_robbery_obj()
	elif alive == 0 and _rob_spawned >= 8:
		_complete()


func _emit_robbery_obj() -> void:
	emit_signal("objective", "Stop the robbery! (%d/8)" % int(stats["kills"]))


func _tick_chase() -> void:
	if mission_obj_idx == 0:
		var a: Vector3 = city_info["rooftop_A"]
		if (player.global_position - a).length() < 10.0:
			mission_obj_idx = 1
			var path: Array = city_info["fugitive_path"]
			var f = _spawn_enemy("fugitive", path[0])
			f.flee_path = path
			_fugitive = f
			AudioMan.play_music("combat")
			AudioMan.play_sfx("grunt", a, 0.8, -4.0)
			emit_signal("objective", "Chase the fugitive to the Sky Tower!")
	elif mission_obj_idx == 1:
		var at: Vector3 = city_info["anchor_top"]
		if (player.global_position - at).length() < 45.0:
			mission_obj_idx = 2
			var roof: Vector3 = city_info["anchor_top"]
			for i in 4:
				var a := TAU * float(i) / 4.0
				_spawn_enemy("armed", roof + Vector3(cos(a) * 7.0, 0, sin(a) * 7.0))
			_spawn_enemy("brute", roof)
			emit_signal("objective", "Defeat the crew! (0/5)")
	elif mission_obj_idx == 2:
		var alive := _alive_hostiles()
		emit_signal("objective", "Defeat the crew! (%d/5)" % (5 - alive))
		if alive == 0:
			_complete()


func _tick_free_roam(delta: float) -> void:
	var alive := _alive_hostiles()
	if alive < 4:
		_free_roam_t += delta
		if _free_roam_t > 18.0:
			_free_roam_t = 0.0
			var spots: Array = city_info["free_roam_spawns"]
			for i in 2:
				var p: Vector3 = spots[randi() % spots.size()]
				var e = _spawn_enemy("armed" if randf() < 0.3 else "thug", p)
				e.waypoints = [p + Vector3(8.0, 0, 0), p + Vector3(-8.0, 0, 6.0)]
	else:
		_free_roam_t = 0.0


func _alive_hostiles() -> int:
	var n := 0
	for e in enemies:
		if is_instance_valid(e) and e.has_method("is_hostile") and e.is_hostile() and e.get_health() > 0.0:
			n += 1
	return n


func _nearest_alive() -> Vector3:
	var best := Vector3.ZERO
	var best_d := 1e9
	for e in enemies:
		if not is_instance_valid(e):
			continue
		if e.has_method("is_hostile") and not e.is_hostile():
			continue
		if e.get_health() <= 0.0:
			continue
		var d: float = (e as Node3D).global_position.distance_to(player.global_position)
		if d < best_d:
			best_d = d
			best = (e as Node3D).global_position
	return best


# ------------------------------------------------------------------ rings

func _build_rings() -> void:
	var rings: Array = city_info["rings"]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.85, 0.2)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.85, 0.2)
	mat.emission_energy_multiplier = 2.0
	var pmat := StandardMaterial3D.new()
	pmat.albedo_color = Color(1.0, 0.85, 0.2, 0.22)
	pmat.emission_enabled = true
	pmat.emission = Color(1.0, 0.85, 0.2)
	pmat.emission_energy_multiplier = 1.2
	pmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for rp in rings:
		var area := Area3D.new()
		area.collision_layer = 0
		area.collision_mask = 2
		area.monitoring = true
		area.global_position = rp
		var cs := CollisionShape3D.new()
		var cyl := CylinderShape3D.new()
		cyl.radius = 5.0
		cyl.height = 16.0
		cs.shape = cyl
		area.add_child(cs)
		var torus := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 3.6
		tm.outer_radius = 5.0
		torus.mesh = tm
		torus.material_override = mat
		area.add_child(torus)
		var pillar := MeshInstance3D.new()
		var pm := CylinderMesh.new()
		pm.top_radius = 0.14
		pm.bottom_radius = 0.14
		pm.height = 300.0
		pillar.mesh = pm
		pillar.material_override = pmat
		pillar.position = Vector3(0, -150.0, 0)
		pillar.scale = Vector3(1, maxf(rp.y + 5.0, 4.0) / 300.0, 1)
		pillar.position = Vector3(0, -maxf(rp.y + 5.0, 4.0) / 2.0, 0)
		area.add_child(pillar)
		(world_root if world_root != null else get_tree().root).add_child(area)
		area.body_entered.connect(_on_ring_entered)
		_ring_areas.append(area)


func _on_ring_entered(body: Node) -> void:
	if body != player:
		return
	var ring := _ring_areas[_ring_idx] as Node3D
	_ring_idx += 1
	if _ring_idx >= _ring_areas.size():
		_complete()
		return
	ring.visible = false
	(ring as Area3D).set_deferred("monitoring", false)
	AudioMan.play_sfx("combo", Vector3.INF, 1.4 + _ring_idx * 0.2, -6.0)
	var left := int(90.0 - mission_time)
	emit_signal("objective", "Ring %d/5! %ds left." % [_ring_idx + 1, left])


# ------------------------------------------------------------------ callbacks

func on_enemy_defeated(e: Node) -> void:
	if e == null or not is_instance_valid(e):
		return
	var en: Variant = e
	if en.has_method("is_hostile") and not en.is_hostile():
		return
	stats["kills"] = int(stats["kills"]) + 1
	add_score(100)
	if active_mission == 0:
		_emit_robbery_obj()


func on_player_hurt(amount: float) -> void:
	stats["damage_taken"] = float(stats["damage_taken"]) + amount


func on_enemy_windup(e: Node) -> void:
	if player == null or mode != Mode.PLAY:
		return
	if e == null or not is_instance_valid(e):
		return
	var d := (e as Node3D).global_position.distance_to(player.global_position)
	if d > 13.0:
		return
	var to: Vector3 = (player.global_position - (e as Node3D).global_position).normalized()
	var facing := -(e as Node3D).global_transform.basis.z
	if d > 6.0 and facing.dot(to) < 0.1:
		return
	sense_t = 0.7
	sense_source = e as Node3D
	TimeCtrl.do_slowmo(0.35, 0.5)
	AudioMan.play_sfx("sense", Vector3.INF, 1.0, -4.0)


func player_defeated() -> void:
	if mode != Mode.PLAY:
		return
	mode = Mode.DEAD
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	AudioMan.play_sfx("defeat", Vector3.INF, 1.0, -4.0)
	AudioMan.play_music("none")
	AudioMan.set_siren(false)
	emit_signal("finished", false, "YOU WERE DEFEATED")


func add_score(n: int) -> void:
	score += n


func get_objective_world_pos() -> Vector3:
	match active_mission:
		0:
			if _rob_wave == 0:
				return city_info["bank"]
			return _nearest_alive()
		1:
			if mission_obj_idx == 0:
				return city_info["rooftop_A"]
			if mission_obj_idx == 1 and _fugitive != null and is_instance_valid(_fugitive):
				return (_fugitive as Node3D).global_position
			return city_info["anchor_top"]
		2:
			if _ring_idx < _ring_areas.size():
				return (_ring_areas[_ring_idx] as Node3D).global_position
	return Vector3.ZERO


# ------------------------------------------------------------------ end states

func _complete() -> void:
	if mode != Mode.PLAY:
		return
	mode = Mode.COMPLETE
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	AudioMan.play_sfx("victory", Vector3.INF, 1.0, -2.0)
	AudioMan.play_music("none")
	AudioMan.set_siren(false)
	if active_mission >= 0 and not missions_done.has(active_mission):
		missions_done.append(active_mission)
		save_game()
	var bonus := int(maxf(0.0, 300.0 - mission_time * 3.0) * 10)
	add_score(bonus)
	if _fugitive != null and is_instance_valid(_fugitive):
		_fugitive.get_arrested()
	var title := "MISSION COMPLETE"
	if active_mission == 2:
		title = "RANK %s — %d s" % [_rank(), int(mission_time)]
	emit_signal("finished", true, title)


func _rank() -> String:
	if mission_time < 50.0:
		return "S"
	if mission_time < 65.0:
		return "A"
	if mission_time < 80.0:
		return "B"
	return "C"


func _fail(title: String) -> void:
	if mode != Mode.PLAY:
		return
	mode = Mode.COMPLETE
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	AudioMan.play_sfx("defeat", Vector3.INF, 1.0, -4.0)
	AudioMan.play_music("none")
	emit_signal("finished", false, title)


# ------------------------------------------------------------------ save

func save_game() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({"missions": missions_done, "settings": settings}, "\t"))


func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		apply_settings()
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return
	var data = JSON.parse_string(f.get_as_text())
	if typeof(data) == TYPE_DICTIONARY:
		if data.has("missions") and typeof(data["missions"]) == TYPE_ARRAY:
			missions_done = data["missions"]
		if data.has("settings") and typeof(data["settings"]) == TYPE_DICTIONARY:
			for k in data["settings"]:
				settings[k] = data["settings"][k]
	apply_settings()


func apply_settings() -> void:
	AudioMan.set_volumes(float(settings["master"]), float(settings["sfx"]), float(settings["music"]))


# ------------------------------------------------------------------ debug

func debug_auto_start() -> void:
	var v := OS.get_environment("ARACHNID_AUTOSTART")
	if v.is_empty():
		return
	if v == "free":
		start_free_roam()
	elif v.begins_with("mission:"):
		var idx := v.get_slice(":", 1)
		if idx.is_valid_int():
			start_mission(int(idx))
