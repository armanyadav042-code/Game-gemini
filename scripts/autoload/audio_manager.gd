extends Node
## AudioMan — 100% synthesized audio (no external files).
## Every SFX and music loop is generated as a 16-bit PCM stream at startup.
## To replace with Pixabay recordings later, see docs/ASSET_SOURCES.md.

const SR := 44100

var sfx: Dictionary = {}
var music: Dictionary = {}

var _music_players: Array = []
var _music_idx := 0
var _music_name := "none"
var _pools: Dictionary = {}
var wind_player: AudioStreamPlayer
var ambient_player: AudioStreamPlayer
var siren_player: AudioStreamPlayer
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	_build_sfx()
	_build_music()
	for i in 2:
		var pl := AudioStreamPlayer.new()
		pl.volume_db = -80.0
		add_child(pl)
		_music_players.append(pl)
	wind_player = AudioStreamPlayer.new()
	wind_player.volume_db = -80.0
	add_child(wind_player)
	ambient_player = AudioStreamPlayer.new()
	ambient_player.volume_db = -16.0
	add_child(ambient_player)
	siren_player = AudioStreamPlayer.new()
	siren_player.volume_db = -26.0
	add_child(siren_player)
	set_ambient(true)
	play_music("menu")


# ---------------------------------------------------------------- synth core

func _wav(samples: PackedFloat32Array, loop := false) -> AudioStreamWAV:
	if not loop:
		# kill the end-of-buffer click
		var n := samples.size()
		var L := mini(int(SR * 0.02), n / 4)
		for i in L:
			samples[n - 1 - i] *= i / float(L)
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = SR
	w.stereo = false
	var ba := PackedByteArray()
	ba.resize(samples.size() * 2)
	for i in samples.size():
		var s := clampi(int(samples[i] * 32766.0), -32768, 32767)
		ba[i * 2] = s & 0xFF
		ba[i * 2 + 1] = (s >> 8) & 0xFF
	w.data = ba
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = samples.size()
	return w


func _noise(n: int, seed: int) -> PackedFloat32Array:
	var r := RandomNumberGenerator.new()
	r.seed = seed
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		out[i] = r.randf_range(-1.0, 1.0)
	return out


## one-pole lowpass
func _lp(x: PackedFloat32Array, fc: float) -> PackedFloat32Array:
	var a := 1.0 - exp(-TAU * fc / SR)
	var out := PackedFloat32Array()
	out.resize(x.size())
	var acc := 0.0
	for i in x.size():
		acc += a * (x[i] - acc)
		out[i] = acc
	return out


## one-pole highpass
func _hp(x: PackedFloat32Array, fc: float) -> PackedFloat32Array:
	var a := 1.0 - exp(-TAU * fc / SR)
	var out := PackedFloat32Array()
	out.resize(x.size())
	var prev := 0.0
	for i in x.size():
		var cur := x[i]
		out[i] = a * (cur - prev)
		prev = cur
	return out


## Short fade-in/out on the loop edges (for note-based music loops).
func _fade_edges(x: PackedFloat32Array, ms: int = 60) -> PackedFloat32Array:
	var n := x.size()
	var L := mini(int(SR * ms / 1000.0), n / 4)
	for i in L:
		var g := i / float(L)
		x[i] *= g
		x[n - 1 - i] *= g
	return x


## Fade both ends to zero so the loop wraps without clicks.
func _loop_window(x: PackedFloat32Array, fade_samples: int) -> PackedFloat32Array:
	var n := x.size()
	var out := x.duplicate()
	var L := mini(fade_samples, n / 4)
	for i in L:
		var g := i / float(L)
		out[i] *= g
		out[n - 1 - i] *= g
	return out


func _sine(n: int, freq: float, t0: float = 0.0, phase: float = 0.0) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		out[i] = sin(TAU * freq * (t0 + float(i) / SR) + phase)
	return out


