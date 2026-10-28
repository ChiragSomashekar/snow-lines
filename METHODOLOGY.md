# How this was made

## Source

Deutscher Wetterdienst (DWD), Climate Data Center: annual grids of snow cover days over Germany,
version 1.0. One file per year, 1951 to 2025, 1 km by 1 km, 654 by 866 squares, Gauss-Krüger
zone 3 (EPSG:31467). Downloaded 14 September 2026 from
`opendata.dwd.de/climate_environment/CDC/grids_germany/annual/snowcover_days/`.

**Licence.** CC BY 4.0, per DWD's terms of use (`opendata.dwd.de/climate_environment/CDC/Terms_of_use.pdf`).
Anyone may adapt the data if they "give appropriate credit, provide a link to the license, and
indicate if changes were made" (creativecommons.org/licenses/by/4.0). Because the grids are
averaged and redrawn here, the source line follows DWD's wording for changed data
(dwd.de/DE/service/rechtliche_hinweise/vorlagen_quellenangabe.html): "Rasterdaten bildlich
wiedergegeben" (reproduced graphically) and "Einzelwerte gemittelt" (averaged).

**What DWD says about the grids** (`DESCRIPTION_gridsgermany_annual_snowcover_days_en.pdf`, same folder):

- "Definition of snow cover: snow depth >= 1 cm at morning reading (nowadays 7 UTC)."
- "Grids are derived from DWD stations and legally and qualitatively equivalent partner stations
  in Germany ... considering the height dependencies."
- "The gridding method employs height regression and Inverse Distance Weight (IDW)."
- "The given resolution of 1 km x 1 km is the resolution of the employed digital height model."
  and "The actual information density depends on the station network."
- "When comparing grid fields for different years, it should be considered that the measurement
  network has changed over time."
- "The gridded data miss processes relevant for local climate (like urban heat island or cold air pools)."

So the 1 km detail comes from the height model, and DWD describes no smoothing of its own.

## Place positions

The cities and mountains named on the map, and used to say where a reading is, come from the
Bundesamt für Kartographie und Geodäsie (BKG): Geographische Namen 1:250 000 (GN250), downloaded
28 October 2026 from
`gdz.bkg.bund.de/index.php/default/digitale-geodaten/sonstige-geodaten/geographische-namen-1-250-000-gn250.html`.
Licence: Datenlizenz Deutschland Namensnennung 2.0 (dl-de/by-2-0). Credit, as BKG's terms of use
require: © BKG (2026) dl-de/by-2-0, Datenquellen:
`sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_gn250.pdf`.

- Cities: BKG's point for the municipality (object type AX_Gemeinde).
- Mountain ranges: the range's highest peak, from BKG's height points (Besonderer_Hoehenpunkt):
  Zugspitze, Feldberg (Black Forest), Brocken (Harz), Fichtelberg (Erzgebirge), Großer Arber
  (Bavarian Forest), Großer Beerberg (Thuringian Forest), Wasserkuppe (Rhön), Kahler Asten (Sauerland).
- "Alps": BKG's point for the Bayerische Alpen (AX_Landschaft).

BKG gives positions in UTM zone 32 (EPSG:25832); they are converted to DWD's grid (EPSG:31467)
with pyproj.

## How the map is made

1. `scripts/download.sh` downloads the 75 yearly grids into `raw/grids/` and BKG's place names into `raw/`.
2. `scripts/prepare.py` averages the thirty years of each period, square by square. Only squares
   with a value in all thirty years are kept; none were dropped. It keeps one line every 6 km and
   one point every 2 km along it (145 lines, 327 points), rounds those squares to whole days, and
   writes Germany's average for every year (`src/data/years.json`).
3. `scripts/places.py` picks each place from BKG's file by its ID (NNID) and writes
   `src/data/places.json`, where each entry names its BKG object.
4. `scripts/draw.mjs` smooths each period with D3's `d3.blur2`, radius 1.5, and saves each point
   twice in `public/data/snow_<period>.bin`: the real value, which is what a reader sees, and the
   smoothed one, which is what the line is drawn with. Near the coast and the borders the blur
   averages only squares in Germany, so the sea doesn't pull the land down.

The lines are smoothed; the numbers are not.

The files in `public/data/` are already built. To build them again:

```
bash scripts/download.sh
pip install -r requirements.txt
python3 scripts/prepare.py
python3 scripts/places.py
node scripts/draw.mjs
```

**Why smooth.** Unsmoothed, the Alps show as single-square needles, mostly hilltops of DWD's
height model. D3 describes its blur as "three iterations of a moving average transform (box
filter) for a fast approximation of a Gaussian kernel" (d3js.org/d3-array/blur). At radius 1.5 one
square spreads with a standard deviation of 2.1 km, three quarters of it within 2 km. For
comparison, scikit-image smooths before shrinking an image with a default sigma of (s - 1) / 2 for
a factor s (`skimage.transform.resize`): 2.5 km for keeping one line in six.

**The periods.** 1961 to 1990 and 1991 to 2020 are the World Meteorological Organization's
reference period and current standard (WMO-No. 1203, 2017, section 3). The same guidelines say
thirty years was chosen in the 1930s mainly because only thirty years of data existed (page 1).

## Caveats

- Each square is DWD's estimate from its stations, not a measurement.
- A year runs January to December, so it holds the end of one winter and the start of the next.
- The station network changed over the decades (DWD's own note).
- DWD's own time series of days with snow cover, area mean for Germany, gives 47.2 days a year for
  1961 to 1990. Averaging the grids gives 47.5.
- A city's dot sits on the line nearest its centre, at most 3 km away, and shows the square under the dot.
- In six years, four squares in the highest Alps have a few more snow days than the year has days
  (at most 375). They are left as published.
- Why the snow went is not tested here.
