extends CharacterBody3D
## ARACHNID — third-person kinematic controller.
## Systems: ground/air movement, pendulum web-swing (rope constraint),
## wall-crawl/cling, point-zip & web-strike, i-frame dodge, 3-hit combo,
## lock-on, spring-arm camera with velocity FOV, procedural animation.

const CITY := 1
const PLAYER_LAYER := 2
const ENEMY_LAYER := 4

const GRAVITY := 26.0
const MAX_FALL := 42.0
const WALK_SPEED := 7.0
const SPRINT_SPEED := 11.5
const GROUND_ACCEL := 55.0
const AIR_ACCEL := 22.0
const JUMP_VEL := 10.2
const COYOTE := 0.12
const JUMP_BUFFER := 0.14

const ROPE_MIN := 3.0
const ROPE_MAX := 62.0
const SWING_GRAVITY := 24.0
const RELEASE_BOOST := 4.5
const RELEASE_LIFT := 2.2

const WALL_OFFSET := 0.55
const WALL_SPEED := 4.4
const WALL_SPRINT_SPEED := 6.2
const WALL_JUMP_OUT := 5.5
const WALL_JUMP_UP := 4.6

const ZIP_TIME := 0.34
const STRIKE_TIME := 0.30
const DODGE_TIME := 0.28
const DODGE_SPEED := 9.0

const MAX_HEALTH := 100.0
const FLUID_MAX := 100.0
const FLUID_REGEN := 22.0
const SWING_FLUID_DRAIN := 11.0
const WALL_FLUID_DRAIN := 5.0
const ZIP_COST := 18.0
const STRIKE_COST := 15.0
const REGEN_DELAY := 5.0

enum Pose { IDLE, RUN, AIR, SWING, WALL, LAND, PERCH, DODGE, ZIP, DOWN }

# camera
var cam_yaw := 0.0
var cam_pitch := -0.1
var cam_dist := 4.4
var cam_fov := 62.0
var shake_t := 0.0
var shake_amp := 0.0
var cam_target: Camera3D
var lock_target: Node3D = null
var lock_timer := 0.0

# swing
var swinging := false
var anchor := Vector3.ZERO
var rope_len := 8.0

# wall
var on_wall := false
var wall_normal := Vector3.UP
var wall_surf_pos := Vector3.ZERO

# zip / strike
var zipping := false
var zip_from := Vector3.ZERO
var zip_to := Vector3.ZERO
var zip_t := 0.0
var zip_duration := ZIP_TIME
var zip_is_strike := false
var zip_strike_target: Node = null

# dodge
var dodging := false
var dodge_dir := Vector3.ZERO
var dodge_t := 0.0
var invuln_t := 0.0

# combat
var attacking := false
var attack_t := 0.0
var attack_combo := 0
var attack_queued := false
var _hitbox_on := false
var _hit_set: Array = []
var atk_dir := Vector3.FORWARD

# health / fluid
var health := MAX_HEALTH
var fluid := FLUID_MAX
var last_dmg_t := 99.0

# anim state
var run_phase := 0.0
var land_t := 0.0
var perch_t := 0.0
var _was_air := false
var _max_fall := 0.0
var _coyote := 0.0
var _jump_buf := 0.0
var _anim_time := 0.0
var target_yaw := 0.0
var yaw_rate := 10.0
var current_pose: int = Pose.IDLE
var lens_scale := 1.0

# nodes
var model: Node3D
var bones: Dictionary = {}
var eye_l: MeshInstance3D
var eye_r: MeshInstance3D
var web_line: MeshInstance3D
var web_line2: MeshInstance3D
var attack_area: Area3D
var hand_l_node: Node3D
var hand_r_node: Node3D


func _ready() -> void:
	collision_layer = PLAYER_LAYER
	collision_mask = CITY | ENEMY_LAYER
	floor_max_angle = deg_to_rad(45.0)
	_build_model()
	_build_camera()
	_build_areas()
	# initial camera placement
	cam_target.global_position = global_position + Vector3(0, 1.5, 5.0)
	GameManager.register_player(self)


