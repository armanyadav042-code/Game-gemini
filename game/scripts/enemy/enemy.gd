extends CharacterBody3D
## Enemy AI with a full state machine:
## Patrol -> Alert -> Chase -> (Melee Windup/Active | Ranged Windup/Active | Charge)
## -> Hitstun -> Defeated. Types: thug (melee), armed (ranged), brute (charger),
## fugitive (flees along a rooftop path for the chase mission).

const CITY := 1
const ENEMY_LAYER := 4
const PLAYER_LAYER := 2
const GRAVITY := 26.0

enum S { PATROL, ALERT, CHASE, WINDUP, ACTIVE, R_WINDUP, R_ACTIVE, CHARGE, HITSTUN, DEFEATED }

var type := "thug"
var health := 30.0
var max_health := 30.0
var state: int = S.PATROL
var state_t := 0.0
var player: CharacterBody3D = null
var waypoints: Array = []
var wp_i := 0
var flee_path: Array = []
var flee_i := 0
var speed_walk := 1.6
var speed_run := 4.6
var attack_cd := 1.0
var hitstun_t := 0.35
var knockback := Vector3.ZERO
var charge_dir := Vector3.ZERO
var sense_fired := false
var def_t := 0.0

var _patrol_wait := 0.0
var _stuck_t := 0.0
var _detour_t := 0.0
var _detour_dir := Vector3.ZERO
var _strafe_side := 1.0
var _flash_t := 0.0
var _anim_time := 0.0
var _run_phase := 0.0
var _hit_cd := 0.0

var model: Node3D
var bones: Dictionary = {}
var attack_area: Area3D
var _mats: Array = []


func _ready() -> void:
	add_to_group("enemies")
	collision_layer = ENEMY_LAYER
	collision_mask = CITY | PLAYER_LAYER
	floor_snap_angle = deg_to_rad(45.0)
	attack_cd = randf_range(0.4, 1.6)
	match type:
		"brute":
			health = 120.0
			speed_run = 3.6
		"armed":
			health = 30.0
			_strafe_side = -1.0 if randf() < 0.5 else 1.0
		"fugitive":
			health = 50.0
			speed_run = 9.5
		_:
			health = 30.0
	max_health = health
	_build_model()
	_build_attack_area()


func _build_attack_area() -> void:
	attack_area = Area3D.new()
	attack_area.collision_layer = 0
	attack_area.collision_mask = PLAYER_LAYER
	attack_area.monitoring = false
	add_child(attack_area)
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(1.4, 1.5, 1.8)
	cs.shape = box
	cs.position = Vector3(0, 0.3, -1.5)
	attack_area.add_child(cs)
	attack_area.body_entered.connect(_on_attack_hit)
	attack_area.area_entered.connect(_on_attack_area_hit)


func is_hostile() -> bool:
	return type != "fugitive"


func _melee_damage() -> float:
	match type:
		"brute":
			return 16.0
		"armed":
			return 8.0
		_:
			return 10.0


func _knock_dir() -> Vector3:
	if player == null or not is_instance_valid(player):
		return -global_transform.basis.z
	return (player.global_position - global_position).normalized()


func _on_attack_hit(body: Node) -> void:
	if _hit_cd > 0.0:
		return
	if body is CharacterBody3D and body.has_method("take_damage"):
		var b: Variant = body
		_hit_cd = 0.5
		b.take_damage(_melee_damage() * (1.5 if state == S.CHARGE else 1.0), _knock_dir(), state == S.CHARGE)


func _on_attack_area_hit(area: Area3D) -> void:
	if _hit_cd > 0.0:
		return
	var p: Variant = area.get_parent()
	if p != null and p.has_method("take_damage"):
		_hit_cd = 0.5
		p.take_damage(_melee_damage() * (1.5 if state == S.CHARGE else 1.0), _knock_dir(), state == S.CHARGE)


