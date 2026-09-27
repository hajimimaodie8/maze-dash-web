import os, re, collections

E = r"E:\maze_dash\_work\analysis\extracted"

per_file = {}
for i in range(1, 9):
    txt = open(os.path.join(E, f"package{i}.txt"), encoding="utf-8").read()
    ids = []
    cur = None
    grids = {}
    for line in txt.split("\n"):
        line = line.rstrip("\r")
        if line == "":
            continue
        if line.startswith("#"):
            cur = int(line.strip("# ,"))
            ids.append(cur)
            grids[cur] = []
        else:
            grids[cur].append([c.strip() for c in line.split(",")])
    per_file[i] = (ids, grids)

print("=== per package ===")
for i in range(1, 9):
    ids, _ = per_file[i]
    print(f"  package{i}: {len(ids)} maps, ids {min(ids)}..{max(ids)}, sorted_ok={ids == sorted(ids)}")

# duplicates across files
owners = collections.defaultdict(list)
for i in range(1, 9):
    for mid in per_file[i][1]:
        owners[mid].append(i)
dups = {k: v for k, v in owners.items() if len(v) > 1}
print("\nmapIds present in more than one package:", len(dups))
for k in sorted(dups)[:20]:
    print("   mapId", k, "-> packages", dups[k])

# total
allids = sorted(owners)
print("\ntotal distinct mapIds:", len(allids), "range", allids[0], "..", allids[-1])
missing = [x for x in range(1, allids[-1] + 1) if x not in owners]
print("missing:", missing[:20])

# compare map5 grids across any file that has it
print("\n=== mapId 5 grid(s) ===")
for i in range(1, 9):
    g = per_file[i][1].get(5)
    if g:
        print(f"  package{i}:")
        for row in g:
            print("     ", ",".join(row))
