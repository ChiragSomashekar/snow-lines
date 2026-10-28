import { COLORS } from "../../tokens";
import { inkLevel, inkStyle, INK_LEVELS } from "../../ridge";
import { MAP_W, PAD_R } from "./settings";

// paints the lines on the canvas, north to south. each line gets a paper fill under it,
// so a nearer (more southern) line hides the ones behind
//
// lines: { height, days } for every point of one period
// options:
//   only      just this line (scene 1)
//   toCol     only up to this point, west to east (scene 1, the line drawing itself)
//   rise(r)   0 to 1, how far line r has risen (scene 2)
//   from(c)   the period point c comes from (scene 4, one each side of the slider)
//   slider    the slider's column, where the lines break (scene 4)
export function paintLines(canvas, geo, meta, gutter, lines, options = {}) {
  // match the canvas to its size on screen, so lines and labels line up
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  const scale = canvas.width / (gutter + MAP_W + PAD_R);
  ctx.setTransform(scale, 0, 0, scale, gutter * scale, 0);
  ctx.clearRect(-gutter, 0, gutter + MAP_W + PAD_R, canvas.height / scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const { lineCount, pointCount, colStep, rowStep } = meta;
  const from = options.from ?? (() => lines);
  const x = (c) => geo.x(c * colStep);
  const atSlider = (c) => options.slider !== undefined && c >= options.slider - 1 && c <= options.slider;
  const hidden = (c) => atSlider(c) || (options.toCol !== undefined && c > options.toCol);

  for (let r = 0; r < lineCount; r++) {
    if (options.only !== undefined && r !== options.only) continue;
    const rise = options.rise ? options.rise(r) : 1;
    if (rise <= 0) continue;

    const y0 = geo.y(r * rowStep); // the line's baseline
    const height = (c) => (hidden(c) ? NaN : from(c).height[r * pointCount + c] * rise);
    const days = (c) => from(c).days[r * pointCount + c];

    // paper under the line. where a line ends at the border, the fill slopes down over two
    // points, so the end isn't a cliff
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    let open = false;
    for (let c = 0; c <= pointCount; c++) {
      const end = c === pointCount || Number.isNaN(height(c));
      if (end) {
        if (open) {
          ctx.lineTo(x(c + 1), y0);
          ctx.closePath();
          open = false;
        }
        continue;
      }
      if (!open) {
        ctx.moveTo(x(c - 2), y0);
        open = true;
      }
      ctx.lineTo(x(c), y0 - height(c));
    }
    ctx.fill();

    // the line itself, one path per ink level
    const paths = Array.from({ length: INK_LEVELS }, () => new Path2D());
    let previous = -1;
    for (let c = 0; c < pointCount - 1; c++) {
      if (Number.isNaN(height(c)) || Number.isNaN(height(c + 1))) {
        previous = -1;
        continue;
      }
      const level = inkLevel(Math.max(days(c), days(c + 1)));
      if (level !== previous) paths[level].moveTo(x(c), y0 - height(c));
      paths[level].lineTo(x(c + 1), y0 - height(c + 1));
      previous = level;
    }
    ctx.globalAlpha = Math.min(1, rise * 1.4); // a rising line fades in
    paths.forEach((path, level) => {
      const ink = inkStyle(level);
      ctx.strokeStyle = ink.color;
      ctx.lineWidth = ink.width * (options.only !== undefined ? 1.9 : 1); // the lone line is bolder
      ctx.stroke(path);
    });
    ctx.globalAlpha = 1;
  }
}