func take_damage(amount: float, kb: Vector3, heavy: bool) -> void:
	if state == S.DEFEATED:
		return
	health -= amount
	_flash_t = 0.12
	if health <= 0.0:
		_die(kb)
		return
	if type == "fugitive":
		return  # can't stun the fugitive
	state = S.HITSTUN
	state_t = 0.0
	hitstun_t = 0.3 if not heavy else 0.55
	knockback = kb
	AudioMan.play_sfx("grunt", global_position, randf_range(0.75, 1.25), -6.0)


func _die(kb: Vector3) -> void:
	state = S.DEFEATED
	def_t = 0.0
	attack_area.set_deferred("monitoring", false)
	collision_mask = 0
	knockback = kb + Vector3.UP * 2.5
	AudioMan.play_sfx("grunt", global_position, 0.55, -3.0)
	GameManager.on_enemy_defeated(self)


func get_arrested() -> void:
	if type == "fugitive" and state != S.DEFEATED:
		state = S.DEFEATED
		def_t = 0.0
		knockback = Vector3.ZERO
		AudioMan.play_sfx("grunt", global_position, 0.8, -4.0)
		GameManager.on_enemy_defeated(self)


func _physics_process(delta: float) -> void:
	_anim_time += delta
	state_t += delta
	attack_cd = maxf(attack_cd - delta, 0.0)
	_hit_cd = maxf(_hit_cd - delta, 0.0)
	_flash_t = maxf(_flash_t - delta, 0.0)
	_apply_flash()

	# defeated: ragdoll-ish fall, then despawn
	if state == S.DEFEATED:
		velocity = velocity.move_toward(Vector3.ZERO, 18.0 * delta)
		velocity.y -= GRAVITY * delta
		move_and_slide()
		def_t += delta
		if def_t > 6.0:
			queue_free()
		return

	if player == null or not is_instance_valid(player) or GameManager.mode != GameManager.Mode.PLAY:
		velocity = Vector3.ZERO
		move_and_slide()
		return

	if type == "fugitive":
		_fugitive_step(delta)
		velocity.y -= GRAVITY * delta
		move_and_slide()
		_update_anim(delta)
		return

	var to_p := player.global_position - global_position
	var dist := to_p.length()
	var dir_to_p := to_p.normalized()

	match state:
		S.PATROL:
			if _patrol_wait > 0.0:
				_patrol_wait -= delta
			elif waypoints.size() > 0:
				var wp: Vector3 = waypoints[wp_i % waypoints.size()]
				var d := (wp - global_position).length()
				if d < 1.5:
					wp_i += 1
					_patrol_wait = randf_range(1.0, 3.0)
				else:
					_move_toward((wp - global_position).normalized(), speed_walk, delta)
					_face((wp - global_position).normalized(), 6.0, delta)
		S.ALERT:
			_face(dir_to_p, 12.0, delta)
			if state_t > 0.5:
				state = S.CHASE
				state_t = 0.0
		S.CHASE:
			var dirv := dir_to_p
			if type == "armed":
				if dist < 7.0:
					dirv = -dir_to_p
				elif dist > 15.0:
					dirv = dir_to_p
				else:
					dirv = dir_to_p.rotated(Vector3.UP, _strafe_side * (PI / 2.0))
			if _detour_t > 0.0:
				_detour_t -= delta
				dirv = _detour_dir
			_move_toward(dirv, speed_run, delta)
			_face(dirv, 10.0, delta)
			# stuck detection -> perpendicular detour
			var hs := Vector3(velocity.x, 0, velocity.z).length()
			if hs < 0.6 and is_on_floor():
				_stuck_t += delta
				if _stuck_t > 0.7:
					_stuck_t = 0.0
					_detour_t = 0.8
					_detour_dir = dir_to_p.rotated(Vector3.UP, (PI / 2.0) * (1.0 if randf() < 0.5 else -1.0))
			else:
				_stuck_t = 0.0
			# start an attack (group stagger handled by GameManager.last_attack_t)
			var staggered := Time.get_ticks_msec() / 1000.0 - GameManager.last_attack_t > 0.9
			if attack_cd <= 0.0 and staggered:
				if type == "brute" and dist > 7.0 and dist < 22.0 and randf() < 0.4:
					state = S.CHARGE
					state_t = 0.0
					charge_dir = dir_to_p
					sense_fired = false
					attack_area.set_deferred("monitoring", true)
					AudioMan.play_sfx("grunt", global_position, 0.7, -8.0)
					GameManager.on_enemy_windup(self)
				elif (type == "thug" or type == "brute") and dist < 2.4:
					_start_windup()
				elif type == "armed" and dist < 18.0 and _los():
					state = S.R_WINDUP
					state_t = 0.0
					sense_fired = false
					_face(dir_to_p, 14.0, delta)
		S.WINDUP:
			_face(dir_to_p, 16.0, delta)
			if state_t > 0.15 and not sense_fired:
				sense_fired = true
				GameManager.on_enemy_windup(self)
			if state_t > 0.55:
				state = S.ACTIVE
				state_t = 0.0
				attack_area.set_deferred("monitoring", true)
				GameManager.last_attack_t = Time.get_ticks_msec() / 1000.0
		S.ACTIVE:
			if state_t > 0.18:
				attack_area.set_deferred("monitoring", false)
				state = S.CHASE
				state_t = 0.0
				attack_cd = randf_range(1.1, 2.0)
		S.R_WINDUP:
			_face(dir_to_p, 16.0, delta)
			if state_t > 0.15 and not sense_fired:
				sense_fired = true
				GameManager.on_enemy_windup(self)
			if state_t > 0.6:
				state = S.R_ACTIVE
				state_t = 0.0
				_shoot()
		S.R_ACTIVE:
			if state_t > 0.25:
				state = S.CHASE
				state_t = 0.0
				attack_cd = randf_range(1.6, 2.6)
		S.CHARGE:
			velocity = Vector3(charge_dir.x, 0, charge_dir.z) * 11.0
			if state_t > 1.0:
				attack_area.set_deferred("monitoring", false)
				state = S.CHASE
				state_t = 0.0
				attack_cd = 2.2
		S.HITSTUN:
			var kbv := Vector3(knockback.x, 0, knockback.z)
			kbv = kbv.move_toward(Vector3.ZERO, 26.0 * delta)
			velocity.x = kbv.x
			velocity.z = kbv.z

	# awareness from patrol
	if state == S.PATROL and dist < 16.0 and _los():
		state = S.ALERT
		state_t = 0.0
		AudioMan.play_sfx("grunt", global_position, randf_range(1.0, 1.4), -14.0)

	velocity.y -= GRAVITY * delta
	velocity.y = maxf(velocity.y, -40.0)
	move_and_slide()
	_update_anim(delta)


