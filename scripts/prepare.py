# reads the DWD annual snow cover day grids (ESRI ascii, 1 km, EPSG:31467), averages each
# thirty-year period, smooths lightly, samples one row every ROW_STEP km and one point every
# COL_STEP km, and writes the two period grids as uint16 plus meta.json. run from the repo root:
#   python3 scripts/prepare.py            (reads raw/grids)
#   python3 scripts/prepare.py <dir>      (or point it somewhere else)
import gzip, json, sys, os
import numpy as np
from scipy.ndimage import gaussian_filter

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "raw", "grids")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data")
ROW_STEP, COL_STEP = 6, 2
SIGMA = (1.5, 2.5)   # km, along y then x. keeps peaks, removes 1 km grain
NODATA = 65535
YEARS = list(range(1951, 2026))
# 1961 to 1990 is the WMO reference period, 1991 to 2020 the current WMO standard period
PERIODS = {"1961-1990": (1961, 1990), "1991-2020": (1991, 2020)}

def load(y):
    with gzip.open(f"{SRC}/snow_{y}.asc.gz", "rt") as f:
        hdr = {}
        for _ in range(6):
            k, v = f.readline().split()
            hdr[k.upper()] = float(v)
        a = np.loadtxt(f)
    a[a == hdr["NODATA_VALUE"]] = np.nan
    return a, hdr

def sample(a):
    # smooth, renormalised at the coast so a shore cell is not pulled toward the sea's zero,
    # then keep every ROW_STEP-th row and COL_STEP-th column, rounded to whole days
    mask = ~np.isnan(a)
    filled = np.where(mask, a, 0.0)
    num = gaussian_filter(filled, SIGMA)
    den = gaussian_filter(mask.astype(float), SIGMA)
    sm = np.where(den > 0.5, num / np.maximum(den, 1e-6), np.nan)
    sub = sm[::ROW_STEP, ::COL_STEP]
    return np.where(np.isnan(sub), NODATA, np.rint(np.clip(sub, 0, 400))).astype("<u2")

def stats(a):
    mask = ~np.isnan(a)
    i = np.nanargmax(a); r, c = np.unravel_index(i, a.shape)
    return {
        "mean": round(float(np.nanmean(a)), 2),
        "max": int(np.nanmax(a)),
        "maxRow": int(r), "maxCol": int(c),
        "shareAny": round(float(np.mean(a[mask] >= 1)), 4),
        "share30": round(float(np.mean(a[mask] >= 30)), 4),
        "share60": round(float(np.mean(a[mask] >= 60)), 4),
    }

meta = {"rowStep": ROW_STEP, "colStep": COL_STEP, "nodata": NODATA, "years": YEARS, "stats": {}, "periods": {}}
acc = {k: [None, None] for k in PERIODS}   # running sum, count of valid years per cell
for y in YEARS:
    a, hdr = load(y)
    meta["stats"][y] = stats(a)
    for k, (y0, y1) in PERIODS.items():
        if y0 <= y <= y1:
            if acc[k][0] is None:
                acc[k] = [np.zeros_like(a), np.zeros_like(a)]
            ok = ~np.isnan(a)
            acc[k][0][ok] += a[ok]
            acc[k][1][ok] += 1
    if y == YEARS[0]:
        sub = a[::ROW_STEP, ::COL_STEP]
        meta.update({"nrows": int(a.shape[0]), "ncols": int(a.shape[1]),
                     "subRows": int(sub.shape[0]), "subCols": int(sub.shape[1]),
                     "xll": hdr["XLLCORNER"], "yll": hdr["YLLCORNER"], "cellsize": hdr["CELLSIZE"]})
    print(y, meta["stats"][y]["mean"], meta["stats"][y]["max"], flush=True)

for k, (y0, y1) in PERIODS.items():
    total, n = acc[k]
    need = y1 - y0 + 1
    pm = np.where(n == need, total / np.maximum(n, 1), np.nan)  # only cells with every year
    sample(pm).tofile(f"{OUT}/snow_{k}.bin")
    meta["periods"][k] = {**stats(pm), "from": y0, "to": y1,
                          "cellsDropped": int(np.sum((n > 0) & (n < need)))}
    print(k, meta["periods"][k]["mean"], meta["periods"][k]["max"], "dropped", meta["periods"][k]["cellsDropped"], flush=True)

with open(f"{OUT}/meta.json", "w") as f:
    json.dump(meta, f)
print("done", meta["subRows"], "x", meta["subCols"])
