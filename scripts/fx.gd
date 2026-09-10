extends Node
## Fx — lightweight transient VFX (hit sparks, dust). Pooled-free: short-lived
## meshes with tweens; fine for the object counts in this game.

var _spark_mat_o: StandardMaterial3D
var _spark_mat_h: StandardMaterial3D
var _dust_mat: StandardMaterial3D


func _ready() -> void:
	_spark_mat_o = _glow_mat(Color(1.0, 0.75, 0.3))
	_spark_mat_h = _glow_mat(Color(1.0, 0.4, 0.15))
	_dust_mat = StandardMaterial3D.new()
	_dust_mat.albedo_color = Color(0.75, 0.72, 0.65, 0.5)
	_dust_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA


func _glow_mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = 3.0
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return m


func spawn_hit_spark(pos: Vector3, heavy: bool) -> void:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.22
	sm.height = 0.44
	sm.radial_segments = 8
	sm.rings = 6
	mi.mesh = sm
	var mat: StandardMaterial3D = _spark_mat_h if heavy else _spark_mat_o
	mat = mat.duplicate() as StandardMaterial3D
	mi.material_override = mat
	mi.global_position = pos
	get_tree().root.add_child(mi)
	var s := 0.5 if heavy else 0.35
	mi.scale = Vector3.ONE * s
	var tw := get_tree().create_tween()
	tw.set_parallel(true)
	tw.tween_property(mi, "scale", Vector3.ONE * (2.6 if heavy else 1.8), 0.16).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(mat, "albedo_color:a", 0.0, 0.16)
	tw.chain().tween_callback(mi.queue_free)


func spawn_dust(pos: Vector3, count: int) -> void:
	for i in count:
		var mi := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.12
		sm.height = 0.24
		sm.radial_segments = 6
		sm.rings = 4
		mi.mesh = sm
		var mat := _dust_mat.duplicate() as StandardMaterial3D
		mi.material_override = mat
		mi.global_position = pos + Vector3(randf_range(-0.4, 0.4), 0.05, randf_range(-0.4, 0.4))
		get_tree().root.add_child(mi)
		var tw := get_tree().create_tween()
		tw.set_parallel(true)
		var dir := Vector3(randf_range(-1, 1), randf_range(0.2, 1.0), randf_range(-1, 1)).normalized() * randf_range(1.5, 3.5)
		tw.tween_property(mi, "position", mi.position + dir, 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(mi, "scale", Vector3.ONE * 2.2, 0.5)
		tw.tween_property(mat, "albedo_color:a", 0.0, 0.5)
		tw.chain().tween_callback(mi.queue_free)
