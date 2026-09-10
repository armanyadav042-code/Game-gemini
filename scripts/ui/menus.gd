extends Node
## Menus: main menu, settings, pause, and mission result screens.

var _layer: CanvasLayer
var _main: Control
var _settings: Control
var _pause: Control
var _result: Control
var _result_title: Label
var _result_stats: Label
var _retry_btn: Button
var _showing_settings := false
var _mission_buttons: Array = []


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_layer = CanvasLayer.new()
	_layer.name = "Menus"
	_layer.layer = 20
	_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_layer)
	_build_main()
	_build_settings()
	_build_pause()
	_build_result()
	GameManager.finished.connect(_on_finished)


# ------------------------------------------------------------------ helpers

func _panel(bg_a: float) -> ColorRect:
	var c := ColorRect.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.color = Color(0.01, 0.02, 0.04, bg_a)
	return c


func _button(text: String, cb: Callable, font_size := 22) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", font_size)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.custom_minimum_size = Vector2(360, 42)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.05, 0.08, 0.13, 0.9)
	sb.border_color = Color(0.3, 0.4, 0.55, 0.8)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(4)
	sb.content_margin_left = 14.0
	sb.content_margin_right = 14.0
	b.add_theme_stylebox_override("normal", sb)
	var sbh := sb.duplicate() as StyleBoxFlat
	sbh.bg_color = Color(0.1, 0.18, 0.3, 0.95)
	b.add_theme_stylebox_override("hover", sbh)
	b.pressed.connect(cb)
	return b