## Add a tone with exponential decay into dst (from offset sample).
func _tone_into(dst: PackedFloat32Array, off: int, dur: int, freq: float, vol: float, decay: float, f_end: float = -1.0) -> void:
	for i in dur:
		if off + i >= dst.size():
			break
		var t := float(i) / SR
		var f := freq
		if f_end > 0.0:
			f = lerpf(freq, f_end, float(i) / dur)
		dst[off + i] += vol * sin(TAU * f * t) * pow(0.5, t * decay)


func _click_into(dst: PackedFloat32Array, off: int, dur: int, vol: float) -> void:
	var nz := _noise(dur, 999 + off)
	for i in dur:
		if off + i >= dst.size():
			break
		dst[off + i] += nz[i] * vol * pow(0.5, float(i) / (SR * 0.006))


# ----------------------------------------------------------------------- SFX

func _build_sfx() -> void:
	# Web shoot: rising filtered-noise whoosh + thwip click
	var n := int(SR * 0.35)
	var buf := PackedFloat32Array(); buf.resize(n)
	var nz := _noise(n, 11)
	var lo := _lp(nz, 1500.0)
	for i in n:
		var t := float(i) / n
		var env := sin(PI * clampf(t * 1.15, 0.0, 1.0))
		buf[i] = lo[i] * env * 0.75
	for i in mini(300, n):
		buf[i] += nz[i] * 0.35 * pow(0.5, float(i) / (SR * 0.004))
	sfx["web_shoot"] = _wav(buf)

	# Web impact / stick
	n = int(SR * 0.14)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, n, 120.0, 0.5, 22.0, 48.0)
	_click_into(buf, 0, int(SR * 0.03), 0.5)
	sfx["web_hit"] = _wav(buf)

	# Zip whoosh
	n = int(SR * 0.30)
	buf = PackedFloat32Array(); buf.resize(n)
	var nz2 := _noise(n, 22)
	var sweep := PackedFloat32Array(); sweep.resize(n)
	var acc := 0.0
	for i in n:
		var t := float(i) / n
		var a := 1.0 - exp(-TAU * lerpf(500.0, 2600.0, t) / SR)
		acc += a * (nz2[i] - acc)
		sweep[i] = acc
	for i in n:
		var t := float(i) / n
		buf[i] = sweep[i] * sin(PI * t) * 1.4
	sfx["zip"] = _wav(buf)

	# Landing thud
	n = int(SR * 0.30)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, n, 62.0, 0.85, 14.0, 34.0)
	var lz := _lp(_noise(n, 33), 260.0)
	for i in n:
		buf[i] += lz[i] * 0.4 * pow(0.5, float(i) / (SR * 0.06))
	sfx["landing"] = _wav(buf)

	# Wall scuff loop
	n = int(SR * 1.0)
	buf = PackedFloat32Array(); buf.resize(n)
	var sz := _lp(_noise(n, 44), 1100.0)
	for i in n:
		var t := float(i) / SR
		buf[i] = sz[i] * (0.55 + 0.35 * sin(TAU * 13.0 * t)) * 0.4
	sfx["scuff"] = _wav(_loop_window(buf, 256), true)

	# Swing wind loop
	n = int(SR * 2.0)
	buf = PackedFloat32Array(); buf.resize(n)
	var wz := _lp(_noise(n, 55), 650.0)
	for i in n:
		var t := float(i) / SR
		buf[i] = wz[i] * (0.8 + 0.2 * sin(TAU * 0.7 * t + 1.0))
	sfx["wind"] = _wav(_loop_window(buf, 512), true)

	# Melee hit (light)
	n = int(SR * 0.14)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, int(SR * 0.09), 190.0, 0.7, 18.0, 70.0)
	_click_into(buf, 0, int(SR * 0.05), 0.65)
	sfx["hit_light"] = _wav(buf)

	# Melee hit (heavy)
	n = int(SR * 0.30)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, n, 130.0, 0.95, 12.0, 36.0)
	var hz := _lp(_noise(n, 66), 420.0)
	for i in n:
		buf[i] += hz[i] * 0.5 * pow(0.5, float(i) / (SR * 0.05))
	sfx["hit_heavy"] = _wav(buf)

	# Enemy grunt
	n = int(SR * 0.38)
	buf = PackedFloat32Array(); buf.resize(n)
	for i in n:
		var t := float(i) / SR
		var f := 82.0 + 10.0 * sin(TAU * 7.0 * t)
		var env := sin(PI * clampf(float(i) / n, 0.0, 1.0))
		buf[i] = (sin(TAU * f * t) * 0.5 + sin(TAU * f * 2.0 * t) * 0.22) * env * 0.8
	sfx["grunt"] = _wav(_lp(buf, 620.0))

	# Gunshot (armed thug)
	n = int(SR * 0.12)
	buf = PackedFloat32Array(); buf.resize(n)
	_click_into(buf, 0, int(SR * 0.05), 0.8)
	_tone_into(buf, 0, int(SR * 0.1), 170.0, 0.5, 20.0, 60.0)
	sfx["shot"] = _wav(buf)

	# Police siren loop
	n = int(SR * 2.0)
	buf = PackedFloat32Array(); buf.resize(n)
	for i in n:
		var t := float(i) / SR
		var f := 780.0 + 170.0 * sin(TAU * 0.75 * t)
		buf[i] = (sin(TAU * f * t) * 0.5 + sin(TAU * f * 2.0 * t) * 0.12) * 0.3
	sfx["siren"] = _wav(_loop_window(buf, 256), true)

	# City ambience loop (low rumble + distant honks)
	n = int(SR * 4.0)
	buf = PackedFloat32Array(); buf.resize(n)
	var az := _lp(_noise(n, 77), 170.0)
	for i in n:
		var t := float(i) / SR
		buf[i] = az[i] * (0.5 + 0.25 * sin(TAU * 0.25 * t))
	_tone_into(buf, int(SR * 0.9), int(SR * 0.22), 420.0, 0.10, 8.0)
	_tone_into(buf, int(SR * 2.9), int(SR * 0.30), 360.0, 0.09, 7.0)
	sfx["ambience"] = _wav(_loop_window(buf, 512), true)

	# Spider-sense ping
	n = int(SR * 0.5)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, int(SR * 0.09), 1568.0, 0.5, 10.0)
	_tone_into(buf, int(SR * 0.16), int(SR * 0.12), 2093.0, 0.45, 9.0)
	var sp := _hp(_noise(n, 88), 4000.0)
	for i in n:
		buf[i] += sp[i] * 0.12 * pow(0.5, float(i) / (SR * 0.02))
	sfx["sense"] = _wav(buf)

	# Player hurt
	n = int(SR * 0.22)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, n, 95.0, 0.8, 16.0, 42.0)
	_click_into(buf, 0, int(SR * 0.04), 0.4)
	sfx["hurt"] = _wav(buf)

	# Combo ding (pitched by caller)
	n = int(SR * 0.12)
	buf = PackedFloat32Array(); buf.resize(n)
	_tone_into(buf, 0, n, 880.0, 0.4, 16.0)
	_tone_into(buf, 0, n, 1320.0, 0.2, 18.0)
	sfx["combo"] = _wav(buf)

	# Dodge whoosh
	n = int(SR * 0.25)
	buf = PackedFloat32Array(); buf.resize(n)
	var dz := _lp(_noise(n, 99), 900.0)
	for i in n:
		var t := float(i) / n
		buf[i] = dz[i] * sin(PI * t) * 0.9
	sfx["dodge"] = _wav(buf)

	# Victory sting
	n = int(SR * 1.1)
	buf = PackedFloat32Array(); buf.resize(n)
	var notes := [523.25, 659.25, 783.99, 1046.5]
	for k in notes.size():
		_tone_into(buf, int(k * SR * 0.22), int(SR * 0.5), notes[k], 0.4, 4.5)
		_tone_into(buf, int(k * SR * 0.22), int(SR * 0.5), notes[k] * 2.0, 0.15, 6.0)
	sfx["victory"] = _wav(buf)

	# Defeat sting
	n = int(SR * 1.3)
	buf = PackedFloat32Array(); buf.resize(n)
	var notes2 := [392.0, 329.63, 261.63, 196.0]
	for k in notes2.size():
		_tone_into(buf, int(k * SR * 0.3), int(SR * 0.6), notes2[k], 0.45, 3.5)
	sfx["defeat"] = _wav(buf)


