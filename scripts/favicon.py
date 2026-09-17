# The poster reduced to 32 pixels: four lines, because five merge into a blur at 16: flat lines at the top, mountains at the bottom, each line
# painted over the one behind it. Real grid rows are far too detailed at this size, so the
# shape is drawn rather than sampled, keeping the poster's two rules: height is snow, and
# nearer lines occlude farther ones.
#   python3 scripts/favicon.py   ->  public/favicon.svg
import os
import numpy as np

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "favicon.svg")
PAPER, INK = "#f7f3ec", "#21201c"
S, N, PTS = 32, 4, 60
TOP, BOT = 9.0, 26.0
LEFT, RIGHT = 4.0, 28.0

def peaks(x, amp):
    """one dominant summit right of centre, two lesser shoulders: Germany, squinting"""
    g = lambda c, w: np.exp(-(((x - c) / w) ** 2))
    return amp * (1.00 * g(0.56, 0.085) + 0.55 * g(0.34, 0.10) + 0.62 * g(0.76, 0.09))

u = np.linspace(0, 1, PTS)
x = LEFT + (RIGHT - LEFT) * u
body = [f'<rect width="{S}" height="{S}" rx="6.5" fill="{PAPER}"/>']
for i in range(N):
    t = i / (N - 1)                       # 0 north, 1 south
    base = TOP + (BOT - TOP) * t
    amp = 0.55 + 7.2 * t ** 2.1           # the north is flat, the south is not
    ripple = 0.30 * (1 - t) * np.sin(u * 9.4 + i)
    y = base - peaks(u, amp) - ripple
    pts = " ".join(f"{a:.2f} {b:.2f}" for a, b in zip(x, y))
    body.append(f'<path d="M{x[0]:.2f} {base + 8:.2f} L{pts} L{x[-1]:.2f} {base + 8:.2f} Z" fill="{PAPER}"/>')
    body.append(f'<path d="M{pts}" fill="none" stroke="{INK}" stroke-width="{0.85 + 0.45 * t:.2f}" '
                f'stroke-opacity="{0.72 + 0.28 * t:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">' + "".join(body) + "</svg>"
open(OUT, "w").write(svg)
print(len(svg), "bytes ->", os.path.normpath(OUT))