func _build_model() -> void:
	model = Node3D.new()
	model.name = "Model"
	model.scale = Vector3(0.93, 0.93, 0.93)
	add_child(model)

	# suit fabrics (procedural: base color + web lattice, see Proctex.make_suit)
	var suit_col := Color(0.075, 0.145, 0.29)
	var suit_web := Color(0.012, 0.02, 0.03)
	var mat_suit := StandardMaterial3D.new()
	mat_suit.albedo_texture = Proctex.make_suit(suit_col, suit_web, 256, 256)
	mat_suit.roughness = 0.58
	var mat_mask := StandardMaterial3D.new()
	mat_mask.albedo_texture = Proctex.make_suit(suit_col.darkened(0.12), suit_web, 256, 256)
	mat_mask.roughness = 0.42
	var mat_accent := StandardMaterial3D.new()
	mat_accent.albedo_texture = Proctex.make_suit(Color(0.66, 0.09, 0.11), Color(0.16, 0.02, 0.03), 128, 128)
	mat_accent.roughness = 0.5
	var mat_lens := StandardMaterial3D.new()
	mat_lens.albedo_color = Color(0.95, 0.97, 1.0)
	mat_lens.emission_enabled = true
	mat_lens.emission = Color(0.85, 0.92, 1.0)
	mat_lens.emission_energy_multiplier = 3.2
	var mat_metal := StandardMaterial3D.new()
	mat_metal.albedo_color = Color(0.35, 0.37, 0.40)
	mat_metal.metallic = 0.85
	mat_metal.roughness = 0.35
	var mat_emblem := StandardMaterial3D.new()
	mat_emblem.albedo_color = Color(0.02, 0.02, 0.025)
	mat_emblem.roughness = 0.38
	var mat_led := StandardMaterial3D.new()
	mat_led.albedo_color = Color(0.4, 0.02, 0.02)
	mat_led.emission_enabled = true
	mat_led.emission = Color(1.0, 0.12, 0.08)
	mat_led.emission_energy_multiplier = 2.5

	var hips := Node3D.new()
	hips.name = "Hips"
	model.add_child(hips)
	hips.position = Vector3(0, 1.0, 0)
	bones["hips"] = hips
	_add_box(hips, Vector3(0.34, 0.26, 0.22), mat_accent, Vector3(0, -0.02, 0))

	var chest := Node3D.new()
	chest.name = "Chest"
	hips.add_child(chest)
	chest.position = Vector3(0, 0.32, 0)
	bones["chest"] = chest
	_add_capsule(chest, 0.27, 0.5, mat_suit, Vector3(0, 0.05, 0))
	_add_box(chest, Vector3(0.17, 0.17, 0.05), mat_accent, Vector3(0, 0.08, -0.26))
	_add_spider(chest, mat_emblem)

	var head := Node3D.new()
	head.name = "Head"
	chest.add_child(head)
	head.position = Vector3(0, 0.42, 0)
	bones["head"] = head
	var head_mi := MeshInstance3D.new()
	var hm := SphereMesh.new()
	hm.radius = 0.2
	hm.height = 0.4
	head_mi.mesh = hm
	head_mi.material_override = mat_mask
	head.add_child(head_mi)
	eye_l = _add_box(head, Vector3(0.105, 0.06, 0.045), mat_lens, Vector3(-0.08, 0.035, -0.165))
	eye_r = _add_box(head, Vector3(0.105, 0.06, 0.045), mat_lens, Vector3(0.08, 0.035, -0.165))
	eye_l.rotation_degrees = Vector3(0, 18, -20)
	eye_r.rotation_degrees = Vector3(0, -18, 20)

	for side in [-1.0, 1.0]:
		var s := "l" if side < 0.0 else "r"
		var arm := Node3D.new()
		arm.name = "Arm" + s
		chest.add_child(arm)
		arm.position = Vector3(0.33 * side, 0.30, 0)
		bones["arm_" + s] = arm
		_add_capsule(arm, 0.085, 0.34, mat_suit, Vector3(0, -0.17, 0))
		var fore := Node3D.new()
		fore.name = "Fore" + s
		arm.add_child(fore)
		fore.position = Vector3(0, -0.34, 0)
		bones["fore_" + s] = fore
		_add_capsule(fore, 0.075, 0.30, mat_suit, Vector3(0, -0.15, 0))
		# wrist web-shooter: forward barrel + red fluid light
		_add_box(fore, Vector3(0.1, 0.12, 0.1), mat_metal, Vector3(0, -0.29, -0.01))
		var barrel := _add_box(fore, Vector3(0.05, 0.05, 0.14), mat_metal, Vector3(0.045 * side, -0.29, -0.07))
		barrel.name = "Shooter" + s
		_add_box(fore, Vector3(0.02, 0.02, 0.012), mat_led, Vector3(0.045 * side, -0.29, -0.14))
		var hand := Node3D.new()
		hand.name = "Hand" + s
		fore.add_child(hand)
		hand.position = Vector3(0, -0.32, -0.02)
		_add_box(hand, Vector3(0.095, 0.1, 0.11), mat_accent, Vector3(0, -0.01, -0.005))
		if side < 0.0:
			hand_l_node = hand
		else:
			hand_r_node = hand

	for side in [-1.0, 1.0]:
		var s := "l" if side < 0.0 else "r"
		var leg := Node3D.new()
		leg.name = "Leg" + s
		hips.add_child(leg)
		leg.position = Vector3(0.12 * side, -0.16, 0)
		bones["leg_" + s] = leg
		_add_capsule(leg, 0.105, 0.40, mat_suit, Vector3(0, -0.22, 0))
		var shin := Node3D.new()
		shin.name = "Shin" + s
		leg.add_child(shin)
		shin.position = Vector3(0, -0.46, 0)
		bones["shin_" + s] = shin
		_add_capsule(shin, 0.085, 0.36, mat_suit, Vector3(0, -0.19, 0))
		# crimson boot
		_add_box(shin, Vector3(0.125, 0.1, 0.26), mat_accent, Vector3(0, -0.34, -0.04))
		_add_box(shin, Vector3(0.11, 0.07, 0.14), mat_accent, Vector3(0, -0.34, -0.19))

	# web lines (unit cylinder from base, +Y along the line)
	var web_mat := StandardMaterial3D.new()
	web_mat.albedo_color = Color(0.92, 0.93, 0.95)
	web_mat.emission_enabled = true
	web_mat.emission = Color(0.8, 0.85, 0.9)
	web_mat.emission_energy_multiplier = 0.6
	var wm := Proctex.unit_cyl_from_base(0.04)
	web_line = MeshInstance3D.new()
	web_line.mesh = wm
	web_line.material_override = web_mat
	web_line.visible = false
	add_child(web_line)
	web_line2 = MeshInstance3D.new()
	web_line2.mesh = wm
	web_line2.material_override = web_mat
	web_line2.visible = false
	add_child(web_line2)

	# body collision
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.42
	cap.height = 1.8
	cs.shape = cap
	cs.position = Vector3(0, 0.9, 0)
	add_child(cs)


