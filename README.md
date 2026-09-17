# Where did Germany's snow go?

Seventy-five years of snow in Germany, drawn as terrain.

The lines run west to east, one every 6 km from north to south. A line rises where the
land under it had more days with snow on the ground, and its ink darkens with the same
number. Lines are painted from the North Sea at the back to the Alps at the front, so a
nearer line covers the ones behind it.

Before drawing, the grid is lightly smoothed (Gaussian, 1.5 km north to south, 2.5 km east
to west) so the lines do not carry the 1 km grain. Every number quoted on the pages is
computed on the unsmoothed grid, and the six city values round to the same number either way.

Live: https://chiragsomashekar.github.io/snow-lines/

## The pages

| URL | What it is |
| --- | --- |
| `/` | The poster: 1961 to 1990 next to 1991 to 2020. Point anywhere to read a value |
| `?method` | How it was made: what is counted, every year as a bar, whether the choice of periods matters, nine weather stations against the map |

Below 640 px the maps stack and the labels scale up.

## The check notebook

`notebooks/the-check.ipynb` rebuilds the project from the raw files without importing any
project code, works through the things that went wrong or looked wrong while building it,
and confirms that the files in `public/data/` are byte for byte what the raw data gives.

It needs the raw files first (about 40 MB, not tracked in git):

```
pip install -r requirements.txt
bash scripts/download.sh
jupyter lab notebooks/the-check.ipynb
```

## Running it

```
npm install
npm run dev
npm run verify        # every number on the pages against the data files
npm run lint
npm run build
```

## Rebuilding the data

Run `bash scripts/download.sh` first. Every script then reads `raw/` with no arguments.

```
python3 scripts/prepare.py      # raw grids -> the two period grids and meta.json
python3 scripts/stats.py        # the yearly series, the smoother, the split -> stats.json
python3 scripts/gauges.py       # nine weather stations counted from their own readings
python3 scripts/gridcells.py    # the raw grid at each station, for comparison (needs pyproj)
python3 scripts/robustness.py   # every pair of thirty-year periods, and every cell compared
python3 scripts/recount.py 1970 # an independent recount of one year, no shared code
python3 scripts/favicon.py      # redraw public/favicon.svg
node scripts/verify.mjs
```

The social card, whenever the poster changes: start Chrome with
`--headless --remote-debugging-port=9333`, then

```
CAP_W=1200 CAP_H=630 node scripts/capture.mjs "http://localhost:5177/snow-lines/" full.png 14000
python3 scripts/og.py full.png
```

## Data and licence

Snow data from the Deutscher Wetterdienst Climate Data Center: annual 1 km grids of snow
cover days, 1951 to 2025, and the daily records of nine stations. Open data under Creative
Commons BY 4.0. The two thirty-year periods are the ones the World Meteorological
Organization uses (WMO-No. 1203, 2017). See `DATA.md` for the sources, the processing and
the checks.

The code is MIT (see `LICENSE`). The data stays DWD's.
