# Does the finding depend on the periods we chose, or on the country average?
# Answers both with numbers, into src/data/robustness.json.
#   python3 scripts/robustness.py          (reads raw/grids for the per-cell part)
#
# 1. Every possible pair of non-overlapping thirty-year periods in the record (136 pairs), and
#    six named slicings for the notebook. If every pair falls, the WMO choice is not doing the work.
# 2. The last ten years, to show the current normal understates the present.
# 3. Every land cell compared between the two periods, and the fall at each percentile of the
#    country. A country average could hide a region going the other way. This shows none does.
import gzip, json, os, sys
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "raw", "grids")
ROOT = os.path.join(os.path.dirname(__file__), "..")
meta = json.load(open(f"{ROOT}/public/data/meta.json"))
YEARS = np.array(meta["years"])
series = np.array([meta["stats"][str(y)]["mean"] for y in YEARS])
mean = lambda a, b: float(series[(YEARS >= a) & (YEARS <= b)].mean())

SLICINGS = [
    ("The WMO periods, used here", (1961, 1990), (1991, 2020)),
    ("The freshest thirty against the thirty before", (1966, 1995), (1996, 2025)),
    ("The WMO reference against the freshest thirty", (1961, 1990), (1996, 2025)),
    ("The first thirty years against the last thirty", (1951, 1980), (1996, 2025)),
    ("Shifted five years back", (1956, 1985), (1986, 2015)),
    ("The record split at the break", (1951, 1987), (1988, 2025)),
]

out = {"generated": "scripts/robustness.py",
       "lastTen": {"from": 2016, "to": 2025, "mean": round(mean(2016, 2025), 2)},
       "slicings": []}
for label, (a1, b1), (a2, b2) in SLICINGS:
    then, now = mean(a1, b1), mean(a2, b2)
    out["slicings"].append({"label": label, "a": [a1, b1], "b": [a2, b2],
                            "then": round(then, 1), "now": round(now, 1),
                            "fall": round((then - now) / then, 3)})
falls = [s["fall"] for s in out["slicings"]]
out["fallRange"] = [min(falls), max(falls)]

# every pair of thirty-year periods that fit in the record without overlapping
first, last = int(YEARS[0]), int(YEARS[-1])
pairs = []
for a in range(first, last - 59 + 1):
    for b in range(a + 30, last - 29 + 1):
        then, now = mean(a, a + 29), mean(b, b + 29)
        pairs.append({"a": [a, a + 29], "b": [b, b + 29], "fall": round((then - now) / then, 3)})
lo, hi = min(pairs, key=lambda p: p["fall"]), max(pairs, key=lambda p: p["fall"])
out["allPairs"] = {"count": len(pairs), "min": lo, "max": hi}

def load(year):
    with gzip.open(f"{SRC}/snow_{year}.asc.gz", "rt") as f:
        head = {}
        for _ in range(6):
            key, value = f.readline().split()
            head[key.upper()] = float(value)
        grid = np.loadtxt(f)
    grid[grid == head["NODATA_VALUE"]] = np.nan
    return grid

def period_mean(a, b):
    stack = np.stack([load(y) for y in range(a, b + 1)])
    have = np.sum(~np.isnan(stack), 0)
    return np.where(have == b - a + 1, np.nansum(stack, 0) / np.maximum(have, 1), np.nan)

# the few alpine cells above 365 days a year: how many, and whether capping them at 365
# changes either period average (it does not, to two decimals)
stack = np.stack([load(y) for y in range(int(YEARS[0]), int(YEARS[-1]) + 1)])
over = stack > 365
def pmean(s, a, b):
    part = s[(YEARS >= a) & (YEARS <= b)]
    return round(float(np.nanmean(part)), 2)
capped = np.minimum(stack, 365)
out["over365"] = {
    "cells": int(over.any(0).sum()), "years": int(over.any((1, 2)).sum()), "cellYears": int(over.sum()),
    "meanCapped": {"1961-1990": pmean(capped, 1961, 1990), "1991-2020": pmean(capped, 1991, 2020)},
    "meanAsPublished": {"1961-1990": pmean(stack, 1961, 1990), "1991-2020": pmean(stack, 1991, 2020)},
}
del stack, capped, over

ref, cur = period_mean(1961, 1990), period_mean(1991, 2020)
both = ~np.isnan(ref) & ~np.isnan(cur)
change = cur[both] - ref[both]
out["cells"] = {
    "compared": int(both.sum()),
    "fell": int(np.sum(change < 0)),
    "rose": int(np.sum(change > 0)),
    "unchanged": int(np.sum(change == 0)),
    "medianFall": round(float(-np.median(change)), 1),
}
a, b = ref[both], cur[both]
out["percentiles"] = [
    {"percentile": q, "then": round(float(np.percentile(a, q)), 1), "now": round(float(np.percentile(b, q)), 1),
     "fall": round(float((np.percentile(a, q) - np.percentile(b, q)) / np.percentile(a, q)), 3)}
    for q in (10, 50, 90, 99)
]

# the stricter reading: not "the 10th percentile then and now" but "the cells that WERE the
# driest tenth, followed through". same for the snowiest hundredth. the subtitle has to
# survive both readings, so both are stored and both are checked.
lo = a <= np.percentile(a, 10)
hi = a >= np.percentile(a, 99)
rows_hi = np.where(both)[0][hi]
out["sameCells"] = {
    "driestTenth": {"cells": int(lo.sum()), "then": round(float(a[lo].mean()), 1), "now": round(float(b[lo].mean()), 1),
                    "fall": round(float((a[lo].mean() - b[lo].mean()) / a[lo].mean()), 3)},
    "snowiestHundredth": {"cells": int(hi.sum()), "then": round(float(a[hi].mean()), 1), "now": round(float(b[hi].mean()), 1),
                          "fall": round(float((a[hi].mean() - b[hi].mean()) / a[hi].mean()), 3),
                          "shareInAlpineRows": round(float(np.mean(rows_hi >= 780)), 3)},
}

json.dump(out, open(f"{ROOT}/src/data/robustness.json", "w"), indent=1)
print("same cells", out["sameCells"])
print("last ten years", out["lastTen"]["mean"])
print("fall range", out["fallRange"])
print("all pairs", out["allPairs"]["count"], "min", out["allPairs"]["min"], "max", out["allPairs"]["max"])
print("cells", out["cells"])
print("over 365", out["over365"])
for p in out["percentiles"]:
    print("  p%-3d %5.1f -> %5.1f  %.0f%%" % (p["percentile"], p["then"], p["now"], 100 * p["fall"]))
