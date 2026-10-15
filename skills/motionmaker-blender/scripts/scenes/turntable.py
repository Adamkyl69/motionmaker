# A turntable scene for Blender (run by blender.mjs; config.json is passed after "--"). Procedural hero object (or an imported glb/gltf/obj/stl/ply),
# soft three-light rig, a floor, the camera circling once over the frames. Cycles on the CPU with a fixed seed and fixed threads, so the same scene on
# the same machine renders the same pixels. Edit config.json for colours and quality; copy this file and change it for anything else.
import bpy, sys, json, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
cfg = json.load(open(argv[0]))
if "--samples" in argv: cfg["samples"] = int(argv[argv.index("--samples") + 1])

def srgb(h):                                  # "#RRGGBB" -> linear RGBA (Blender colours are linear)
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
sc.cycles.samples = cfg["samples"]; sc.cycles.seed = cfg["seed"]; sc.cycles.use_animated_seed = False
sc.cycles.use_denoising = bool(cfg["denoise"])
sc.render.threads_mode = "FIXED"; sc.render.threads = max(1, min(8, os.cpu_count() or 1))
sc.render.resolution_x = cfg["width"]; sc.render.resolution_y = cfg["height"]; sc.render.resolution_percentage = 100
sc.render.fps = cfg["fps"]; sc.frame_start = 1; sc.frame_end = cfg["frames"]
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGB"
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"   # brand colours stay as given

w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = srgb(cfg["bg"]); bg.inputs[1].default_value = 0.9
if cfg.get("hdri"):   # light (and reflections) from the HDRI; the camera still sees the flat brand background
    nt = w.node_tree; env = nt.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(cfg["hdri"])
    mp = nt.nodes.new("ShaderNodeMapping"); tc = nt.nodes.new("ShaderNodeTexCoord"); mp.inputs["Rotation"].default_value[2] = math.radians(cfg.get("hdriRotation", 0))
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    light_bg = nt.nodes.new("ShaderNodeBackground"); light_bg.inputs[1].default_value = cfg.get("hdriStrength", 1.0); nt.links.new(env.outputs["Color"], light_bg.inputs["Color"])
    lp = nt.nodes.new("ShaderNodeLightPath"); mx = nt.nodes.new("ShaderNodeMixShader"); out = nt.nodes["World Output"]
    nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs[0]); nt.links.new(light_bg.outputs[0], mx.inputs[1]); nt.links.new(bg.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs["Surface"])

def material(name, colour, rough, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = srgb(colour); p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    if "Coat Weight" in p.inputs: p.inputs["Coat Weight"].default_value = coat
    return m

# the floor
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); floor = bpy.context.object
if cfg.get("floorMaterial"):   # a PBR material folder (diffuse, normal (GL), roughness), e.g. from polyhaven.mjs get <texture id>
    fm = bpy.data.materials.new("floorpbr"); fm.use_nodes = True; nt = fm.node_tree; bsdf = nt.nodes["Principled BSDF"]; d = cfg["floorMaterial"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); s_ = cfg.get("floorScale", 4); mp.inputs["Scale"].default_value = (s_ * 15, s_ * 15, 1); nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
    def tex(name, colour=True):
        for ext in (".jpg", ".png"):
            f = os.path.join(d, name + ext)
            if os.path.exists(f):
                n = nt.nodes.new("ShaderNodeTexImage"); n.image = bpy.data.images.load(f); n.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"; nt.links.new(mp.outputs["Vector"], n.inputs["Vector"]); return n
    t = tex("diffuse"); nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    r = tex("roughness", False)
    if r: nt.links.new(r.outputs["Color"], bsdf.inputs["Roughness"])
    nm = tex("normal", False)
    if nm: nmap = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(nm.outputs["Color"], nmap.inputs["Color"]); nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    floor.data.materials.append(fm)
else:
    floor.data.materials.append(material("floor", cfg["floor"], 0.55))

