extends Node3D
## Entry point: builds the city, player, HUD, menus, and a cinematic
## orbit camera for the main menu.

var world: Node3D
var player
var hud: Node
var menus: Node
var _menu_cam: Camera3D
var _t := 0.0


func _ready() -> void:
	world = Node3D.new()
	world.name = "World"
	world.add_to_group("world")
	add_child(world)
	GameManager.world_root = world
	GameManager.city_info = CityGen.build(world)
	if bool(GameManager.settings.get("night", false)):
		CityGen.set_time_of_day(world, true)

	player = preload("res://scripts/player/player.gd").new()
	player.name = "Player"
	world.add_child(player)
	player.global_position = GameManager.city_info["spawn"]

	hud = preload("res://scripts/ui/hud.gd").new()
	add_child(hud)
	menus = preload("res://scripts/ui/menus.gd").new()
	add_child(menus)

	_menu_cam = Camera3D.new()
	_menu_cam.name = "MenuCamera"
	_menu_cam.current = true
	_menu_cam.fov = 55.0
	add_child(_menu_cam)

	GameManager.debug_auto_start()


func _process(delta: float) -> void:
	_t += delta
	var gm = GameManager
	if gm.mode == gm.Mode.MENU:
		var a := _t * 0.06
		_menu_cam.global_position = Vector3(cos(a) * 75.0, 42.0, sin(a) * 75.0)
		_menu_cam.look_at(Vector3(0, 30, 0))
		_menu_cam.current = true
		if player != null:
			player.cam_target.current = false
	else:
		_menu_cam.current = false
		if player != null:
			player.cam_target.current = true
