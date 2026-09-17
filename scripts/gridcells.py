# for every gauge in src/data/gauges.json, the raw 1 km grid at the station over the WMO
# periods: the exact cell, and the highest cell within 2 km (summits sit at cell edges).
#   python3 scripts/gridcells.py          (reads raw/grids)
# averaged over the years the gauge has. writes the values back into gauges.json under "grid".
import gzip, json, os, sys
import numpy as np
from pyproj import Transformer

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "raw", "grids")
ROOT = os.path.join(os.path.dirname(__file__), "..")
G = json.load(open(f"{ROOT}/src/data/gauges.json"))
PERIODS = {"1961-1990": (1961, 1990), "1991-2020": (1991, 2020)}
t = Transformer.from_crs("EPSG:4326", "EPSG:31467", always_xy=True)

def load(y):
    with gzip.open(f"{SRC}/snow_{y}.asc.gz", "rt") as f:
        hdr = {}
        for _ in range(6):
            k, v = f.readline().split(); hdr[k.upper()] = float(v)
        a = np.loadtxt(f)
    a[a == hdr["NODATA_VALUE"]] = np.nan
    return a, hdr

first, hdr = load(1961)
nrows = first.shape[0]
cells = {}
for sid, g in G.items():
    x, y = t.transform(g["lon"], g["lat"])
    c = int((x - hdr["XLLCORNER"]) / hdr["CELLSIZE"]); r = int(nrows - (y - hdr["YLLCORNER"]) / hdr["CELLSIZE"])
    cells[sid] = (r, c)
    g["grid"] = {"row": r, "col": c}

acc = {sid: {k: {"exact": [], "near": []} for k in PERIODS} for sid in G}
for y in range(1961, 2021):
    a = first if y == 1961 else load(y)[0]
    k = "1961-1990" if y <= 1990 else "1991-2020"
    for sid, (r, c) in cells.items():
        if y not in G[sid]["periods"][k]["yearsUsed"]:
            continue   # the grid is averaged over the same years the gauge has
        win = a[max(r - 2, 0): r + 3, max(c - 2, 0): c + 3]
        acc[sid][k]["exact"].append(a[r, c]); acc[sid][k]["near"].append(np.nanmax(win))
    print(y, end=" ", flush=True)
print()
for sid, g in G.items():
    for k in PERIODS:
        e, n = acc[sid][k]["exact"], acc[sid][k]["near"]
        g["grid"][k] = {"exact": round(float(np.nanmean(e)), 1), "near": round(float(np.nanmean(n)), 1)}
    print(f'{g["name"]:26s} gauge {g["periods"]["1961-1990"]["mean"]} / {g["periods"]["1991-2020"]["mean"]}   grid cell {g["grid"]["1961-1990"]["exact"]} / {g["grid"]["1991-2020"]["exact"]}   best cell within 2 km {g["grid"]["1961-1990"]["near"]} / {g["grid"]["1991-2020"]["near"]}')
json.dump(G, open(f"{ROOT}/src/data/gauges.json", "w"), indent=1)