func _add_capsule(parent: Node3D, r: float, h: float, mat: Material, off: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CapsuleMesh.new()
	cm.radius = r
	cm.height = h
	mi.mesh = cm
	mi.material_override = mat
	mi.position = off
	parent.add_child(mi)
	return mi


func _add_box(parent: Node3D, size: Vector3, mat: Material, off: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = off
	parent.add_child(mi)
	return mi


## Small 3D spider emblem on the chest (body + head + 6 legs).
func _add_spider(parent: Node3D, mat: Material) -> void:
	var sp := Node3D.new()
	sp.name = "Spider"
	parent.add_child(sp)
	sp.position = Vector3(0, 0.2, -0.255)
	var body := MeshInstance3D.new()
	var bm := SphereMesh.new()
	bm.radius = 0.038
	bm.height = 0.076
	body.mesh = bm
	body.material_override = mat
	body.position = Vector3(0, -0.022, 0)
	sp.add_child(body)
	var headm := MeshInstance3D.new()
	var hm := SphereMesh.new()
	hm.radius = 0.024
	hm.height = 0.048
	headm.mesh = hm
	headm.material_override = mat
	headm.position = Vector3(0, 0.018, 0.002)
	sp.add_child(headm)
	for side in [-1.0, 1.0]:
		for k in 3:
			var leg := MeshInstance3D.new()
			var lm := CylinderMesh.new()
			lm.top_radius = 0.0045
			lm.bottom_radius = 0.0045
			lm.height = 0.085
			leg.mesh = lm
			leg.material_override = mat
			leg.rotation_degrees = Vector3(0, 0, -side * (45.0 + float(k) * 30.0))
			leg.position = Vector3(0, 0.014, 0)
			sp.add_child(leg)


func _build_camera() -> void:
	cam_target = Camera3D.new()
	cam_target.name = "PlayerCamera"
	cam_target.near = 0.1
	cam_target.far = 500.0
	cam_target.fov = cam_fov
	cam_target.current = false
	add_child(cam_target)


func _build_areas() -> void:
	attack_area = Area3D.new()
	attack_area.collision_layer = 0
	attack_area.collision_mask = ENEMY_LAYER
	attack_area.monitoring = false
	add_child(attack_area)
	var as_ := CollisionShape3D.new()
	var ab := BoxShape3D.new()
	ab.size = Vector3(1.2, 1.2, 1.5)
	as_.shape = ab
	as_.position = Vector3(0, 0.2, -1.25)
	attack_area.add_child(as_)
	attack_area.body_entered.connect(_on_attack_hit)

	# body hitbox so enemy attacks / projectiles can hit us
	var hurt := Area3D.new()
	hurt.collision_layer = PLAYER_LAYER
	hurt.collision_mask = 0
	hurt.monitoring = false
	hurt.monitorable = true
	add_child(hurt)
	var hs := CollisionShape3D.new()
	var hc := CapsuleShape3D.new()
	hc.radius = 0.45
	hc.height = 1.8
	hs.shape = hc
	hs.position = Vector3(0, 0.9, 0)
	hurt.add_child(hs)


# ------------------------------------------------------------------ input

func _unhandled_input(event: InputEvent) -> void:
	if GameManager.mode != GameManager.Mode.PLAY:
		if event.is_action_pressed("pause"):
			GameManager.toggle_pause()
		return

	if event is InputEventMouseMotion:
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			var m := event as InputEventMouseMotion
			var sens: float = (0.0021 if swinging else 0.003) * GameManager.settings["sens"]
			cam_yaw -= m.relative.x * sens
			cam_pitch = clampf(cam_pitch - m.relative.y * sens, -1.05, 1.25)
	elif event is InputEventJoypadMotion:
		var jm := event as InputEventJoypadMotion
		# InputEventJoypadMotion has no delta_time: apply the stick offset per event
		# using the frame delta so pad sensitivity matches mouse sensitivity.
		var jsens: float = 2.4 * get_process_delta_time() * GameManager.settings["sens"]
		if jm.axis == JOY_AXIS_RIGHT_X:
			cam_yaw -= jm.axis_value * jsens
		elif jm.axis == JOY_AXIS_RIGHT_Y:
			cam_pitch = clampf(cam_pitch - jm.axis_value * jsens, -1.05, 1.25)
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed:
			if mb.button_index == MOUSE_BUTTON_WHEEL_UP:
				_zoom(-0.35)
			elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
				_zoom(0.35)

	if event.is_action_pressed("jump"):
		_jump_buf = JUMP_BUFFER
	if event.is_action_pressed("attack"):
		if not zipping and not dodging:
			if not attacking:
				_start_attack(0)
			else:
				attack_queued = true
	if event.is_action_pressed("web_swing"):
		if not zipping and not dodging and not swinging:
			_try_start_swing()
	if event.is_action_pressed("zip"):
		if not zipping and not swinging and not dodging and not attacking:
			_try_zip()
	if event.is_action_pressed("web_strike"):
		if not zipping and not swinging and not dodging:
			_try_strike()
	if event.is_action_pressed("dodge"):
		if not zipping and not dodging:
			_start_dodge()
	if event.is_action_pressed("lockon"):
		_toggle_lock()
	if event.is_action_pressed("pause"):
		GameManager.toggle_pause()


func _zoom(dz: float) -> void:
	if swinging:
		rope_len = clampf(rope_len + dz * 8.0, ROPE_MIN, _rope_max())
	else:
		cam_dist = clampf(cam_dist + dz, 2.4, 8.0)


func _read_input_dir() -> Vector3:
	var v := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	if v.length() < 0.1:
		return Vector3.ZERO
	var fwd := Vector3(-sin(cam_yaw), 0, -cos(cam_yaw))
	var right := Vector3(-fwd.z, 0, fwd.x)
	return (fwd * v.y + right * v.x).normalized()


func _set_target_yaw(dir: Vector3, rate: float) -> void:
	if dir.length() < 0.05:
		return
	target_yaw = atan2(-dir.x, -dir.z)
	yaw_rate = rate


# ------------------------------------------------------------------ physics

func _physics_process(delta: float) -> void:
	_anim_time += delta

	# timers
	if combo_timer > 0.0:
		combo_timer -= delta
		if combo_timer <= 0.0:
			combo_count = 0
	lock_timer -= delta
	if lock_target == null or not is_instance_valid(lock_target):
		lock_target = null
	invuln_t = maxf(invuln_t - delta, 0.0)
	land_t = maxf(land_t - delta, 0.0)
	_jump_buf = maxf(_jump_buf - delta, 0.0)
	if not is_on_floor():
		_coyote = maxf(_coyote - delta, 0.0)

	var playing := GameManager.mode == GameManager.Mode.PLAY
	var input_dir := _read_input_dir() if playing else Vector3.ZERO
	var sprinting := playing and Input.is_action_pressed("sprint")

	if not playing:
		velocity = Vector3.ZERO
		if not is_on_floor():
			velocity.y -= GRAVITY * delta
	else:
		if zipping:
			_zip_step(delta)
		elif dodging:
			_dodge_step(delta)
		elif swinging:
			_swing_step(delta)
		elif on_wall:
			_wall_step(delta, input_dir, sprinting)
		else:
			_move_step(delta, input_dir, sprinting)
		if attacking:
			_advance_attack(delta)
		# jump
		if _jump_buf > 0.0:
			if on_wall:
				_wall_jump(input_dir)
			elif is_on_floor() or _coyote > 0.0:
				velocity.y = JUMP_VEL
				_jump_buf = 0.0
				_coyote = 0.0
	move_and_slide()
	_post_move(delta, playing)


var combo_count := 0
var combo_timer := 0.0


func _move_step(delta: float, input_dir: Vector3, sprinting: bool) -> void:
	var on_floor := is_on_floor()
	var target_speed := SPRINT_SPEED if sprinting else WALK_SPEED
	var flat := Vector3(velocity.x, 0, velocity.z)
	if attacking:
		flat = flat.move_toward(Vector3.ZERO, 60.0 * delta)
	elif on_floor:
		var target := input_dir * target_speed
		flat = flat.move_toward(target, GROUND_ACCEL * delta)
		if flat.length() > target_speed:
			flat = flat.normalized() * target_speed
	else:
		var target := input_dir * target_speed * 0.92
		flat = flat.move_toward(target, AIR_ACCEL * delta)
	velocity.x = flat.x
	velocity.z = flat.z
	velocity.y -= GRAVITY * delta
	velocity.y = maxf(velocity.y, -MAX_FALL)
	if not attacking and input_dir.length() > 0.1:
		_set_target_yaw(input_dir, 12.0 if on_floor else 8.0)


func _swing_step(delta: float) -> void:
	# rope length control: W extend / S retract
	var len_dir := 0.0
	if Input.is_action_pressed("move_forward"):
		len_dir = 1.0
	elif Input.is_action_pressed("move_back"):
		len_dir = -1.0
	if len_dir != 0.0:
		rope_len = clampf(rope_len + len_dir * 18.0 * delta, ROPE_MIN, _rope_max())
	if not Input.is_action_pressed("web_swing"):
		_release_swing()
		return
	velocity.y -= SWING_GRAVITY * delta
	velocity = velocity.limit_length(42.0)
	var horiz := anchor - global_position
	_set_target_yaw(Vector3(horiz.x, 0, horiz.z), 10.0)


func _rope_max() -> float:
	return minf(ROPE_MAX, anchor.distance_to(global_position) * 0.95)


func _try_start_swing() -> void:
	if fluid <= 5.0:
		return
	var from := global_position + Vector3(0, 1.4, 0)
	var dirv := -cam_target.global_transform.basis.z
	var found: Dictionary = _ray_city(from, from + dirv * 70.0)
	if not found or found["position"].y < from.y - 2.5:
		var up2 := dirv.lerp(Vector3.UP, 0.5).normalized()
		var f2: Dictionary = _ray_city(from, from + up2 * 70.0)
		if f2 and f2["position"].y > from.y - 1.0:
			found = f2
	if not found:
		return
	var d := (found["position"] as Vector3).distance_to(from)
	if d < 2.5 or d > ROPE_MAX:
		return
	anchor = found["position"]
	rope_len = clampf(d * 0.92, ROPE_MIN, ROPE_MAX)
	swinging = true
	AudioMan.play_sfx("web_shoot", global_position, randf_range(0.95, 1.05), -4.0)
	AudioMan.play_sfx("web_hit", anchor, 1.0, -8.0)


func _release_swing() -> void:
	swinging = false
	var sp := velocity.length()
	if sp > 3.0:
		velocity += velocity.normalized() * RELEASE_BOOST * minf(sp / 20.0, 1.0)
	velocity += Vector3.UP * RELEASE_LIFT
	AudioMan.play_sfx("web_shoot", global_position, 1.15, -10.0)


func _wall_step(delta: float, input_dir: Vector3, sprinting: bool) -> void:
	var mv := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var up := Vector3.UP
	var side := wall_normal.cross(up)
	if side.length() < 0.5:
		side = Vector3.RIGHT
	side = side.normalized()
	var sp := WALL_SPRINT_SPEED if sprinting else WALL_SPEED
	var target := up * mv.y * sp + side * mv.x * sp
	if attacking:
		target = Vector3.ZERO
	var pv := velocity - wall_normal * velocity.dot(wall_normal)
	var maxs := maxf(sp, pv.length() * 0.85)
	if target.length() > maxs:
		target = target.normalized() * maxs
	velocity = pv.move_toward(target, 38.0 * delta)
	# face along the movement, or the wall when idle
	var mvv := up * mv.y + side * mv.x
	if not attacking:
		_set_target_yaw(mvv if mvv.length() > 0.3 else wall_normal, 10.0)


func _wall_jump(input_dir: Vector3) -> void:
	var face := input_dir
	if face.length() < 0.1:
		face = -global_transform.basis.z
	_detach_wall()
	velocity = wall_normal * WALL_JUMP_OUT + Vector3.UP * WALL_JUMP_UP + Vector3(face.x, 0, face.z) * 2.0
	_jump_buf = 0.0
	AudioMan.play_sfx("web_shoot", global_position, 0.9, -12.0)


func _try_attach_wall() -> void:
	var head := global_position + Vector3(0, 1.25, 0)
	var fwd := -global_transform.basis.z
	var dirs := [fwd, fwd.rotated(Vector3.UP, deg_to_rad(28.0)), fwd.rotated(Vector3.UP, deg_to_rad(-16.0))]
	for dirc in dirs:
		var res: Dictionary = _ray_city(head, head + dirc * 1.7)
		if res:
			var nrm: Vector3 = res["normal"]
			if absf(nrm.y) < 0.35 and velocity.dot(nrm) < 1.5:
				on_wall = true
				wall_normal = nrm.normalized()
				wall_surf_pos = res["position"]
				global_position = res["position"] + wall_normal * WALL_OFFSET
				velocity -= wall_normal * velocity.dot(wall_normal)
				AudioMan.play_sfx("scuff", global_position, randf_range(0.9, 1.1), -14.0)
				return


func _hold_wall() -> void:
	var qpos := wall_surf_pos + wall_normal * 0.15
	var res: Dictionary = _ray_city(qpos - wall_normal * 2.5, qpos)
	if not res:
		_detach_wall()
		return
	wall_surf_pos = res["position"]
	var nrm: Vector3 = res["normal"]
	if nrm.dot(wall_normal) < 0.75:
		wall_normal = nrm.normalized()
	global_position = global_position.lerp(wall_surf_pos + wall_normal * WALL_OFFSET, 0.5)
	velocity -= wall_normal * velocity.dot(wall_normal)


func _detach_wall() -> void:
	on_wall = false


func _zip_step(delta: float) -> void:
	zip_t += delta
	var k := minf(zip_t / zip_duration, 1.0)
	var e := k * k * (3.0 - 2.0 * k)
	global_position = zip_from.lerp(zip_to, e)
	velocity = Vector3.ZERO
	var to_dir := Vector3(zip_to.x - global_position.x, 0, zip_to.z - global_position.z)
	_set_target_yaw(to_dir, 20.0)
	if k >= 1.0:
		zipping = false
		if zip_is_strike:
			_strike_impact()
		else:
			velocity += Vector3.UP * 2.0


func _try_zip() -> void:
	if fluid < ZIP_COST:
		return
	var from := global_position + Vector3(0, 1.3, 0)
	var dirv := -cam_target.global_transform.basis.z
	var res: Dictionary = _ray_city(from, from + dirv * 90.0)
	if not res:
		return
	var d := (res["position"] as Vector3).distance_to(from)
	if d < 3.0:
		return
	fluid = maxf(fluid - ZIP_COST, 0.0)
	_start_zip(res["position"] + res["normal"] * 0.9, ZIP_TIME)
	AudioMan.play_sfx("zip", global_position, 1.0, -4.0)


func _try_strike() -> void:
	if fluid < STRIKE_COST:
		return
	var target: Node = null
	if lock_target != null and is_instance_valid(lock_target) and lock_target.has_method("take_damage"):
		var d := (lock_target as Node3D).global_position.distance_to(global_position)
		if d >= 2.0 and d <= 35.0:
			target = lock_target
	if target == null:
		var cam_dir := -cam_target.global_transform.basis.z
		var best_d := 35.0
		for e in get_tree().get_nodes_in_group("enemies"):
			var en: Node = e
			if not is_instance_valid(en) or not en.has_method("take_damage"):
				continue
			var to: Vector3 = (en as Node3D).global_position - global_position
			if to.length() > best_d:
				continue
			if to.normalized().dot(cam_dir) < 0.92:
				continue
			best_d = to.length()
			target = en
	if target == null:
		_try_zip()
		return
	fluid = maxf(fluid - STRIKE_COST, 0.0)
	var to: Vector3 = (target as Node3D).global_position + Vector3(0, 0.7, 0)
	_start_zip(to, STRIKE_TIME, target)
	AudioMan.play_sfx("zip", global_position, 1.2, -4.0)


func _start_zip(to: Vector3, dur: float, strike_target: Node = null) -> void:
	zipping = true
	zip_is_strike = strike_target != null
	zip_strike_target = strike_target
	zip_from = global_position
	zip_to = to
	zip_duration = dur
	zip_t = 0.0
	velocity = Vector3.ZERO
	if on_wall:
		_detach_wall()


func _strike_impact() -> void:
	var t: Node = zip_strike_target
	zip_strike_target = null
	if is_instance_valid(t) and t.has_method("take_damage"):
		var tn: Variant = t
		if tn.global_position.distance_to(global_position) < 3.5:
			var dirv: Vector3 = (global_position - tn.global_position).normalized()
			tn.take_damage(24.0, dirv * 8.0 + Vector3.UP * 3.0, true)
			combo_count += 1
			combo_timer = 4.0
			GameManager.add_score(20 * combo_count)
			GameManager.stats["max_combo"] = maxf(GameManager.stats["max_combo"], float(combo_count))
			AudioMan.play_sfx("hit_heavy", tn.global_position, 1.0, -4.0)
			TimeCtrl.do_hitstop(0.06)
			_shake(0.3)
			Fx.spawn_hit_spark(tn.global_position, true)
			velocity += Vector3.UP * 3.0
		else:
			velocity += Vector3.UP * 2.0
	else:
		velocity += Vector3.UP * 2.0


func _start_dodge() -> void:
	if swinging:
		_release_swing()
	if on_wall:
		_detach_wall()
	var d := _read_input_dir()
	if d.length() < 0.1:
		d = -global_transform.basis.z
	dodging = true
	dodge_t = 0.0
	dodge_dir = Vector3(d.x, 0, d.z).normalized()
	invuln_t = 0.42
	_set_target_yaw(dodge_dir, 14.0)
	AudioMan.play_sfx("dodge", global_position, randf_range(0.9, 1.15), -8.0)


func _dodge_step(delta: float) -> void:
	dodge_t += delta
	velocity = Vector3(dodge_dir.x, 0, dodge_dir.z) * DODGE_SPEED
	if is_on_floor():
		velocity.y = 3.0
	if dodge_t >= DODGE_TIME:
		dodging = false


# ------------------------------------------------------------------ combat

func _start_attack(combo_idx: int) -> void:
	if zipping or dodging:
		return
	if swinging:
		_release_swing()
	attacking = true
	attack_t = 0.0
	attack_combo = combo_idx
	if lock_target != null and is_instance_valid(lock_target):
		var tp := (lock_target as Node3D).global_position + Vector3(0, 0.6, 0)
		atk_dir = Vector3(tp.x - global_position.x, 0, tp.z - global_position.z)
	else:
		var cam_dir := -cam_target.global_transform.basis.z
		atk_dir = Vector3(cam_dir.x, 0, cam_dir.z)
		if atk_dir.length() < 0.1:
			atk_dir = -global_transform.basis.z
	atk_dir = atk_dir.normalized()
	_set_target_yaw(atk_dir, 25.0)


func _atk_windup() -> float:
	return 0.18 if attack_combo == 2 else 0.10


func _atk_active() -> float:
	return 0.10 if attack_combo == 2 else 0.08


func _atk_recovery() -> float:
	return 0.26 if attack_combo == 2 else 0.16


func _advance_attack(delta: float) -> void:
	attack_t += delta
	var w := _atk_windup()
	var a := _atk_active()
	var r := _atk_recovery()
	var on := attack_t >= w and attack_t < w + a
	if on != _hitbox_on:
		_hitbox_on = on
		attack_area.set_deferred("monitoring", on)
		if on:
			_hit_set.clear()
	if attack_t >= w + a + r:
		var queued := attack_queued
		attack_queued = false
		attacking = false
		if queued:
			_start_attack((attack_combo + 1) % 3)


func _on_attack_hit(body: Node) -> void:
	if not _hit_set.has(body):
		_hit_set.append(body)
		var heavy := attack_combo == 2
		var dmg := 24.0 if heavy else 12.0
		var kb := atk_dir * (7.0 if heavy else 3.5) + Vector3.UP * (3.0 if heavy else 0.8)
		var b: Variant = body
		if body.has_method("take_damage"):
			b.take_damage(dmg, kb, heavy)
		combo_count += 1
		combo_timer = 4.0
		GameManager.add_score(10 * combo_count)
		GameManager.stats["max_combo"] = maxf(GameManager.stats["max_combo"], float(combo_count))
		AudioMan.play_sfx("hit_heavy" if heavy else "hit_light", (body as Node3D).global_position, randf_range(0.92, 1.1), -4.0)
		AudioMan.play_sfx("combo", Vector3.INF, 1.0 + minf(combo_count, 10) * 0.08, -12.0)
		TimeCtrl.do_hitstop(0.055 if heavy else 0.025)
		_shake(0.3 if heavy else 0.12)
		Fx.spawn_hit_spark((body as Node3D).global_position, heavy)


func take_damage(amount: float, dir: Vector3, heavy: bool = false) -> void:
	if GameManager.mode != GameManager.Mode.PLAY:
		return
	if invuln_t > 0.0 or zipping:
		return
	health = maxf(health - amount, 0.0)
	last_dmg_t = 0.0
	combo_count = 0
	AudioMan.play_sfx("hurt", global_position, randf_range(0.9, 1.1), -4.0)
	_shake(0.55 if heavy else 0.35)
	GameManager.on_player_hurt(amount)
	if is_on_floor():
		velocity += dir * 5.0 + Vector3.UP * 1.5
	else:
		velocity += dir * 3.0
	if health <= 0.0:
		GameManager.player_defeated()


func _toggle_lock() -> void:
	if lock_target != null and is_instance_valid(lock_target):
		lock_target = null
		return
	var cam_dir := -cam_target.global_transform.basis.z
	var best: Node3D = null
	var best_d := 30.0
	for e in get_tree().get_nodes_in_group("enemies"):
		var en = e
		if not is_instance_valid(en):
			continue
		if en.has_method("is_hostile") and not en.is_hostile():
			continue
		var to: Vector3 = en.global_position - global_position
		var d := to.length()
		if d > best_d:
			continue
		if d > 1.0 and to.normalized().dot(cam_dir) < 0.5:
			continue
		best_d = d
		best = en
	lock_target = best
	if best != null:
		lock_timer = 4.0


func _shake(amp: float) -> void:
	shake_amp = maxf(shake_amp, amp)
	shake_t = 0.35


func _ray_city(from: Vector3, to: Vector3, mask: int = CITY) -> Dictionary:
	var q := PhysicsRayQueryParameters3D.create(from, to, mask)
	q.exclude = [get_rid()]
	return get_world_3d().direct_space_state.intersect_ray(q)


# ------------------------------------------------------------------ post move

func _post_move(delta: float, playing: bool) -> void:
	var on_floor := is_on_floor()
	if on_floor:
		_coyote = COYOTE
	if _was_air and on_floor:
		var impact := _max_fall
		if impact > 9.0:
			land_t = 0.28
			AudioMan.play_sfx("landing", global_position, randf_range(0.9, 1.1), -6.0)
			Fx.spawn_dust(global_position + Vector3(0, 0.15, 0), 10 if impact < 20.0 else 16)
			if impact > 18.0:
				_shake(0.25)
	_max_fall = 0.0
	_was_air = not on_floor
	if not on_floor and playing:
		_max_fall = maxf(_max_fall, -velocity.y)

	# rope constraint (true pendulum: position + tangential velocity projection)
	if swinging:
		var to_c := global_position - anchor
		var d := to_c.length()
		if d > rope_len:
			var nrm := to_c / d
			global_position = anchor + nrm * rope_len
			var radial := velocity.dot(nrm)
			if radial > 0.0:
				velocity -= nrm * radial

	# wall state
	if on_wall and (zipping or dodging or (on_floor and velocity.y >= -0.5)):
		_detach_wall()
	elif on_wall:
		_hold_wall()
	elif playing and not on_floor and not zipping and not dodging and not swinging and not attacking:
		_try_attach_wall()

	if playing:
		if swinging:
			fluid = maxf(fluid - SWING_FLUID_DRAIN * delta, 0.0)
			if fluid <= 0.0:
				_release_swing()
		if on_wall:
			fluid = maxf(fluid - WALL_FLUID_DRAIN * delta, 0.0)
			if fluid <= 0.0:
				_detach_wall()  # out of fluid: drop off
		else:
			fluid = minf(fluid + FLUID_REGEN * delta, FLUID_MAX)
		last_dmg_t += delta
		if last_dmg_t > REGEN_DELAY and health > 0.0 and health < MAX_HEALTH:
			health = minf(health + 9.0 * delta, MAX_HEALTH)

	# perch detection: standing still on a ledge edge
	if on_floor:
		var fwd := -global_transform.basis.z
		var p := global_position + fwd * 0.8
		var q: Dictionary = _ray_city(p + Vector3(0, 0.25, 0), p + Vector3(0, -3.0, 0))
		var speed_h := Vector3(velocity.x, 0, velocity.z).length()
		if not q and speed_h < 1.5:
			perch_t += delta
		else:
			perch_t = maxf(perch_t - delta * 2.0, 0.0)

	AudioMan.update_wind(velocity.length(), delta)


# ------------------------------------------------------------------ process

func _process(delta: float) -> void:
	# face the target direction
	var f := 1.0 - exp(-yaw_rate * delta)
	rotation.y = lerp_angle(rotation.y, target_yaw, f)

	_update_web_lines()
	if GameManager.mode == GameManager.Mode.MENU:
		return

	# camera
	var head := global_position + Vector3(0, 1.5, 0)
	var cp := cos(cam_pitch)
	var off := Vector3(sin(cam_yaw) * cp, sin(cam_pitch), cos(cam_yaw) * cp)
	var dist := cam_dist
	var res: Dictionary = _ray_city(head, head + off * dist)
	if res:
		var d := (res["position"] as Vector3).distance_to(head)
		dist = maxf(d - 0.35, 0.9)
	var desired := head + off * dist
	if lock_target != null and is_instance_valid(lock_target):
		var to_t: Vector3 = (lock_target as Node3D).global_position + Vector3(0, 0.9, 0) - head
		desired = desired.lerp(head + to_t.normalized() * dist, 0.55)
	if shake_t > 0.0:
		shake_t = maxf(shake_t - delta, 0.0)
		var amp := shake_amp * (shake_t / 0.35)
		desired += Vector3(randf_range(-amp, amp), randf_range(-amp, amp), randf_range(-amp, amp))
	cam_target.global_position = cam_target.global_position.lerp(desired, 1.0 - exp(-16.0 * delta))
	var look_at := head + Vector3(0, 0.25, 0)
	if lock_target != null and is_instance_valid(lock_target):
		look_at = look_at.lerp((lock_target as Node3D).global_position + Vector3(0, 0.9, 0), 0.6)
	cam_target.look_at(look_at, Vector3.UP)

	# velocity-based FOV
	var sp := velocity.length()
	var tfov := clampf(60.0 + maxf(sp - 8.0, 0.0) * 0.55, 60.0, 88.0)
	if zipping:
		tfov = 86.0
	cam_fov = lerpf(cam_fov, tfov, 1.0 - exp(-7.0 * delta))
	cam_target.fov = cam_fov

	_update_pose(delta)


func _show_line(mi: MeshInstance3D, a: Vector3, b: Vector3) -> void:
	mi.visible = true
	mi.global_position = a
	var dirv := b - a
	if dirv.length() < 0.01:
		return
	var up := Vector3.UP
	if absf(dirv.normalized().dot(up)) > 0.99:
		up = Vector3.RIGHT
	mi.look_at(b, up)
	mi.rotate_x(deg_to_rad(-90.0))
	mi.scale = Vector3(1, dirv.length(), 1)


func _update_web_lines() -> void:
	if swinging:
		_show_line(web_line, hand_r_node.global_position, anchor)
		web_line2.visible = false
	elif zipping:
		_show_line(web_line, hand_r_node.global_position, zip_to)
		_show_line(web_line2, hand_l_node.global_position, zip_to)
	else:
		web_line.visible = false
		web_line2.visible = false


# ------------------------------------------------------------------ animation

func _resolve_pose() -> int:
	if GameManager.mode == GameManager.Mode.DEAD:
		return Pose.DOWN
	if zipping:
		return Pose.ZIP
	if dodging:
		return Pose.DODGE
	if swinging:
		return Pose.SWING
	if on_wall:
		return Pose.WALL
	if land_t > 0.0:
		return Pose.LAND
	if perch_t > 0.6:
		return Pose.PERCH
	if not is_on_floor():
		return Pose.AIR
	var speed_h := Vector3(velocity.x, 0, velocity.z).length()
	if speed_h > 1.0:
		return Pose.RUN
	return Pose.IDLE


func _pose_rate() -> float:
	match current_pose:
		Pose.DODGE:
			return 30.0
		Pose.LAND:
			return 18.0
		Pose.SWING:
			return 14.0
		Pose.WALL:
			return 12.0
		Pose.ZIP:
			return 16.0
		_:
			return 10.0


func _build_pose() -> Dictionary:
	var t := {}
	var time := _anim_time
	var breathe := sin(time * 2.1) * 0.02
	t["hips_y"] = 1.0 + sin(time * 2.1) * 0.008
	t["chest"] = Vector3(0.05 + breathe, 0.0, 0.0)
	t["head"] = Vector3(-breathe * 2.0, 0.0, 0.0)
	t["arm_l"] = Vector3(0.1, 0.0, 0.12)
	t["fore_l"] = Vector3(-0.35, 0.0, 0.0)
	t["arm_r"] = Vector3(0.1, 0.0, -0.12)
	t["fore_r"] = Vector3(-0.35, 0.0, 0.0)
	t["leg_l"] = Vector3(-0.03, 0.0, 0.02)
	t["shin_l"] = Vector3(0.06, 0.0, 0.0)
	t["leg_r"] = Vector3(0.03, 0.0, -0.02)
	t["shin_r"] = Vector3(0.06, 0.0, 0.0)
	t["model_x"] = 0.0
	t["model_y"] = 0.0

	var speed_h := Vector3(velocity.x, 0, velocity.z).length()

	match current_pose:
		Pose.RUN:
			var ph := run_phase
			var amp := clampf(speed_h / SPRINT_SPEED, 0.15, 1.0)
			t["leg_l"] = Vector3(sin(ph) * 1.0 * amp, 0, 0)
			t["leg_r"] = Vector3(sin(ph + PI) * 1.0 * amp, 0, 0)
			t["shin_l"] = Vector3(maxf(0.0, -sin(ph - 0.7)) * 1.2 * amp, 0, 0)
			t["shin_r"] = Vector3(maxf(0.0, -sin(ph + PI - 0.7)) * 1.2 * amp, 0, 0)
			t["arm_l"] = Vector3(sin(ph + PI) * 0.8 * amp, 0, 0.15)
			t["arm_r"] = Vector3(sin(ph) * 0.8 * amp, 0, -0.15)
			t["fore_l"] = Vector3(-0.6, 0, 0)
			t["fore_r"] = Vector3(-0.6, 0, 0)
			t["chest"] = Vector3(0.18 + 0.14 * amp, 0, 0)
			t["hips_y"] = 1.0 + abs(sin(ph)) * 0.04 * amp
		Pose.AIR:
			if velocity.y > 2.0:
				t["leg_l"] = Vector3(0.9, 0, 0.2)
				t["shin_l"] = Vector3(1.5, 0, 0)
				t["leg_r"] = Vector3(0.7, 0, -0.2)
				t["shin_r"] = Vector3(1.2, 0, 0)
				t["arm_l"] = Vector3(0.9, 0, 0.5)
				t["arm_r"] = Vector3(0.9, 0, -0.5)
			else:
				t["leg_l"] = Vector3(0.5, 0, 0.25)
				t["shin_l"] = Vector3(0.8, 0, 0)
				t["leg_r"] = Vector3(0.4, 0, -0.25)
				t["shin_r"] = Vector3(0.7, 0, 0)
				t["arm_l"] = Vector3(1.5, 0, 0.9)
				t["arm_r"] = Vector3(1.5, 0, -0.9)
				t["chest"] = Vector3(0.1, 0, 0)
		Pose.SWING:
			t["arm_r"] = Vector3(2.95, 0, -0.15)
			t["fore_r"] = Vector3(0.1, 0, 0)
			t["arm_l"] = Vector3(-0.7, 0, 0.4)
			t["fore_l"] = Vector3(-0.5, 0, 0)
			t["leg_l"] = Vector3(-0.55, 0, 0.15)
			t["shin_l"] = Vector3(0.35, 0, 0)
			t["leg_r"] = Vector3(-0.35, 0, -0.15)
			t["shin_r"] = Vector3(0.2, 0, 0)
			t["chest"] = Vector3(0.35, 0, 0)
			t["hips_y"] = 1.02
		Pose.WALL:
			t["chest"] = Vector3(0.55, 0, 0)
			t["arm_l"] = Vector3(1.1, 0, 0.55)
			t["arm_r"] = Vector3(1.1, 0, -0.55)
			t["fore_l"] = Vector3(-0.4, 0, 0)
			t["fore_r"] = Vector3(-0.4, 0, 0)
			t["leg_l"] = Vector3(0.3, 0, 0.45)
			t["leg_r"] = Vector3(0.3, 0, -0.45)
			t["shin_l"] = Vector3(0.5, 0, 0)
			t["shin_r"] = Vector3(0.5, 0, 0)
			t["hips_y"] = 0.95
		Pose.LAND:
			t["hips_y"] = 0.68
			t["chest"] = Vector3(0.75, 0, 0)
			t["leg_l"] = Vector3(1.25, 0, 0.1)
			t["shin_l"] = Vector3(1.6, 0, 0)
			t["leg_r"] = Vector3(1.25, 0, -0.1)
			t["shin_r"] = Vector3(1.6, 0, 0)
			t["arm_l"] = Vector3(0.6, 0, 0.3)
			t["arm_r"] = Vector3(0.6, 0, -0.3)
		Pose.PERCH:
			t["hips_y"] = 0.62
			t["chest"] = Vector3(0.7, 0, 0)
			t["leg_l"] = Vector3(1.5, 0, 0.12)
			t["shin_l"] = Vector3(1.75, 0, 0)
			t["leg_r"] = Vector3(1.5, 0, -0.12)
			t["shin_r"] = Vector3(1.75, 0, 0)
			t["arm_l"] = Vector3(0.9, 0, 0.4)
			t["fore_l"] = Vector3(-0.9, 0, 0)
			t["arm_r"] = Vector3(0.9, 0, -0.4)
			t["fore_r"] = Vector3(-0.9, 0, 0)
		Pose.DODGE:
			var k := clampf(dodge_t / DODGE_TIME, 0.0, 1.0)
			t["model_x"] = -PI * 2.0 * k
			t["arm_l"] = Vector3(0.7, 0, 0.7)
			t["arm_r"] = Vector3(0.7, 0, -0.7)
			t["leg_l"] = Vector3(0.8, 0, 0)
			t["leg_r"] = Vector3(-0.4, 0, 0)
		Pose.ZIP:
			t["model_x"] = -1.35
			t["chest"] = Vector3(0.15, 0, 0)
			t["arm_l"] = Vector3(1.45, 0, 0.25)
			t["arm_r"] = Vector3(1.45, 0, -0.25)
			t["fore_l"] = Vector3(0.1, 0, 0)
			t["fore_r"] = Vector3(0.1, 0, 0)
			t["leg_l"] = Vector3(-0.3, 0, 0.1)
			t["leg_r"] = Vector3(-0.3, 0, -0.1)
		Pose.DOWN:
			t["model_x"] = -PI / 2.0
			t["hips_y"] = 0.3
			t["chest"] = Vector3(0.0, 0, 0)
			t["arm_l"] = Vector3(0.3, 0, 0.5)
			t["arm_r"] = Vector3(0.3, 0, -0.5)
			t["leg_l"] = Vector3(0.2, 0, 0)
			t["leg_r"] = Vector3(0.2, 0, 0)

	if attacking:
		var w := _atk_windup()
		var a := _atk_active()
		var r := _atk_recovery()
		if attack_combo == 2:
			# roundhouse kick
			if attack_t < w:
				t["model_y"] = -2.4 * (attack_t / w)
				t["leg_r"] = Vector3(0.5, 0, 0.4)
				t["chest"] = Vector3(0.1, 0.4, 0)
			elif attack_t < w + a:
				t["model_y"] = PI
				t["leg_r"] = Vector3(1.5, 0, 0.6)
				t["shin_r"] = Vector3(0.2, 0, 0)
				t["chest"] = Vector3(0.15, -0.5, 0)
			else:
				t["model_y"] = PI * (1.0 - (attack_t - w - a) / r)
				t["leg_r"] = Vector3(0.4, 0, 0.2)
		else:
			if attack_t < w:
				t["arm_r"] = Vector3(-0.6, 0, -0.5)
				t["chest"] = Vector3(0.1, -0.5, 0)
			elif attack_t < w + a:
				t["arm_r"] = Vector3(1.6, 0, -0.1)
				t["fore_r"] = Vector3(0.05, 0, 0)
				t["chest"] = Vector3(0.15, 0.6, 0)
			else:
				t["arm_r"] = Vector3(0.9, 0, -0.3)
				t["chest"] = Vector3(0.1, 0.2, 0)
	return t


func _apply_pose(t: Dictionary, k: float, dt: float) -> void:
	var f := 1.0 - exp(-k * dt)
	for joint in bones:
		if joint == "hips":
			continue
		var j: Node3D = bones[joint]
		var target: Vector3 = t.get(joint, Vector3.ZERO)
		j.rotation = Vector3(
			lerp_angle(j.rotation.x, target.x, f),
			lerp_angle(j.rotation.y, target.y, f),
			lerp_angle(j.rotation.z, target.z, f)
		)
	var hips: Node3D = bones["hips"]
	var hy: float = t.get("hips_y", 1.0)
	hips.position.y = lerpf(hips.position.y, hy, f)
	model.rotation.x = lerp_angle(model.rotation.x, t.get("model_x", 0.0), f)
	model.rotation.y = lerp_angle(model.rotation.y, t.get("model_y", 0.0), f)


func _update_pose(delta: float) -> void:
	current_pose = _resolve_pose()
	run_phase += Vector3(velocity.x, 0, velocity.z).length() * delta * 1.5
	var t := _build_pose()
	_apply_pose(t, _pose_rate(), delta)
	# eye squint on spider-sense
	var squint := 0.28 if GameManager.sense_t > 0.0 else 1.0
	var ef := 1.0 - exp(-20.0 * delta)
	lens_scale = lerpf(lens_scale, squint, ef)
	eye_l.scale = Vector3(1, lens_scale, 1)
	eye_r.scale = Vector3(1, lens_scale, 1)
	# head look
	var look_at: Node3D = null
	if lock_target != null and is_instance_valid(lock_target):
		look_at = lock_target
	elif GameManager.sense_source != null and is_instance_valid(GameManager.sense_source):
		look_at = GameManager.sense_source
	if look_at != null:
		var to_t: Vector3 = look_at.global_position - global_position
		var wy := atan2(-to_t.x, -to_t.z)
		var rel := wrapf(wy - rotation.y, -PI, PI)
		bones["head"].rotation.y = lerp_angle(bones["head"].rotation.y, clampf(rel, -0.9, 0.9), ef)
	else:
		bones["head"].rotation.y = lerp_angle(bones["head"].rotation.y, 0.0, ef)


# ------------------------------------------------------------------ reset

func reset(pos: Vector3) -> void:
	global_position = pos
	velocity = Vector3.ZERO
	health = MAX_HEALTH
	fluid = FLUID_MAX
	swinging = false
	on_wall = false
	zipping = false
	dodging = false
	attacking = false
	attack_queued = false
	_hitbox_on = false
	combo_count = 0
	combo_timer = 0.0
	last_dmg_t = 99.0
	lock_target = null
	lock_timer = 0.0
	invuln_t = 0.0
	perch_t = 0.0
	land_t = 0.0
	cam_pitch = -0.1
	cam_dist = 4.4
	rotation.y = 0.0
	target_yaw = 0.0
	web_line.visible = false
	web_line2.visible = false
	model.rotation = Vector3.ZERO
	# snap camera behind
	cam_target.global_position = global_position + Vector3(sin(cam_yaw) * 5.0, 1.5 + sin(cam_pitch) * 5.0, cos(cam_yaw) * 5.0)
