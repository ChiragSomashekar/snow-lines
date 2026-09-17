# an independent recount, on purpose kept to a few lines with no shared code:
# read one raw DWD file straight from the gzip and average it. compare the result with
# public/data/meta.json and with the poster.
#   python3 scripts/recount.py 1970       (reads raw/grids)
import gzip, json, os, sys

year = sys.argv[1]
folder = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "raw", "grids")
total = count = 0
with gzip.open(f"{folder}/snow_{year}.asc.gz", "rt") as f:
    header = {}
    for _ in range(6):
        k, v = f.readline().split()
        header[k.upper()] = v
    nodata = float(header["NODATA_VALUE"])
    for line in f:
        for cell in line.split():
            v = float(cell)
            if v != nodata:
                total += v
                count += 1

mine = total / count
meta = json.load(open(os.path.join(os.path.dirname(__file__), "..", "public", "data", "meta.json")))
theirs = meta["stats"][year]["mean"]
print(f"{year}: {count} cells inside Germany, mean {mine:.2f} days of snow cover")
print(f"meta.json says {theirs}  ->  {'match' if abs(mine - theirs) < 0.01 else 'MISMATCH'}")