# the hero
hero = []
if cfg.get("model"):
    f = cfg["model"]; ext = os.path.splitext(f)[1].lower(); before = set(bpy.data.objects)
    if ext in (".glb", ".gltf"): bpy.ops.import_scene.gltf(filepath=f)
    elif ext == ".obj": bpy.ops.wm.obj_import(filepath=f)
    elif ext == ".stl": bpy.ops.wm.stl_import(filepath=f)
    elif ext == ".ply": bpy.ops.wm.ply_import(filepath=f)
    else: raise SystemExit("unsupported model format " + ext)
    hero = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    if not hero: raise SystemExit("the model has no mesh")
else:
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1)); body = bpy.context.object; body.scale = (1.5, 1.0, 0.8)
    bpy.ops.object.transform_apply(scale=True)
    bev = body.modifiers.new("b", "BEVEL"); bev.width = 0.28; bev.segments = 8
    sub = body.modifiers.new("s", "SUBSURF"); sub.levels = 2
    body.data.materials.append(material("body", cfg["object"], 0.28, 0.0, 0.6)); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.38, location=(0.55, -0.2, 1.75), segments=48, ring_count=24); orb = bpy.context.object
    orb.data.materials.append(material("accent", cfg["accent"], 0.18, 0.0, 0.8)); bpy.ops.object.shade_smooth()
    hero = [body, orb]

for o in hero:                                # a model with no material of its own gets the object colour
    if not o.data.materials: o.data.materials.append(material("model", cfg["object"], 0.35, 0.0, 0.4))
bpy.context.view_layer.update()               # imported objects have no world matrix until the scene is updated

# fit the hero into a 2.6 m box standing on the floor, centred
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in hero:
    for c in o.bound_box:
        v = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, v)); hi = Vector(map(max, hi, v))
size = max((hi - lo).x, (hi - lo).y, (hi - lo).z)
if cfg.get("model"):
    k = 2.6 / size; mid = (lo + hi) / 2
    root = bpy.data.objects.new("hero", None); sc.collection.objects.link(root)
    for o in hero:
        if o.parent is None: o.parent = root
    root.scale = (k, k, k); root.location = (-mid.x * k, -mid.y * k, -lo.z * k)
    height = (hi.z - lo.z) * k
else:
    height = hi.z - lo.z

# lights: a large soft key, a fill, a rim
def area(name, loc, energy, sizeM, colour=(1, 1, 1)):
    d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.size = sizeM; d.color = colour
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    t = o.constraints.new("TRACK_TO"); tgt = bpy.data.objects.new(name + "_t", None); sc.collection.objects.link(tgt); tgt.location = (0, 0, height * 0.45)
    t.target = tgt; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
k_ = 0.35 if cfg.get("hdri") else 1.0   # with an HDRI the rig only shapes the light; the HDRI does most of the work
area("key", (5, -5, 7), 420 * k_, 5); area("fill", (-6, -3, 3), 220 * k_, 6, (0.9, 0.95, 1)); area("rim", (-1, 6, 5), 420 * k_, 3)

# the camera on a pivot that turns once over the frames (linear, so the loop has no hitch)
pivot = bpy.data.objects.new("pivot", None); sc.collection.objects.link(pivot); pivot.location = (0, 0, 0)
cam = bpy.data.cameras.new("cam"); cam.lens = 55; co = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co); sc.camera = co; co.parent = pivot
el = math.radians(cfg["elevation"]); dist = cfg["distance"]
co.location = (0, -dist * math.cos(el), dist * math.sin(el) + height * 0.4)
tr = co.constraints.new("TRACK_TO"); tg = bpy.data.objects.new("look", None); sc.collection.objects.link(tg); tg.location = (0, 0, height * 0.45)
tr.target = tg; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
n = cfg["frames"]; last = n + 1 if cfg.get("loop", True) else n
pivot.rotation_euler = (0, 0, 0); pivot.keyframe_insert("rotation_euler", frame=1)
pivot.rotation_euler = (0, 0, math.tau); pivot.keyframe_insert("rotation_euler", frame=last)
for fc in pivot.animation_data.action.fcurves if hasattr(pivot.animation_data.action, "fcurves") else []:
    for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
