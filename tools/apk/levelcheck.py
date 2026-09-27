import json, re, os
E = r"E:\maze_dash\_work\analysis\extracted"
levels = json.load(open(os.path.join(E,"levels.json"), encoding="utf-8"))
print("levels.json entries:", len(levels))
from collections import defaultdict
byw = defaultdict(list)
for k,v in levels.items():
    byw[v["wordId"]].append(v["levelId"])
for w in sorted(byw): print(f"  world {w}: {len(byw[w])} levels  ids {min(byw[w])}..{max(byw[w])}")

maps = {}
for i in range(1,9):
    p = os.path.join(E, f"package{i}.txt")
    txt = open(p, encoding="utf-8").read()
    cur = None
    for line in txt.split("\n"):
        line = line.rstrip("\r")
        if line == "": continue
        if line.startswith("#"):
            cur = int(line.strip("# ,"))
            maps[cur] = []
        else:
            maps[cur].append(line.split(","))
print("\npuzzle maps parsed:", len(maps))
ids = sorted(maps)
print("mapId range:", ids[0], "..", ids[-1], " missing:", [x for x in range(ids[0], ids[-1]+1) if x not in maps])
# shapes
shapes = {}
for mid, rows in maps.items():
    shapes[mid] = (len(rows), len(rows[0]) if rows else 0, all(len(r)==len(rows[0]) for r in rows))
bad = {k:v for k,v in shapes.items() if not v[2]}
print("ragged maps:", bad)
ref = set(v["mapId"] for v in levels.values())
print("mapIds referenced by levels:", len(ref), "missing layouts:", sorted(ref - set(maps)))
print("sample shapes:", {k: shapes[k][:2] for k in ids[:6]})
# char inventory
chars = set()
for rows in maps.values():
    for r in rows: chars.update(x.strip() for x in r)
print("tile chars used:", sorted(chars))
