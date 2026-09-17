#!/bin/bash
# Downloads every raw file this project uses, into raw/. About 40 MB, a few minutes.
# Nothing here is processed: these are the German weather service's own files, untouched.
#   bash scripts/download.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p raw/grids raw/stations

GRIDS="https://opendata.dwd.de/climate_environment/CDC/grids_germany/annual/snowcover_days"
STATIONS="https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical"

echo "1. Yearly snow cover grids, 1951 to 2025, one file per year"
for y in $(seq 1951 2025); do
  f="raw/grids/snow_$y.asc.gz"
  [ -f "$f" ] && continue
  curl -sf -o "$f" "$GRIDS/grids_germany_annual_snowcover_days_${y}_17.asc.gz" || echo "   missing: $y"
  printf '.'
done
echo " done"

echo "2. Daily records for the nine check stations"
# 403 Berlin-Dahlem, 433 Berlin-Tempelhof, 1975 Hamburg, 2667 Koeln/Bonn, 1420 Frankfurt,
# 5792 Zugspitze, 1346 Feldberg, 722 Brocken, 1358 Fichtelberg
INDEX=$(curl -s "$STATIONS/")
for id in 00403 00433 01975 02667 01420 05792 01346 00722 01358; do
  name=$(echo "$INDEX" | grep -oE "tageswerte_KL_${id}_[0-9_]+hist\.zip" | sort -u | head -1)
  [ -z "$name" ] && { echo "   not found: $id"; continue; }
  [ -f "raw/stations/$name" ] && continue
  curl -sf -o "raw/stations/$name" "$STATIONS/$name"
  printf '.'
done
echo " done"

echo
echo "raw/ now holds:"
echo "  $(ls raw/grids | wc -l | tr -d ' ') yearly grids"
echo "  $(ls raw/stations | wc -l | tr -d ' ') station archives"
echo "  $(du -sh raw | cut -f1) total"
