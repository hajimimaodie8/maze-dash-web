import json, os, re, shutil, collections

APK = r"E:\maze_dash\_work\apk\assets"
IMPORT = os.path.join(APK, "res", "import")
RAW = os.path.join(APK, "res", "raw-assets")
OUT = r"E:\maze_dash\_work\analysis\art"

B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
vals = [64] * 123
for i, c in enumerate(B64):
    vals[ord(c)] = i
HEX = "0123456789abcdef"


def decode_uuid(b64):
    uuid = b64.split("@")[0]
    if len(uuid) != 22:
        return uuid
    out = [uuid[0], uuid[1]]
    for i in range(2, 22, 2):
        lhs = vals[ord(uuid[i])]
        rhs = vals[ord(uuid[i + 1])]
        out.append(HEX[lhs >> 2])
        out.append(HEX[((lhs & 3) << 2) | (rhs >> 4)])
        out.append(HEX[rhs & 0xF])
    h = "".join(out)
    return f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


# index raw assets by uuid (filename without ext)
raw_index = {}
for dirpath, _, files in os.walk(RAW):
    for fn in files:
        stem, ext = os.path.splitext(fn)
        raw_index[stem.lower()] = os.path.join(dirpath, fn)

frames = {}      # name -> texture uuid (decoded)
sizes = {}       # name -> rect/originalSize
audio = {}       # name -> file
other = []


def walk(o, src):
    if isinstance(o, dict):
        t = o.get("__type__")
        if t == "cc.SpriteFrame":
            c = o.get("content") or {}
            nm = c.get("name")
            tex = c.get("texture")
            if nm and tex:
                frames[nm] = decode_uuid(tex)
                sizes[nm] = (tuple(c.get("rect") or ()), tuple(c.get("originalSize") or ()),
                             tuple(c.get("offset") or ()), tuple(c.get("capInsets") or ()))
        elif t == "cc.AudioClip":
            nm = o.get("_name")
            u = o.get("_uuid")
            if nm and u:
                audio[nm] = decode_uuid(u)
        elif t in ("cc.TextAsset", "cc.JsonAsset", "cc.Prefab", "cc.SceneAsset", "cc.ParticleAsset", "cc.TTFFont"):
            other.append((t, o.get("_name")))
        for v in o.values():
            walk(v, src)
    elif isinstance(o, list):
        for v in o:
            walk(v, src)


for dirpath, _, files in os.walk(IMPORT):
    for fn in files:
        if fn.endswith(".json"):
            try:
                walk(json.load(open(os.path.join(dirpath, fn), encoding="utf-8")), fn)
            except Exception as e:
                print("parse fail", fn, e)

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT, exist_ok=True)

missing = []
copied = 0
for name, uuid in sorted(frames.items()):
    src = raw_index.get(uuid.lower())
    if not src:
        missing.append((name, uuid))
        continue
    ext = os.path.splitext(src)[1]
    safe = name.replace("/", "_").replace("\\", "_")
    shutil.copy2(src, os.path.join(OUT, safe + ext))
    copied += 1

print(f"SpriteFrames: {len(frames)}  copied: {copied}  missing texture: {len(missing)}")
if missing[:10]:
    print("  e.g. missing:", missing[:10])

print("\n=== audio clips ===")
ac = 0
amiss = []
for name, uuid in sorted(audio.items()):
    src = raw_index.get(uuid.lower())
    if src:
        shutil.copy2(src, os.path.join(OUT, "sfx_" + name + os.path.splitext(src)[1]))
        ac += 1
    else:
        amiss.append(name)
print(f"AudioClips: {len(audio)} copied {ac} missing {len(amiss)} {amiss[:8]}")

with open(os.path.join(OUT, "_spriteframe_index.json"), "w", encoding="utf-8") as f:
    json.dump({k: {"texture_uuid": v, "rect": sizes[k][0], "originalSize": sizes[k][1],
                   "offset": sizes[k][2], "capInsets": sizes[k][3]} for k, v in frames.items()},
              f, ensure_ascii=False, indent=1, sort_keys=True)

print("\nsample frame names:", sorted(frames)[:15])
print("total art files:", len(os.listdir(OUT)))
