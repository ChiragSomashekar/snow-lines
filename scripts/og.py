# Crops a full-page poster capture down to the 1200 x 630 social card.
# The poster changes, so this exists to stop the card going stale by hand.
#   1. start the dev server, then Chrome with --headless --remote-debugging-port=9333
#   2. CAP_W=1200 CAP_H=630 node scripts/capture.mjs "http://localhost:5177/snow-lines/" full.png 14000
#   3. python3 scripts/og.py full.png
# The card starts just above the first period heading and runs down into the Alps.
import os, sys
from PIL import Image

W, H = 1200, 630
TOP = 0.217          # where to start, as a share of the captured page height
src = Image.open(sys.argv[1]).convert("RGB")
out = os.path.join(os.path.dirname(__file__), "..", "public", "og.png")

y0 = round(src.height * TOP)
h = round(src.width / (W / H))
if y0 + h > src.height:
    raise SystemExit(f"capture is too short: needs {y0 + h}px, has {src.height}px")
src.crop((0, y0, src.width, y0 + h)).resize((W, H), Image.LANCZOS).save(out, optimize=True)
print(f"{src.size} -> crop at y={y0} -> {W}x{H}, {os.path.getsize(out) // 1024} KB")
