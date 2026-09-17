# gauge check: mornings with snow depth >= 1 cm per calendar year, from DWD daily climate
# observations (column SHK_TAG), averaged over the WMO periods. a year counts only with at
# least 330 readings, so a gap is never read as no snow.
#   python3 scripts/gauges.py             (reads raw/stations)
import csv, glob, io, json, os, sys, zipfile, collections

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "raw", "stations")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "gauges.json")
STATIONS = {
    "403": "Berlin-Dahlem", "433": "Berlin-Tempelhof", "1975": "Hamburg-Fuhlsbüttel", "2667": "Köln/Bonn", "1420": "Frankfurt/Main",
    "5792": "Zugspitze", "1346": "Feldberg (Black Forest)", "722": "Brocken (Harz)", "1358": "Fichtelberg (Erzgebirge)",
}
PERIODS = {"1961-1990": (1961, 1990), "1991-2020": (1991, 2020)}

result = {}
for sid, name in STATIONS.items():
    files = glob.glob(f"{SRC}/tageswerte_KL_{int(sid):05d}_*.zip")
    if not files:
        print("missing", sid, name); continue
    z = zipfile.ZipFile(files[0])
    member = [n for n in z.namelist() if n.startswith("produkt_klima_tag")][0]
    geo = [n for n in z.namelist() if n.startswith("Metadaten_Geographie")][0]
    last = z.read(geo).decode("latin-1").strip().splitlines()[-1].split(";")
    height, lat, lon = float(last[1]), float(last[2]), float(last[3])
    days, read = collections.Counter(), collections.Counter()
    for row in csv.DictReader(io.TextIOWrapper(z.open(member), encoding="latin-1"), delimiter=";"):
        row = {k.strip(): v.strip() for k, v in row.items()}
        y, v = int(row["MESS_DATUM"][:4]), row["SHK_TAG"]
        if v in ("", "-999"):
            continue
        read[y] += 1
        days[y] += float(v) >= 1
    entry = {"name": name, "height": height, "lat": lat, "lon": lon, "periods": {}}
    for k, (y0, y1) in PERIODS.items():
        full = [y for y in range(y0, y1 + 1) if read[y] >= 330]
        entry["periods"][k] = {
            "mean": round(sum(days[y] for y in full) / len(full), 1) if full else None,
            "years": len(full),
            "yearsUsed": full,
        }
    result[sid] = entry
    print(f"{name:26s} {height:6.0f} m  {entry['periods']}")

# keep the grid values scripts/gridcells.py wrote here, so running this alone does not drop them
if os.path.exists(OUT):
    for sid, old in json.load(open(OUT)).items():
        if sid in result and "grid" in old:
            result[sid]["grid"] = old["grid"]

json.dump(result, open(OUT, "w"), indent=1)
print("wrote", OUT)
