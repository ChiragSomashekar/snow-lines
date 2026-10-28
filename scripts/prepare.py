# averages DWD's yearly snow maps into the two 30-year periods
# run after download.sh:  python3 scripts/prepare.py
# writes raw/periods/ (for draw.mjs), public/data/meta.json and src/data/years.json
import json
import os
import numpy as np

FIRST_YEAR = 1951
LAST_YEAR = 2025

# WMO periods
PERIODS = {
    "1961-1990": (1961, 1990),
    "1991-2020": (1991, 2020),
}

ROW_STEP = 6     # km between lines
COL_STEP = 2     # km between points on a line
NODATA = 65535   # outside Germany


# one year's map, snow days per 1 km square
# first 6 lines are the header, -999 = outside Germany
def read_map(year):
    grid = np.loadtxt(f"raw/grids/snow_{year}.asc.gz", skiprows=6)
    grid[grid == -999] = np.nan
    return grid


years = []
year_averages = []
period_totals = {"1961-1990": 0, "1991-2020": 0}

for year in range(FIRST_YEAR, LAST_YEAR + 1):
    grid = read_map(year)

    # Germany's average that year, for the yearly chart
    years.append(year)
    year_averages.append(round(float(np.nanmean(grid)), 2))

    # add to its period
    for period, (first, last) in PERIODS.items():
        if first <= year <= last:
            period_totals[period] = period_totals[period] + grid

rows, cols = grid.shape
meta = {"nrows": rows, "ncols": cols, "rowStep": ROW_STEP, "colStep": COL_STEP, "nodata": NODATA, "periods": {}}

os.makedirs("raw/periods", exist_ok=True)

for period, (first, last) in PERIODS.items():
    # 30-year average per square
    average = period_totals[period] / (last - first + 1)
    average.astype(np.float32).tofile(f"raw/periods/mean_{period}.f32")

    # what a reader sees: the square under each line point, in whole days
    squares = average[::ROW_STEP, ::COL_STEP]
    squares = np.floor(squares + 0.5)  # .5 rounds up, as people expect (np.rint would round 62.5 to 62)
    squares[np.isnan(squares)] = NODATA
    squares.astype(np.uint16).tofile(f"raw/periods/square_{period}.u16")

    meta["lineCount"], meta["pointCount"] = squares.shape
    meta["periods"][period] = {"mean": round(float(np.nanmean(average)), 2)}
    print(period, meta["periods"][period]["mean"], "snow days a year")

with open("public/data/meta.json", "w") as f:
    json.dump(meta, f)

with open("src/data/years.json", "w") as f:
    json.dump({"years": years, "mean": year_averages}, f)
