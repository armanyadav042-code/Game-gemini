extends Node
## HUD: health + web-fluid bars, combo counter, objective text, mission timer,
## crosshair, minimap with radar dots, spider-sense / damage vignettes,
## speed lines, and a floating 3D objective marker with distance label.

var _layer: CanvasLayer
var _hp_fill: ColorRect
var _fluid_fill: ColorRect
var _combo_label: Label
var _obj_label: Label
var _banner_label: Label
var _timer_label: Label
var _crosshair: Label
var _lock_label: Label
var _sense_rect: ColorRect
var _dmg_rect: ColorRect
var _speed_rect: ColorRect
var _minimap: MinimapControl
var _marker: Node3D
var _marker_dist: Label3D
var _diamond: MeshInstance3D
var _pillar: MeshInstance3D
var _last_combo := 0
var _banner_t := 0.0


class MinimapControl extends Control:
	func _ready() -> void:
		custom_minimum_size = Vector2(160, 160)
		size = Vector2(160, 160)

	func _process(_delta: float) -> void:
		queue_redraw()

	func _draw() -> void:
		var c := Vector2(80, 80)
		draw_circle(c, 78, Color(0.02, 0.03, 0.05, 0.55), true)
		draw_arc(c, 78, 0, TAU, 64, Color(0.45, 0.55, 0.65, 0.8), 2.0, true)
		var gm = GameManager
		var player: Variant = gm.player
		if player == null:
			return
		var yaw: float = player.cam_yaw
		var fx := -sin(yaw)
		var fz := -cos(yaw)
		var scale := 1.55
		# enemy radar dots
		for e in get_tree().get_nodes_in_group("enemies"):
			var en = e
			if not is_instance_valid(en):
				continue
			if en.has_method("get_health") and en.get_health() <= 0.0:
				continue
			var d: Vector3 = en.global_position - player.global_position
			if Vector2(d.x, d.z).length() > 50.0:
				continue
			var sx := -(d.x * fz) + d.z * fx
			var sy := -(d.x * fx + d.z * fz)
			draw_circle(c + Vector2(sx, sy) * scale, 3.5, Color(1.0, 0.2, 0.15), true)
		# objective
		var op: Vector3 = gm.get_objective_world_pos()
		if op != Vector3.ZERO:
			var d: Vector3 = op - player.global_position
			var sx := -(d.x * fz) + d.z * fx
			var sy := -(d.x * fx + d.z * fz)
			draw_circle(c + Vector2(sx, sy) * scale, 5.0, Color(1.0, 0.85, 0.2), true)
		# north marker (world -Z)
		var nd := Vector3(0, 0, -1)
		var nsx := -(nd.x * fz) + nd.z * fx
		var nsy := -(nd.x * fx + nd.z * fz)
		var npos2 := c + Vector2(nsx, nsy) * 68.0
		var font := ThemeDB.fallback_font
		draw_string(font, npos2 + Vector2(-4, 4), "N", HORIZONTAL_ALIGNMENT_LEFT, 12, 12, Color(1, 1, 1, 0.7))
		# player arrow
		draw_colored_polygon(
			PackedVector2Array([c, c + Vector2(-6, 11), c + Vector2(6, 11)]), Color(0.95, 0.95, 0.97)
		)


func _ready() -> void:
	_layer = CanvasLayer.new()
	_layer.name = "HUD"
	_layer.layer = 10
	add_child(_layer)
	_build_2d()
	_build_marker()
	GameManager.banner.connect(_on_banner)
	GameManager.objective.connect(_on_objective)


