# the numbers behind the method page's yearly chart: every year's country average, the
# ten-year smoother, and the single split found by Pettitt's test. reads public/data,
# writes src/data/stats.json.
#   python3 scripts/stats.py
import json, os
import numpy as np
from scipy import stats as st

ROOT = os.path.join(os.path.dirname(__file__), "..")
meta = json.load(open(f"{ROOT}/public/data/meta.json"))
places = {p["name"]: p for p in json.load(open(f"{ROOT}/src/data/places.json"))}
R, C, ND = meta["subRows"], meta["subCols"], meta["nodata"]
years = np.array(meta["years"])
v = np.array([meta["stats"][str(y)]["mean"] for y in years])
n = len(v)

REF = (1961, 1990)      # the WMO reference period, the chart's zero line
CUR = (1991, 2020)      # the current WMO standard period
CITIES = ["Hamburg", "Berlin", "Cologne", "Frankfurt", "Dresden", "Munich"]

def sel(a, b):
    return v[(years >= a) & (years <= b)]

ref = sel(*REF)

# pettitt's test: try every year as the split, count how often a year before ranks above a
# year after, and keep the split where that count is most lopsided
U = np.array([sum(np.sign(v[i] - v[j]) for i in range(k) for j in range(k, n)) for k in range(1, n)])
k = int(np.argmax(np.abs(U))); K = float(abs(U[k]))
pettitt_p = float(min(2 * np.exp(-6 * K ** 2 / (n ** 3 + n ** 2)), 1))
break_year = int(years[k])                       # last year before the split
before, after = v[: k + 1], v[k + 1 :]

# is there a trend inside either half on its own? mann-kendall, plain
def mann_kendall_p(y):
    m = len(y); s = sum(np.sign(y[j] - y[i]) for i in range(m) for j in range(i + 1, m))
    z = (s - np.sign(s)) / np.sqrt(m * (m - 1) * (2 * m + 5) / 18) if s else 0.0
    return float(2 * (1 - st.norm.cdf(abs(z))))
halves = {}
for name, mask in {"before": years <= break_year, "after": years > break_year}.items():
    halves[name] = {"from": int(years[mask][0]), "to": int(years[mask][-1]), "mkP": round(mann_kendall_p(v[mask]), 3)}

# ten-year gaussian smoother (ten years full width at half maximum). the kernel is cut at
# the ends of the series and renormalised, so the last years lean on fewer neighbours
# instead of on a padded copy of the final value.
sig = 10 / 2.355
w = np.exp(-0.5 * (np.arange(-n, n + 1) / sig) ** 2)
smooth = np.array([np.sum(v * w[n - i: 2 * n - i]) / np.sum(w[n - i: 2 * n - i]) for i in range(n)])

# the value each city dot prints: the drawn cell of the period grid at the city centre
def load(key):
    g = np.fromfile(f"{ROOT}/public/data/snow_{key}.bin", dtype="<u2").reshape(R, C)
    return g

periods = {}
for key, (a, b) in {"1961-1990": REF, "1991-2020": CUR}.items():
    grid = load(key)
    cities = {}
    for name in CITIES:
        pl = places[name]
        r, c = round(pl["row"] / meta["rowStep"]), round(pl["col"] / meta["colStep"])
        cities[name] = {"drawn": int(grid[r, c])}
    periods[key] = {"from": a, "to": b, "countryMean": round(float(np.mean(sel(a, b))), 2), "cities": cities}

out = {
    "generated": "scripts/stats.py",
    "years": [int(y) for y in years],
    "countryMean": [round(float(x), 2) for x in v],
    "baseline": {"from": REF[0], "to": REF[1], "mean": round(float(ref.mean()), 2)},
    "anomaly": [round(float(x - ref.mean()), 2) for x in v],
    "smooth": [round(float(x), 2) for x in smooth],
    "step": {
        "lastYearBefore": break_year, "p": pettitt_p,
        "meanBefore": round(float(before.mean()), 2), "meanAfter": round(float(after.mean()), 2),
        "withinHalves": halves,
    },
    "periods": periods,
}
json.dump(out, open(f"{ROOT}/src/data/stats.json", "w"), indent=1)
print("step", out["step"])
print("periods", {k: p_["countryMean"] for k, p_ in periods.items()})