# -------------------------------------------------------------------- music
## All loops are 4 seconds and every envelope reaches zero at the loop
## boundary, so the wrap is silent-to-silent = seamless.

func _build_music() -> void:
	var n := int(SR * 4.0)

	# Explore: Am -> F pad + soft 8th-note arpeggio
	var buf := PackedFloat32Array(); buf.resize(n)
	var chords := [[110.0, 164.81, 220.0, 261.63, 329.63], [87.31, 130.81, 174.61, 220.0, 261.63]]
	for c in 2:
		var t_start := float(c * 2)
		var half := int(SR * 2.0)
		for i in half:
			var t := float(i) / SR
			var env := minf(minf(t / 0.5, (2.0 - t) / 0.5), 1.0)
			var s := 0.0
			for f in chords[c]:
				s += sin(TAU * f * t) * 0.055 + sin(TAU * f * 1.004 * t) * 0.03
			buf[int(t_start * SR) + i] += s * env
	# arpeggio: 8th notes
	var arp := [440.0, 523.25, 659.25, 523.25, 349.23, 440.0, 523.25, 440.0]
	for k in 16:
		var f := arp[k % arp.size()]
		_tone_into(buf, int(k * SR * 0.25), int(SR * 0.18), f, 0.10, 8.0)
	music["explore"] = _wav(_fade_edges(buf), true)

	# Combat: kick / snare / hats / bass / 16th arps (120 bpm, 2 bars)
	buf = PackedFloat32Array(); buf.resize(n)
	for b in 4:
		var off := int(b * SR)
		_tone_into(buf, off, int(SR * 0.2), 120.0, 0.75, 16.0, 40.0)  # kick
		if b % 2 == 1:
			var sn := _hp(_noise(int(SR * 0.14), 100 + b), 1600.0)
			for i in sn.size():
				buf[off + i] += sn[i] * 0.3 * pow(0.5, float(i) / (SR * 0.025))
	for k in 8:
		_tone_into(buf, int(k * SR * 0.5), int(SR * 0.05), 3000.0, 0.12, 40.0)  # hat
		_tone_into(buf, int(k * SR * 0.5), int(SR * 0.05), 2400.0, 0.08, 40.0)
	var bassline := [55.0, 55.0, 55.0, 65.41, 55.0, 55.0, 73.42, 65.41]
	for k in 16:
		var off := int(k * SR * 0.25)
		var f := bassline[k % bassline.size()]
		for i in int(SR * 0.2):
			if off + i >= n:
				break
			var t := float(i) / SR
			buf[off + i] += (sin(TAU * f * t) * 0.5 + sin(TAU * f * 2.0 * t) * 0.25) * 0.34 * pow(0.5, t * 9.0)
	var arpc := [220.0, 261.63, 293.66, 329.63, 293.66, 261.63]
	for k in 32:
		_tone_into(buf, int(k * SR * 0.125), int(SR * 0.10), arpc[k % arpc.size()] * 2.0, 0.075, 14.0)
	music["combat"] = _wav(_fade_edges(buf), true)

	# Stealth: Dm pad + slow heartbeat + sparse ping
	buf = PackedFloat32Array(); buf.resize(n)
	for i in n:
		var t := float(i) / SR
		var env := 0.5 + 0.5 * sin(TAU * t / 4.0)
		var s := 0.0
		for f in [73.42, 110.0, 146.83, 174.61]:
			s += sin(TAU * f * t) * 0.05
		buf[i] += s * env
	for h in 2:
		var off := int(h * SR * 2.0 + SR * 0.4)
		_tone_into(buf, off, int(SR * 0.09), 52.0, 0.5, 22.0)
		_tone_into(buf, off + int(SR * 0.18), int(SR * 0.09), 48.0, 0.4, 22.0)
	_tone_into(buf, int(SR * 3.2), int(SR * 0.4), 880.0, 0.05, 5.0)
	music["stealth"] = _wav(_fade_edges(buf), true)

	music["menu"] = music["explore"]