func _build_2d() -> void:
	var bg := ColorRect.new()
	bg.position = Vector2(14, 14)
	bg.size = Vector2(292, 64)
	bg.color = Color(0.02, 0.03, 0.05, 0.55)
	_layer.add_child(bg)
	var name_label := Label.new()
	name_label.text = "A R A C H N I D"
	name_label.position = Vector2(22, 16)
	name_label.add_theme_font_size_override("font_size", 14)
	name_label.add_theme_color_override("font_color", Color(0.85, 0.9, 1.0))
	_layer.add_child(name_label)

	var hp_bg := ColorRect.new()
	hp_bg.position = Vector2(22, 40)
	hp_bg.size = Vector2(244, 14)
	hp_bg.color = Color(0.12, 0.05, 0.05, 0.9)
	_layer.add_child(hp_bg)
	_hp_fill = ColorRect.new()
	_hp_fill.position = Vector2(22, 40)
	_hp_fill.size = Vector2(244, 14)
	_hp_fill.color = Color(0.78, 0.14, 0.14)
	_layer.add_child(_hp_fill)

	var fl_bg := ColorRect.new()
	fl_bg.position = Vector2(22, 58)
	fl_bg.size = Vector2(244, 8)
	fl_bg.color = Color(0.03, 0.09, 0.11, 0.9)
	_layer.add_child(fl_bg)
	_fluid_fill = ColorRect.new()
	_fluid_fill.position = Vector2(22, 58)
	_fluid_fill.size = Vector2(244, 8)
	_fluid_fill.color = Color(0.15, 0.65, 0.75)
	_layer.add_child(_fluid_fill)

	_obj_label = Label.new()
	_obj_label.position = Vector2(830, 18)
	_obj_label.size = Vector2(434, 84)
	_obj_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_obj_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_obj_label.add_theme_font_size_override("font_size", 19)
	_obj_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.6))
	_obj_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	_obj_label.add_theme_constant_override("outline_size", 6)
	_layer.add_child(_obj_label)

	_banner_label = Label.new()
	_banner_label.text = ""
	_banner_label.position = Vector2(160, 84)
	_banner_label.size = Vector2(960, 60)
	_banner_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner_label.add_theme_font_size_override("font_size", 40)
	_banner_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	_banner_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	_banner_label.add_theme_constant_override("outline_size", 10)
	_banner_label.modulate.a = 0.0
	_layer.add_child(_banner_label)

	_timer_label = Label.new()
	_timer_label.position = Vector2(440, 150)
	_timer_label.size = Vector2(400, 30)
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_timer_label.add_theme_font_size_override("font_size", 22)
	_timer_label.add_theme_color_override("font_color", Color(0.7, 0.9, 1.0))
	_timer_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	_timer_label.add_theme_constant_override("outline_size", 6)
	_timer_label.visible = false
	_layer.add_child(_timer_label)

	_combo_label = Label.new()
	_combo_label.position = Vector2(920, 300)
	_combo_label.size = Vector2(220, 70)
	_combo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_combo_label.add_theme_font_size_override("font_size", 46)
	_combo_label.add_theme_color_override("font_color", Color(1.0, 0.75, 0.2))
	_combo_label.add_theme_color_override("font_outline_color", Color(0.1, 0, 0, 0.9))
	_combo_label.add_theme_constant_override("outline_size", 8)
	_layer.add_child(_combo_label)

	_crosshair = Label.new()
	_crosshair.text = "+"
	_crosshair.position = Vector2(630, 344)
	_crosshair.add_theme_font_size_override("font_size", 26)
	_crosshair.add_theme_color_override("font_color", Color(1, 1, 1, 0.9))
	_layer.add_child(_crosshair)
	_lock_label = Label.new()
	_lock_label.text = "LOCKED"
	_lock_label.position = Vector2(616, 374)
	_lock_label.add_theme_font_size_override("font_size", 12)
	_lock_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	_lock_label.visible = false
	_layer.add_child(_lock_label)

	_minimap = MinimapControl.new()
	_minimap.position = Vector2(1098, 542)
	_layer.add_child(_minimap)

	# full-screen shader rects
	_sense_rect = _make_screen_rect(_vignette_shader(Color(1.0, 0.05, 0.04)))
	_dmg_rect = _make_screen_rect(_vignette_shader(Color(1.0, 0.1, 0.06), true))
	_speed_rect = _make_screen_rect(_speedline_shader())


func _make_screen_rect(code: String) -> ColorRect:
	var c := ColorRect.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new()
	sh.code = code
	var m := ShaderMaterial.new()
	m.shader = sh
	m.set_shader_parameter("amount", 0.0)
	c.material = m
	_layer.add_child(c)
	return c


func _vignette_shader(col: Color, pulse := false) -> String:
	var pulse_code := "a *= (0.75 + 0.25 * sin(TIME * 26.0));" if pulse else ""
	return """
shader_type canvas_item;
uniform float amount : hint_range(0.0, 1.0) = 0.0;
void fragment() {
	vec2 c = UV - 0.5;
	float d = length(c * vec2(1.5, 1.1));
	float a = smoothstep(0.28, 0.78, d) * amount;
	%s
	COLOR = vec4(%.2f, %.2f, %.2f, a);
}
""" % [pulse_code, col.r, col.g, col.b]


func _speedline_shader() -> String:
	return """
shader_type canvas_item;
uniform float amount : hint_range(0.0, 1.0) = 0.0;
void fragment() {
	vec2 c = UV - 0.5;
	float r = length(c * vec2(1.35, 1.0));
	float ang = atan(c.y, c.x);
	float streak = pow(abs(sin(ang * 26.0 + (r - TIME * 1.5) * 4.0)), 26.0);
	float mask = smoothstep(0.16, 0.62, r);
	float a = streak * mask * amount;
	COLOR = vec4(1.0, 1.0, 1.0, a * 0.45);
}
"""