func _label(text: String, size: int, col: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("outline_size", 8)
	return l


# ------------------------------------------------------------------ main menu

func _build_main() -> void:
	_main = _panel(0.78)
	_layer.add_child(_main)
	var title := _label("A R A C H N I D", 74, Color(0.92, 0.95, 1.0))
	title.position = Vector2(390, 90)
	title.size = Vector2(500, 90)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main.add_child(title)
	var sub := _label("WEB SLINGER  ·  Godot 4  ·  100% free assets", 16, Color(0.55, 0.65, 0.8))
	sub.position = Vector2(340, 186)
	sub.size = Vector2(600, 24)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_main.add_child(sub)

	var box := VBoxContainer.new()
	box.position = Vector2(460, 250)
	box.add_theme_constant_override("separation", 8)
	_main.add_child(box)
	box.add_child(_button("FREE ROAM", func() -> void: GameManager.start_free_roam()))
	var m1 := _button("MISSION 1 — STOP THE ROBBERY", func() -> void: GameManager.start_mission(0))
	var m2 := _button("MISSION 2 — ROOFTOP CHASE", func() -> void: GameManager.start_mission(1))
	var m3 := _button("MISSION 3 — TIME TRIAL: RING RUN", func() -> void: GameManager.start_mission(2))
	box.add_child(m1)
	box.add_child(m2)
	box.add_child(m3)
	_mission_buttons = [m1, m2, m3]
	box.add_child(_button("SETTINGS", func() -> void: _showing_settings = true))
	box.add_child(_button("QUIT", func() -> void: get_tree().quit()))

	var hint := _label(
		"WASD move · SHIFT sprint · SPACE jump · MOUSE look   |   hold RMB web-swing (W/S rope length) · F zip · Q web-strike   |   LMB 3-hit combo · E backflip dodge · TAB lock-on · ESC pause",
		14, Color(0.5, 0.6, 0.75))
	hint.position = Vector2(300, 600)
	hint.size = Vector2(680, 80)
	_main.add_child(hint)


# ------------------------------------------------------------------ settings

func _build_settings() -> void:
	_settings = _panel(0.88)
	_settings.visible = false
	_layer.add_child(_settings)
	var title := _label("SETTINGS", 44, Color(0.9, 0.95, 1.0))
	title.position = Vector2(500, 80)
	title.size = Vector2(280, 60)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_settings.add_child(title)
	var box := VBoxContainer.new()
	box.position = Vector2(430, 180)
	box.add_theme_constant_override("separation", 14)
	_settings.add_child(box)

	box.add_child(_slider_row("MASTER VOLUME", "master", 0.0, 1.0, func(v: float) -> void: GameManager.apply_settings()))
	box.add_child(_slider_row("SFX VOLUME", "sfx", 0.0, 1.0, func(v: float) -> void: GameManager.apply_settings()))
	box.add_child(_slider_row("MUSIC VOLUME", "music", 0.0, 1.0, func(v: float) -> void: GameManager.apply_settings()))
	box.add_child(_slider_row("CAMERA SENSITIVITY", "sens", 0.4, 2.0, func(v: float) -> void: GameManager.apply_settings()))

	var night_row := HBoxContainer.new()
	var night_label := _label("NIGHT CITY", 18, Color(0.8, 0.85, 0.95))
	night_label.custom_minimum_size = Vector2(220, 24)
	night_row.add_child(night_label)
	var night_cb := CheckButton.new()
	night_cb.button_pressed = bool(GameManager.settings["night"])
	night_cb.toggled.connect(func(on: bool) -> void:
		GameManager.settings["night"] = on
		GameManager.save_game()
		if GameManager.world_root != null:
			CityGen.set_time_of_day(GameManager.world_root, on)
	)
	night_row.add_child(night_cb)
	box.add_child(night_row)

	box.add_child(_button("BACK", func() -> void: _showing_settings = false))


func _slider_row(text: String, key: String, minv: float, maxv: float, cb: Callable) -> Control:
	var row := HBoxContainer.new()
	var l := _label(text, 18, Color(0.8, 0.85, 0.95))
	l.custom_minimum_size = Vector2(220, 24)
	row.add_child(l)
	var s := HSlider.new()
	s.min_value = minv
	s.max_value = maxv
	s.value = float(GameManager.settings[key])
	s.custom_minimum_size = Vector2(180, 24)
	s.value_changed.connect(func(v: float) -> void:
		GameManager.settings[key] = v
		GameManager.save_game()
		cb.call(v)
	)
	row.add_child(s)
	return row


# ------------------------------------------------------------------ pause

func _build_pause() -> void:
	_pause = _panel(0.7)
	_pause.visible = false
	_layer.add_child(_pause)
	var title := _label("PAUSED", 52, Color(0.9, 0.95, 1.0))
	title.position = Vector2(500, 160)
	title.size = Vector2(280, 70)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_pause.add_child(title)
	var box := VBoxContainer.new()
	box.position = Vector2(500, 280)
	box.add_theme_constant_override("separation", 10)
	_pause.add_child(box)
	box.add_child(_button("RESUME", func() -> void: GameManager.toggle_pause()))
	box.add_child(_button("RESTART", func() -> void: GameManager.retry()))
	box.add_child(_button("MAIN MENU", func() -> void: GameManager.to_menu()))


# ------------------------------------------------------------------ result

func _build_result() -> void:
	_result = _panel(0.82)
	_result.visible = false
	_layer.add_child(_result)
	_result_title = _label("", 54, Color(0.4, 1.0, 0.5))
	_result_title.position = Vector2(240, 150)
	_result_title.size = Vector2(800, 70)
	_result_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result.add_child(_result_title)
	_result_stats = _label("", 22, Color(0.85, 0.9, 1.0))
	_result_stats.position = Vector2(490, 260)
	_result_stats.size = Vector2(300, 220)
	_result_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_result.add_child(_result_stats)
	var box := VBoxContainer.new()
	box.position = Vector2(460, 470)
	box.add_theme_constant_override("separation", 8)
	_result.add_child(box)
	_retry_btn = _button("RETRY MISSION", func() -> void: GameManager.retry())
	box.add_child(_retry_btn)
	box.add_child(_button("FREE ROAM", func() -> void: GameManager.start_free_roam()))
	box.add_child(_button("MAIN MENU", func() -> void: GameManager.to_menu()))
	var hint := _label("Press ENTER to continue", 14, Color(0.5, 0.6, 0.75))
	hint.position = Vector2(500, 590)
	hint.size = Vector2(280, 24)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result.add_child(hint)


# ------------------------------------------------------------------ logic

func _on_finished(success: bool, title: String) -> void:
	_result_title.text = title
	_result_title.modulate = Color(0.4, 1.0, 0.5) if success else Color(1.0, 0.35, 0.3)
	var s: Dictionary = GameManager.stats
	_result_stats.text = (
		"TIME        %s\n" % "%0.1fs" % float(s.get("time", 0.0)) +
		"MAX COMBO   ×%d\n" % int(s.get("max_combo", 0.0)) +
		"DAMAGE      %d\n" % int(s.get("damage_taken", 0.0)) +
		"KILLS       %d\n" % int(s.get("kills", 0)) +
		"SCORE       %d" % GameManager.score
	)
	_retry_btn.visible = GameManager.active_mission >= 0


func _unhandled_input(event: InputEvent) -> void:
	var gm = GameManager
	if gm.mode == gm.Mode.COMPLETE or gm.mode == gm.Mode.DEAD:
		if event.is_action_pressed("accept") or event.is_action_pressed("pause"):
			gm.to_menu()
	elif gm.mode == gm.Mode.PAUSED and event.is_action_pressed("pause"):
		gm.toggle_pause()
	elif gm.mode == gm.Mode.MENU and _showing_settings and event.is_action_pressed("pause"):
		_showing_settings = false


func _process(_delta: float) -> void:
	var gm = GameManager
	_main.visible = gm.mode == gm.Mode.MENU and not _showing_settings
	_settings.visible = gm.mode == gm.Mode.MENU and _showing_settings
	_pause.visible = gm.mode == gm.Mode.PAUSED
	_result.visible = gm.mode == gm.Mode.COMPLETE or gm.mode == gm.Mode.DEAD
	if gm.mode == gm.Mode.MENU:
		for i in _mission_buttons.size():
			var b: Button = _mission_buttons[i]
			var done: bool = gm.missions_done.has(i)
			b.text = "MISSION %d — %s" % [i + 1, gm.mission_name(i)]
			if done:
				b.text += "  ✓"