func _fugitive_step(delta: float) -> void:
	if flee_path.size() == 0:
		velocity.x = 0.0
		velocity.z = 0.0
		return
	var idx := mini(flee_i, flee_path.size() - 1)
	var target: Vector3 = flee_path[idx]
	var to_t := target - global_position
	var d := to_t.length()
	if d < 2.0:
		if idx < flee_path.size() - 1:
			flee_i += 1
		else:
			velocity.x = 0.0
			velocity.z = 0.0
			return
	var dirv := to_t.normalized()
	velocity = Vector3(dirv.x, 0, dirv.z) * 9.5
	# parabolic leap between rooftops
	var from: Vector3 = flee_path[clampi(idx - 1, 0, flee_path.size() - 1)] if idx > 0 else global_position
	var seg_len := maxf((target - from).length(), 0.01)
	var seg_t := clampf(1.0 - d / seg_len, 0.0, 1.0)
	if from.distance_to(target) > 8.0:
		global_position.y = lerp(from.y, target.y, seg_t) + sin(PI * seg_t) * 7.0
	_face(dirv, 10.0, delta)


func _start_windup() -> void:
	state = S.WINDUP
	state_t = 0.0
	sense_fired = false
	AudioMan.play_sfx("grunt", global_position, randf_range(0.8, 1.1), -12.0)


