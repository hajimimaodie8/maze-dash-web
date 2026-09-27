import json, os, collections

ROOT = r"E:\maze_dash\_work\apk\assets\res\import"
OUT = r"E:\maze_dash\_work\analysis\extracted"
os.makedirs(OUT, exist_ok=True)

found = []

def walk(o, src):
    if isinstance(o, dict):
        t = o.get("__type__")
        if t == "cc.JsonAsset":
            found.append(("json", o.get("_name"), o.get("json"), src))
        elif t == "cc.TextAsset":
            found.append(("text", o.get("_name"), o.get("text"), src))
        for v in o.values():
            walk(v, src)
    elif isinstance(o, list):
        for v in o:
            walk(v, src)

for dirpath, _, filenames in os.walk(ROOT):
    for fn in filenames:
        if not fn.endswith(".json"):
            continue
        p = os.path.join(dirpath, fn)
        try:
            data = json.load(open(p, encoding="utf-8"))
        except Exception as e:
            print("FAIL", fn, e)
            continue
        walk(data, fn)

print("found", len(found))
manifest = []
for kind, name, payload, src in found:
    safe = (name or src.split(".")[0]).replace("/", "_")
    if kind == "json":
        ext = ".json"
        content = json.dumps(payload, ensure_ascii=False, indent=1)
    else:
        ext = ".txt"
        content = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    path = os.path.join(OUT, safe + ext)
    n = 1
    while os.path.exists(path):
        path = os.path.join(OUT, f"{safe}_{n}{ext}")
        n += 1
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    manifest.append((kind, name, src, len(content), os.path.basename(path)))

print(f"{'kind':6s} {'name':22s} {'size':>7s}  file")
for kind, name, src, size, out in sorted(manifest, key=lambda x: (x[0], str(x[1]))):
    print(f"{kind:6s} {str(name):22s} {size:7d}  {out}")

# locate any remaining asset that mentions sz_solution but wasn't captured
import re
for dirpath, _, filenames in os.walk(ROOT):
    for fn in filenames:
        if not fn.endswith(".json"):
            continue
        p = os.path.join(dirpath, fn)
        raw = open(p, encoding="utf-8").read()
        if "sz_solution" in raw:
            print("\n[solution-bearing file]", fn, len(raw))
