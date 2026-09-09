extends Area3D
## Enemy projectile (armed thug "web-jar" / pistol slug).

var vel := Vector3.ZERO
var dmg := 9.0
var life := 3.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 1 | 2  # city + player
	monitoring = true
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.1
	sm.height = 0.2
	mi.mesh = sm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.55, 0.15)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.5, 0.1)
	mat.emission_energy_multiplier = 2.5
	mi.material_override = mat
	add_child(mi)
	var cs := CollisionShape3D.new()
	var shp := SphereShape3D.new()
	shp.radius = 0.16
	cs.shape = shp
	add_child(cs)
	body_entered.connect(_on_body)
	area_entered.connect(_on_area)


func _physics_process(delta: float) -> void:
	life -= delta
	if life <= 0.0:
		queue_free()
		return
	global_position += vel * delta


func _on_body(body: Node) -> void:
	if body is CharacterBody3D and body.has_method("take_damage"):
		var b: Variant = body
		b.take_damage(dmg, vel.normalized(), false)
		_die()
	elif body is StaticBody3D:
		_die()


func _on_area(area: Area3D) -> void:
	var p: Variant = area.get_parent()
	if p != null and p.has_method("take_damage") and p is CharacterBody3D:
		p.take_damage(dmg, vel.normalized(), false)
		_die()


func _die() -> void:
	Fx.spawn_hit_spark(global_position, false)
	queue_free()
