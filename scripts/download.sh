#!/bin/bash
# downloads DWD's yearly snow maps, 1951 to 2025, into raw/grids/ (~22 MB)
# and BKG's place names (GN250), into raw/ (~18 MB)
# bash scripts/download.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p raw/grids

URL="https://opendata.dwd.de/climate_environment/CDC/grids_germany/annual/snowcover_days"

for year in $(seq 1951 2025); do
  file="raw/grids/snow_$year.asc.gz"
  if [ -f "$file" ]; then continue; fi
  curl --fail --silent --output "$file" "$URL/grids_germany_annual_snowcover_days_${year}_17.asc.gz"
  echo "$year"
done

# BKG's place names, for scripts/places.py
if [ ! -f raw/gn250.csv.zip ]; then
  curl --fail --silent --output raw/gn250.csv.zip "https://daten.gdz.bkg.bund.de/produkte/sonstige/gn250/aktuell/gn250.utm32s.csv.zip"
  echo "gn250"
fi