func _move_toward(dir: Vector3, speed: float, delta: float) -> void:
	var flat := Vector3(velocity.x, 0, velocity.z)
	flat = flat.move_toward(dir * speed, 26.0 * delta)
	velocity.x = flat.x
	velocity.z = flat.z


func _face(dir: Vector3, rate: float, delta: float) -> void:
	if dir.length() < 0.05:
		return
	var ty := atan2(-dir.x, -dir.z)
	rotation.y = lerp_angle(rotation.y, ty, 1.0 - exp(-rate * delta))


func _los() -> bool:
	var from := global_position + Vector3(0, 1.4, 0)
	var to := player.global_position + Vector3(0, 1.2, 0)
	var q := PhysicsRayQueryParameters3D.create(from, to, [get_rid(), player.get_rid()], CITY)
	var res := get_world_3d().direct_space_state.intersect_ray(q)
	return res.is_empty()


func _shoot() -> void:
	var proj := preload("res://scripts/enemy/projectile.gd").new()
	get_parent().add_child(proj)
	proj.global_position = global_position + Vector3(0, 1.2, 0) - global_transform.basis.z * 0.6
	var aim := player.global_position + Vector3(0, 1.0, 0)
	var dirv := (aim - proj.global_position).normalized()
	proj.vel = dirv * 26.0
	proj.dmg = 9.0
	AudioMan.play_sfx("shot", global_position, randf_range(0.9, 1.1), -6.0)


func get_health() -> float:
	return health


func get_max_health() -> float:
	return max_health


# ------------------------------------------------------------------ model

func _build_model() -> void:
	var sc := 1.3 if type == "brute" else 1.0
	model = Node3D.new()
	model.name = "Model"
	model.scale = Vector3(sc, sc, sc)
	add_child(model)

	var c_hood := Color(0.33, 0.35, 0.40)
	var c_pants := Color(0.16, 0.17, 0.19)
	var c_head := Color(0.72, 0.56, 0.44)
	match type:
		"armed":
			c_hood = Color(0.42, 0.33, 0.20)
		"brute":
			c_hood = Color(0.30, 0.12, 0.12)
			c_pants = Color(0.10, 0.10, 0.12)
		"fugitive":
			c_hood = Color(0.08, 0.08, 0.10)
			c_pants = Color(0.06, 0.06, 0.08)
	var mat_body := _mk_mat(c_hood, 0.75)
	var mat_pants := _mk_mat(c_pants, 0.8)
	var mat_head := _mk_mat(c_head, 0.9)
	var mat_eye := _mk_mat(Color(0.9, 0.9, 0.9), 0.3)
	if type == "brute":
		mat_eye.emission_enabled = true
		mat_eye.emission = Color(1.0, 0.15, 0.1)
		mat_eye.emission_energy_multiplier = 2.0

	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	var sc2 := 1.3 if type == "brute" else 1.0
	cap.radius = 0.42 * sc2
	cap.height = 1.8 * sc2
	cs.shape = cap
	cs.position = Vector3(0, 0.9 * sc2, 0)
	add_child(cs)

	var hips := Node3D.new()
	model.add_child(hips)
	hips.position = Vector3(0, 0.95, 0)
	bones["hips"] = hips
	_add_box(hips, mat_pants, Vector3(0.34, 0.26, 0.22), Vector3(0, -0.02, 0))
	var chest := Node3D.new()
	hips.add_child(chest)
	chest.position = Vector3(0, 0.30, 0)
	bones["chest"] = chest
	_add_capsule(chest, mat_body, 0.27, 0.5, Vector3(0, 0.05, 0))
	var head := Node3D.new()
	chest.add_child(head)
	head.position = Vector3(0, 0.42, 0)
	bones["head"] = head
	var head_mi := MeshInstance3D.new()
	var hm := SphereMesh.new()
	hm.radius = 0.19
	hm.height = 0.38
	head_mi.mesh = hm
	head_mi.material_override = mat_head
	head.add_child(head_mi)
	_add_box(head, mat_eye, Vector3(0.09, 0.04, 0.03), Vector3(-0.07, 0.02, -0.17))
	_add_box(head, mat_eye, Vector3(0.09, 0.04, 0.03), Vector3(0.07, 0.02, -0.17))

	for side in [-1.0, 1.0]:
		var s := "l" if side < 0.0 else "r"
		var arm := Node3D.new()
		chest.add_child(arm)
		arm.position = Vector3(0.33 * side, 0.28, 0)
		bones["arm_" + s] = arm
		_add_capsule(arm, mat_body, 0.08, 0.32, Vector3(0, -0.16, 0))
		var fore := Node3D.new()
		arm.add_child(fore)
		fore.position = Vector3(0, -0.32, 0)
		bones["fore_" + s] = fore
		_add_capsule(fore, mat_body, 0.07, 0.28, Vector3(0, -0.14, 0))
		if type == "armed" and side > 0.0:
			_add_box(fore, _mk_mat(Color(0.12, 0.12, 0.14), 0.35), Vector3(0.07, 0.07, 0.30), Vector3(0, -0.26, -0.12))
	for side in [-1.0, 1.0]:
		var s := "l" if side < 0.0 else "r"
		var leg := Node3D.new()
		hips.add_child(leg)
		leg.position = Vector3(0.12 * side, -0.14, 0)
		bones["leg_" + s] = leg
		_add_capsule(leg, mat_pants, 0.1, 0.38, Vector3(0, -0.2, 0))
		var shin := Node3D.new()
		leg.add_child(shin)
		shin.position = Vector3(0, -0.44, 0)
		bones["shin_" + s] = shin
		_add_capsule(shin, mat_pants, 0.085, 0.34, Vector3(0, -0.18, 0))
		_add_box(shin, _mk_mat(Color(0.1, 0.1, 0.1), 0.6), Vector3(0.12, 0.08, 0.26), Vector3(0, -0.38, -0.04))


