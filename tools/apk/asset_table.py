import json, os, re, shutil

APK = r"E:\maze_dash\_work\apk\assets"
RAW = os.path.join(APK, "res", "raw-assets")
OUT = r"E:\maze_dash\_work\analysis"

src = open(os.path.join(APK, "src", "settings.js"), encoding="utf-8").read()
m = re.search(r"window\._CCSettings\s*=\s*(\{.*\})\s*;?\s*$", src, re.S)
raw_json = m.group(1)
# settings.js is JS object literal with unquoted-ish keys? try json first
try:
    S = json.loads(raw_json)
except Exception:
    # JS literal: quote bare keys
    fixed = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', raw_json)
    S = json.loads(fixed)

print("settings keys:", sorted(S.keys()))
print("debug:", S.get("debug"), " platform:", S.get("platform"), " launchScene:", S.get("launchScene"))
asset_types = S.get("assetTypes")
print("assetTypes:", asset_types)
uuid_list = S.get("uuids")
print("uuids count:", len(uuid_list) if uuid_list else None)

raw_assets = S["rawAssets"]
print("mounts:", list(raw_assets.keys()))

raw_index = {}
for dirpath, _, files in os.walk(RAW):
    for fn in files:
        stem, ext = os.path.splitext(fn)
        raw_index[stem.lower()] = os.path.join(dirpath, fn)

B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
vals = [64] * 123
for i, c in enumerate(B64):
    vals[ord(c)] = i
HEX = "0123456789abcdef"


def decode_uuid(b64):
    uuid = str(b64).split("@")[0]
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


def resolve(uuid):
    uuid = str(uuid)
    f = raw_index.get(uuid.lower())
    if f:
        return f
    return raw_index.get(decode_uuid(uuid).lower())

table = []
unresolved = []
for mount, entries in raw_assets.items():
    for aid, entry in entries.items():
        path = entry[0]
        t = entry[1]
        if isinstance(t, int) and asset_types:
            t = asset_types[t]
        uuid = aid
        if uuid_list and not re.match(r"^[0-9a-f]{8}-", aid):
            try:
                uuid = uuid_list[int(aid)]
            except Exception:
                pass
        f = resolve(uuid)
        table.append({"mount": mount, "id": aid, "path": path, "type": t,
                      "uuid": uuid, "file": f})
        if not f:
            unresolved.append((mount, path, t, uuid))

with open(os.path.join(OUT, "asset_table.json"), "w", encoding="utf-8") as fh:
    json.dump(table, fh, ensure_ascii=False, indent=1)

print(f"\nraw asset entries: {len(table)}  resolved to file: {sum(1 for r in table if r['file'])}  unresolved: {len(unresolved)}")

import collections
bytype = collections.Counter(r["type"] for r in table)
print("\nby type:", dict(bytype))

print("\n=== audio entries ===")
for r in table:
    if r["type"] == "cc.AudioClip" or (r["path"] or "").lower().endswith((".mp3", ".ogg", ".wav")):
        print(f'  {r["path"]:44s} -> {os.path.basename(r["file"]) if r["file"] else "MISSING"}')

print("\n=== unresolved sample ===")
for u in unresolved[:25]:
    print("  ", u)

print("\n=== all raw paths (grouped) ===")
paths = sorted(set(r["path"] for r in table if r["path"]))
for p in paths[:400]:
    print("  ", p)
print("total distinct paths:", len(paths))
