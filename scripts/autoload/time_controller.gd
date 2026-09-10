extends Node
## Global time scale control: hit-stop (freeze frames) and spider-sense slow motion.
## Uses unscaled real time so it works correctly even while time_scale is low.

var base_scale := 1.0
var slowmo_left := 0.0
var slowmo_scale := 0.35
var hitstop_left := 0.0
var hitstop_scale := 0.06

var _last_msec := 0


func _ready() -> void:
	_last_msec = Time.get_ticks_msec()
	Engine.time_scale = base_scale


func _process(_delta: float) -> void:
	var now := Time.get_ticks_msec()
	var ud := float(now - _last_msec) / 1000.0
	_last_msec = now
	if hitstop_left > 0.0:
		hitstop_left -= ud
	if slowmo_left > 0.0:
		slowmo_left -= ud
	var target := base_scale
	if slowmo_left > 0.0:
		target = slowmo_scale
	if hitstop_left > 0.0:
		target = hitstop_scale
	if absf(Engine.time_scale - target) > 0.0001:
		Engine.time_scale = target


## Brief freeze-frame on impacts (game feel).
func do_hitstop(sec: float = 0.06) -> void:
	hitstop_left = maxf(hitstop_left, sec)


## Spider-sense / cinematic slow motion.
func do_slowmo(scale: float, sec: float) -> void:
	slowmo_scale = scale
	slowmo_left = maxf(slowmo_left, sec)


func clear() -> void:
	slowmo_left = 0.0
	hitstop_left = 0.0