func _build_marker() -> void:
	_marker = Node3D.new()
	_marker.name = "ObjectiveMarker"
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.85, 0.2)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.85, 0.2)
	mat.emission_energy_multiplier = 2.2
	_diamond = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.9, 0.9, 0.9)
	_diamond.mesh = bm
	_diamond.material_override = mat
	_diamond.rotation_degrees = Vector3(45, 0, 45)
	_marker.add_child(_diamond)
	var pmat := StandardMaterial3D.new()
	pmat.albedo_color = Color(1.0, 0.85, 0.2, 0.2)
	pmat.emission_enabled = true
	pmat.emission = Color(1.0, 0.85, 0.2)
	pmat.emission_energy_multiplier = 1.0
	pmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_pillar = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.12
	cm.bottom_radius = 0.12
	cm.height = 300.0
	_pillar.mesh = cm
	_pillar.material_override = pmat
	_marker.add_child(_pillar)
	_marker_dist = Label3D.new()
	_marker_dist.pixel_size = 0.0045
	_marker_dist.font_size = 42
	_marker_dist.modulate = Color(1.0, 0.9, 0.35)
	_marker_dist.outline_size = 8
	_marker_dist.outline_modulate = Color(0, 0, 0, 0.85)
	_marker_dist.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_marker_dist.position = Vector3(0, -1.7, 0)
	_marker.add_child(_marker_dist)
	_marker.visible = false
	get_tree().root.add_child(_marker)


func _set_param(rect: ColorRect, name: String, v: float) -> void:
	if rect.material != null:
		(rect.material as ShaderMaterial).set_shader_parameter(name, v)


func _on_banner(text: String) -> void:
	_banner_label.text = text
	_banner_t = 2.6


func _on_objective(text: String) -> void:
	_obj_label.text = text


func _pop_combo() -> void:
	var tw := _combo_label.create_tween()
	_combo_label.scale = Vector2(1.45, 1.45)
	_combo_label.pivot_offset = _combo_label.size * 0.5
	tw.tween_property(_combo_label, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)


func _process(delta: float) -> void:
	var gm = GameManager
	var in_game := gm.mode == gm.Mode.PLAY or gm.mode == gm.Mode.PAUSED
	_layer.visible = in_game
	if not in_game:
		_marker.visible = false
		return
	var p: Variant = gm.player
	if p == null:
		return
	# meters
	_hp_fill.size.x = 244.0 * clampf(p.health / p.MAX_HEALTH, 0.0, 1.0)
	_fluid_fill.size.x = 244.0 * clampf(p.fluid / p.FLUID_MAX, 0.0, 1.0)
	# combo
	if p.combo_count >= 2 and p.combo_count != _last_combo:
		_pop_combo()
	_last_combo = p.combo_count
	_combo_label.text = "×%d" % p.combo_count if p.combo_count >= 2 else ""
	# crosshair
	_crosshair.modulate = Color(1.0, 0.9, 0.35) if p.lock_target != null else Color.WHITE
	_lock_label.visible = p.lock_target != null
	# sense / damage / low-health vignettes
	var sense_amt := 0.0
	if gm.sense_t > 0.0:
		sense_amt = 0.95 * (gm.sense_t / 0.7)
	var dmg_amt := 0.0
	if p.last_dmg_t < 0.6:
		dmg_amt = 1.0 - p.last_dmg_t / 0.6
	if p.health < 30.0 and p.health > 0.0:
		dmg_amt = maxf(dmg_amt, 0.3 + 0.2 * sin(Time.get_ticks_msec() / 150.0))
	_set_param(_sense_rect, "amount", sense_amt)
	_set_param(_dmg_rect, "amount", dmg_amt)
	# speed lines
	var sp: float = p.velocity.length()
	var speed_amt := clampf((sp - 16.0) / 18.0, 0.0, 0.8)
	if p.zipping:
		speed_amt = 1.0
	_set_param(_speed_rect, "amount", speed_amt)
	# time-trial timer
	if gm.active_mission == 2:
		_timer_label.visible = true
		_timer_label.text = "TIME %s   RING %d/5" % ["%.1fs" % gm.mission_time, mini(gm._ring_idx + 1, 5)]
	else:
		_timer_label.visible = false
	# banner fade
	if _banner_t > 0.0:
		_banner_t -= delta
		_banner_label.modulate.a = clampf(_banner_t / 0.5, 0.0, 1.0)
	# objective marker
	var op: Vector3 = gm.get_objective_world_pos()
	if op != Vector3.ZERO:
		_marker.visible = true
		_marker.global_position = op + Vector3(0, 2.4, 0)
		_marker_dist.text = "%dm" % int(p.global_position.distance_to(op))
		var len := maxf(op.y + 5.0, 4.0)
		_pillar.scale = Vector3(1, len / 300.0, 1)
		_pillar.position = Vector3(0, -len / 2.0, 0)
	else:
		_marker.visible = false
	_diamond.rotate_y(delta * 2.2)
