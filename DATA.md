# The data

## Source

Deutscher Wetterdienst (DWD), Climate Data Center. Annual grids of the number of snow cover
days over Germany, version 1.0: 1 km by 1 km, EPSG:31467 (Gauss-Krueger zone 3), 654 by 866
cells, ESRI ASCII grid, one file per calendar year, 1951 to 2025. Downloaded 14 September
2026 from `opendata.dwd.de/climate_environment/CDC/grids_germany/annual/snowcover_days/`.

Licence: Creative Commons BY 4.0, per the CDC terms of use. DWD asks for the source to be
named next to the information used. Because this project smooths, samples and redraws the
grids rather than showing them unchanged, DWD's wording for processed data applies: "Based on
data from Deutscher Wetterdienst, gridded data reproduced graphically". Both pages name DWD
beside the drawing.

What DWD's own description of the dataset says (`DESCRIPTION_gridsgermany_annual_snowcover_days_en.pdf`,
in the same folder):

- "Definition of snow cover: snow depth >= 1 cm at morning reading (nowadays 7 UTC)."
- "Grids are derived from DWD stations and legally and qualitatively equivalent partner
  stations in Germany ... considering the height dependencies."
- "The gridding method employs height regression and Inverse Distance Weight (IDW) ...
  Finally, the values at reference height are transformed back to values corresponding to the
  topographic elevation ... with the DWD digital topographic height model."
- "Uncertainties are caused by the interpolation method, and erroneous or missing
  observations. When comparing grid fields for different years, it should be considered that
  the measurement network has changed over time."
- "The gridded data miss processes relevant for local climate (like urban heat island or cold
  air pools)."

The station check uses DWD's daily climate observations
(`observations_germany/climate/daily/kl/historical/`), column `SHK_TAG`, which its description
(`DESCRIPTION_obsgermany-climate-daily-kl_en.pdf`) defines as the daily snow depth in cm. The
same description notes that "between the end of the nineties and 2009 many stations were
changed from manual to automated", and that station metadata (relocations, instrument
changes) is included in each archive. This project did not use that metadata.

## Processing

`scripts/prepare.py` reads the 75 yearly grids and writes `public/data/`:

- `meta.json`: the grid header, the sampling steps, and for every year the country mean and
  the share of land cells with 1, 30 and 60 or more days. These are computed on the full,
  unsmoothed 1 km grid.
- `snow_1961-1990.bin` and `snow_1991-2020.bin`: the mean of the 30 yearly grids of each
  period, then smoothed (Gaussian, 1.5 km north to south by 2.5 km east to west, renormalised
  at the coast so a shore cell is not pulled toward the sea) and sampled to one row every 6 km
  and one point every 2 km: 145 by 327 values, little-endian uint16, rounded to whole days,
  65535 outside Germany. A cell is kept only if it has a value in all 30 years; none were
  dropped.

The two periods are the ones the World Meteorological Organization uses (WMO-No. 1203, 2017,
section 3, page 2): 1961 to 1990 as the reference period retained for climate change
assessment, 1991 to 2020 as the current climatological standard normal. The same document
says (page 1) that thirty years was chosen in the 1930s mainly because only thirty years of
data existed, and (page 17) that averages over 10 to 12 years can be useful where a station
lacks data but are not normals.

`scripts/stats.py` writes `src/data/stats.json`: each year's country mean, its distance from
the 1961 to 1990 mean, a ten-year Gaussian smoother (cut and renormalised at the ends of the
series rather than padded), and the single split found by Pettitt's test with a Mann-Kendall
test for a trend inside each half.

`scripts/gauges.py` counts, for nine stations, the mornings per calendar year with a snow depth
of 1 cm or more, and averages them over each period. A year counts only if the station has at
least 330 readings. `scripts/gridcells.py` then reads the raw grid at each station over the same
years: the exact cell, and the highest cell within 2 km, which the poster's Zugspitze label
uses because a summit station sits at the edge of its cell.

`scripts/robustness.py` writes `src/data/robustness.json`: every pair of non-overlapping
thirty-year periods in the record, the last ten years, every cell compared between the two
periods, and the cells above 365 days.

`scripts/verify.mjs` checks every number the two pages print against these files, and must
pass before a build is published.

## Checks

**Every pair of thirty-year periods.** The record holds 136 pairs of non-overlapping thirty-year
periods. In every one, the later period has less snow: the smallest fall is 18 percent (1951 to
1980 against 1981 to 2010), the largest 39 percent (1958 to 1987 against 1996 to 2025). The
poster's pair falls 34 percent.

**Every cell.** Of 358,303 land cells, 358,300 have less snow in 1991 to 2020 than in 1961 to
1990. Three have more, by at most 3.4 days. The median cell lost 15.3 days. By percentile, the
driest tenth of the land lost 50 percent of its snow days, the median cell 38, the snowiest
tenth 26 and the snowiest hundredth 16. The pages do not quote these regional figures.

**The last ten years.** 2016 to 2025 averaged 19.6 days a year against 31.5 for 1991 to 2020.

**The split.** Pettitt's test puts the sharpest split in the country series after 1987: 48.3 days a
year before, 29.2 after, p = 0.00004. Neither half has a significant trend on its own
(Mann-Kendall p = 0.26 and 0.14). Marty (2008, Geophysical Research Letters 35, L12501,
doi:10.1029/2008GL033998) found the same in 34 Swiss stations; from the registered abstract:
"a significant step-like decrease in snow days at the end of the 1980's with no clear trend
since then."

**Nine stations.** All nine had less snow in the second period. At the five lowland stations the
map's cell is within 3 days of the station's own count. At the four mountain stations the map
runs low by 5 to 20 percent, because the station sits on the summit and the cell stands for a
square kilometre most of which is lower. Berlin-Tempelhof has 17 and Feldberg 22 of the 30
years in 1991 to 2020, below the 24 that WMO-No. 1203 (section 4.4.2, page 8) requires for a
normal; both are shown as averages over the years they have, with the map averaged over the
same years, and the page says so.

**DWD's own series.** DWD's chart of days with snow cover, Germany, area mean, 1951 to 2025
(Zeitreihen und Trends, 1961 to 1990 reference) prints 47.2 days a year for 1961 to 1990. This
grid gives 47.5.

**Cells above 365 days.** Twelve cell-years carry more snow cover days than the calendar year has
days, the highest 375 in 1973. They fall in 1962, 1970, 1973, 1974, 1980 and 1981 at four cells
in two places: rows 862/317 and 860/321 in the Allgau Alps, rows 828/514 and 832/512 in the
Berchtesgaden Alps, each pair a few kilometres apart and each the highest ground in its corner
of the country. They are left as published. Capping them at 365 changes both period means by
nothing at two decimals.

**Reproducibility.** `notebooks/the-check.ipynb` rebuilds the two period grids from the raw files
with no project code and finds them byte-identical to the shipped files.

## Caveats

- A cell is a modelled estimate, not a measurement.
- The count runs over the calendar year, so one year holds the end of one winter and the start
  of the next.
- The station network changed over the decades (DWD's own note).
- DWD's own station analyses of snow days sometimes count from 3 cm. This grid counts from 1
  cm, so its numbers are higher by construction.
- No homogeneity assessment of the nine stations was made.
