# makes src/data/places.json: the cities and mountains named on the map
# positions from BKG's Geographische Namen 1:250 000 (GN250), © BKG (2026) dl-de/by-2-0
# run after download.sh:  python3 scripts/places.py
import csv
import gzip
import io
import json
import zipfile
from pyproj import Transformer

# name on the map, kind, BKG's ID (NNID) for it
# a mountain range is placed at its highest peak
PLACES = [
    ("Zugspitze", "peak", "DEBKGGND00002I7K"),
    ("Alps", "range", "DEBKGGND00000YQK"),               # Bayerische Alpen
    ("Black Forest", "range", "DEBKGGND00002JCX"),       # Feldberg
    ("Harz", "range", "DEBKGGND00002JHG"),               # Brocken
    ("Erzgebirge", "range", "DEBKGGND00002GN0"),         # Fichtelberg
    ("Bavarian Forest", "range", "DEBKGGND00002IE9"),    # Großer Arber
    ("Thuringian Forest", "range", "DEBKGGND00002ITF"),  # Großer Beerberg
    ("Rhön", "range", "DEBKGGND00002JXU"),               # Wasserkuppe
    ("Sauerland", "range", "DEBKGGND00002JES"),          # Kahler Asten
    ("Berlin", "city", "DEBKGGND00001B1U"),
    ("Hamburg", "city", "DEBKGGND00003ESP"),
    ("Munich", "city", "DEBKGGND00001J9R"),
    ("Cologne", "city", "DEBKGGND00001BRY"),
    ("Frankfurt", "city", "DEBKGGND00001FX6"),
    ("Magdeburg", "city", "DEBKGGND00001FK7"),
    ("Dresden", "city", "DEBKGGND00001FWH"),
]

# BKG's file: one row per name, positions in metres (UTM zone 32, EPSG:25832)
bkg = {}
with zipfile.ZipFile("raw/gn250.csv.zip") as z:
    with z.open("gn250/GN250.csv") as f:
        for row in csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"), delimiter=";"):
            bkg[row["NNID"]] = row

# DWD's grid: the first 6 lines of any yearly file say where it sits
header = {}
with gzip.open("raw/grids/snow_2010.asc.gz", "rt") as f:
    for _ in range(6):
        key, value = f.readline().split()
        header[key] = float(value)

to_dwd = Transformer.from_crs("EPSG:25832", "EPSG:31467", always_xy=True)     # DWD's map system
to_latlon = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)

places = []
for name, kind, nnid in PLACES:
    row = bkg[nnid]
    east = float(row["RECHTS"])
    north = float(row["HOCH"])

    x, y = to_dwd.transform(east, north)
    lon, lat = to_latlon.transform(east, north)

    # metres to squares: columns count from the west edge, rows from the north edge
    col = (x - header["XLLCORNER"]) / header["CELLSIZE"]
    row_number = header["NROWS"] - (y - header["YLLCORNER"]) / header["CELLSIZE"]

    source = f"BKG GN250 {nnid} {row['NAME']}"
    if row["HOEHE"]:
        source = source + f" ({row['HOEHE']} m)"

    places.append({"name": name, "kind": kind, "lat": round(lat, 4), "lon": round(lon, 4),
                   "col": round(col, 3), "row": round(row_number, 3), "source": source})  # to the metre
    print(f"{name:18s} {row['NAME']:18s} row {round(row_number, 3)}, col {round(col, 3)}")

with open("src/data/places.json", "w") as f:
    json.dump(places, f, indent=1, ensure_ascii=False)