func _mk_mat(color: Color, rough: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	_mats.append(m)
	return m


func _add_capsule(parent: Node3D, mat: Material, r: float, h: float, off: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var cm := CapsuleMesh.new()
	cm.radius = r
	cm.height = h
	mi.mesh = cm
	mi.material_override = mat
	mi.position = off
	parent.add_child(mi)


func _add_box(parent: Node3D, mat: Material, size: Vector3, off: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = off
	parent.add_child(mi)


func _apply_flash() -> void:
	var on := _flash_t > 0.0
	for m in _mats:
		var sm: StandardMaterial3D = m
		if on:
			if not sm.get_meta("flash_saved", false):
				sm.set_meta("em_enabled", sm.emission_enabled)
				sm.set_meta("em_color", sm.emission)
				sm.set_meta("em_mult", sm.emission_energy_multiplier)
				sm.set_meta("flash_saved", true)
			sm.emission_enabled = true
			sm.emission = Color(1.0, 1.0, 1.0)
			sm.emission_energy_multiplier = 1.0
		elif sm.get_meta("flash_saved", false):
			sm.emission_enabled = sm.get_meta("em_enabled")
			sm.emission = sm.get_meta("em_color")
			sm.emission_energy_multiplier = sm.get_meta("em_mult")
			sm.set_meta("flash_saved", false)


# ------------------------------------------------------------------ anim

func _update_anim(delta: float) -> void:
	var speed_h := Vector3(velocity.x, 0, velocity.z).length()
	if speed_h > 0.5 and is_on_floor():
		_run_phase += speed_h * delta * 1.4
	var t := {}
	t["chest"] = Vector3(0.0, 0, 0)
	t["arm_l"] = Vector3(0.1, 0, 0.1)
	t["arm_r"] = Vector3(0.1, 0, -0.1)
	t["fore_l"] = Vector3(-0.3, 0, 0)
	t["fore_r"] = Vector3(-0.3, 0, 0)
	t["leg_l"] = Vector3(0, 0, 0.02)
	t["leg_r"] = Vector3(0, 0, -0.02)
	t["shin_l"] = Vector3(0.05, 0, 0)
	t["shin_r"] = Vector3(0.05, 0, 0)
	t["model_x"] = 0.0
	if state == S.DEFEATED:
		t["model_x"] = -PI / 2.0
		t["chest"] = Vector3(0.2, 0, 0)
		t["arm_l"] = Vector3(0.4, 0, 0.5)
		t["arm_r"] = Vector3(0.4, 0, -0.5)
	elif state == S.PATROL or state == S.ALERT:
		var br := sin(_anim_time * 2.0) * 0.02
		t["chest"] = Vector3(0.04 + br, 0, 0)
		if state == S.ALERT:
			t["arm_l"] = Vector3(0.5, 0, 0.3)
			t["arm_r"] = Vector3(0.5, 0, -0.3)
	elif state == S.WINDUP or state == S.R_WINDUP:
		var k := clampf(state_t / 0.55, 0.0, 1.0)
		t["arm_r"] = Vector3(lerpf(0.1, 2.7, k), 0, -0.2)
		t["fore_r"] = Vector3(lerpf(-0.3, -0.5, k), 0, 0)
		t["chest"] = Vector3(0.1, lerpf(0.0, 0.4, k), 0)
		if state == S.R_WINDUP:
			t["arm_l"] = Vector3(1.5, 0, 0.2)
			t["fore_l"] = Vector3(0.1, 0, 0)
	elif state == S.ACTIVE or state == S.R_ACTIVE:
		t["arm_r"] = Vector3(1.5, 0, -0.1)
		t["fore_r"] = Vector3(0.05, 0, 0)
		t["chest"] = Vector3(0.2, -0.4, 0)
		if state == S.R_ACTIVE:
			t["arm_l"] = Vector3(1.5, 0, 0.2)
			t["fore_l"] = Vector3(0.1, 0, 0)
	elif state == S.CHARGE:
		t["arm_l"] = Vector3(-1.6, 0, 0.4)
		t["arm_r"] = Vector3(-1.6, 0, -0.4)
		t["chest"] = Vector3(0.5, 0, 0)
		t["leg_l"] = Vector3(0.8, 0, 0.1)
		t["leg_r"] = Vector3(-0.5, 0, -0.1)
	elif state == S.HITSTUN:
		t["chest"] = Vector3(-0.5, 0, 0)
		t["arm_l"] = Vector3(-0.6, 0, 0.5)
		t["arm_r"] = Vector3(-0.6, 0, -0.5)
	elif not is_on_floor() or speed_h > 0.5:
		var ph := _run_phase
		var amp := clampf(speed_h / 5.0, 0.2, 1.0)
		t["leg_l"] = Vector3(sin(ph) * 0.9 * amp, 0, 0)
		t["leg_r"] = Vector3(sin(ph + PI) * 0.9 * amp, 0, 0)
		t["shin_l"] = Vector3(maxf(0.0, -sin(ph - 0.7)) * 1.1 * amp, 0, 0)
		t["shin_r"] = Vector3(maxf(0.0, -sin(ph + PI - 0.7)) * 1.1 * amp, 0, 0)
		t["arm_l"] = Vector3(sin(ph + PI) * 0.7 * amp, 0, 0.12)
		t["arm_r"] = Vector3(sin(ph) * 0.7 * amp, 0, -0.12)
		t["fore_l"] = Vector3(-0.5, 0, 0)
		t["fore_r"] = Vector3(-0.5, 0, 0)
		t["chest"] = Vector3(0.15, 0, 0)
	var k := 1.0 - exp(-12.0 * delta)
	for joint in bones:
		var j: Node3D = bones[joint]
		var target: Vector3 = t.get(joint, Vector3.ZERO)
		j.rotation = Vector3(
			lerp_angle(j.rotation.x, target.x, k),
			lerp_angle(j.rotation.y, target.y, k),
			lerp_angle(j.rotation.z, target.z, k)
		)
	model.rotation.x = lerp_angle(model.rotation.x, t.get("model_x", 0.0), 1.0 - exp(-10.0 * delta))