# -------------------------------------------------------------------- public

func play_sfx(name: String, pos: Vector3 = Vector3.INF, pitch: float = 1.0, vol_db: float = 0.0) -> void:
	if not sfx.has(name):
		return
	if pos != Vector3.INF:
		var pa := AudioStreamPlayer3D.new()
		add_child(pa)
		pa.stream = sfx[name]
		pa.global_position = pos
		pa.pitch_scale = pitch
		pa.volume_db = vol_db
		pa.max_distance = 70.0
		# INVERSE_SQUARE_DISTANCE is the model that honours the max_distance cutoff below.
		pa.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_SQUARE_DISTANCE
		pa.finished.connect(func() -> void: pa.queue_free())
		pa.play()
		return
	if not _pools.has(name):
		var arr: Array = []
		for i in 4:
			var pl := AudioStreamPlayer.new()
			add_child(pl)
			arr.append(pl)
		_pools[name] = arr
	var pool: Array = _pools[name]
	for pl in pool:
		if not (pl as AudioStreamPlayer).playing:
			_pl_sfx(pl as AudioStreamPlayer, sfx[name], pitch, vol_db)
			return
	_pl_sfx(pool[0] as AudioStreamPlayer, sfx[name], pitch, vol_db)


func _pl_sfx(pl: AudioStreamPlayer, stream: AudioStream, pitch: float, vol_db: float) -> void:
	pl.stream = stream
	pl.pitch_scale = pitch
	pl.volume_db = vol_db + linear_to_db(maxf(_vol_sfx, 0.001))
	pl.play()


func play_music(name: String) -> void:
	if _music_name == name:
		return
	_music_name = name
	var cur := _music_players[_music_idx] as AudioStreamPlayer
	var fade_out := create_tween()
	fade_out.tween_property(cur, "volume_db", -80.0, 1.2)
	if name == "none" or not music.has(name):
		return
	var nxt := 1 - _music_idx
	_music_idx = nxt
	var pl := _music_players[nxt] as AudioStreamPlayer
	pl.stream = music[name]
	pl.volume_db = -80.0
	pl.play()
	var fade_in := create_tween()
	fade_in.tween_property(pl, "volume_db", -10.0, 1.6)


## Wind loop with pitch/volume scaled to movement speed.
func update_wind(speed: float, dt: float) -> void:
	if speed > 7.0:
		if not wind_player.playing:
			wind_player.stream = sfx["wind"]
			wind_player.play()
		wind_player.pitch_scale = clampf(0.8 + speed / 32.0, 0.8, 2.4)
		var vol := lerpf(-26.0, -3.0, clampf((speed - 7.0) / 24.0, 0.0, 1.0))
		wind_player.volume_db = lerpf(wind_player.volume_db, vol, 1.0 - exp(-8.0 * dt))
	else:
		if wind_player.playing:
			wind_player.volume_db = lerpf(wind_player.volume_db, -80.0, 1.0 - exp(-10.0 * dt))
			if wind_player.volume_db < -78.0:
				wind_player.stop()


func set_ambient(on: bool) -> void:
	if on and not ambient_player.playing:
		ambient_player.stream = sfx["ambience"]
		ambient_player.play()
	elif not on and ambient_player.playing:
		ambient_player.stop()


func set_siren(on: bool) -> void:
	if on and not siren_player.playing:
		siren_player.stream = sfx["siren"]
		siren_player.play()
	elif not on and siren_player.playing:
		siren_player.stop()


var _vol_sfx := 1.0
var _vol_music := 1.0


func set_volumes(master: float, sfx_vol: float, music_vol: float) -> void:
	_vol_sfx = sfx_vol
	_vol_music = music_vol
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(master, 0.001)))
	for i in _music_players.size():
		var pl := _music_players[i] as AudioStreamPlayer
		if pl.playing:
			pl.volume_db = linear_to_db(maxf(music_vol, 0.001)) - 10.0
