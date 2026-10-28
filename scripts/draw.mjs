// smooths the lines and saves them next to the real numbers
// run after prepare.py:  node scripts/draw.mjs
// writes public/data/snow_<period>.bin: per line point, the real value, then the smoothed one
// (65535 = outside Germany)
import { readFileSync, writeFileSync } from "node:fs";
import { blur2 } from "d3";

const RADIUS = 1.5; // d3.blur2, spreads each square over ~2 km

const meta = JSON.parse(readFileSync("public/data/meta.json"));
const width = meta.ncols;
const height = meta.nrows;

// the raw/periods files from prepare.py
function readNumbers(path, Type) {
  const file = readFileSync(path);
  return new Type(file.buffer, file.byteOffset, file.length / Type.BYTES_PER_ELEMENT);
}

for (const period of Object.keys(meta.periods)) {
  const average = readNumbers(`raw/periods/mean_${period}.f32`, Float32Array);

  // blur the snow and a land mask (1 = land), then divide,
  // so the sea doesn't count as 0 days and pull the coast down
  const snow = new Float64Array(average.length);
  const land = new Float64Array(average.length);
  for (let i = 0; i < average.length; i++) {
    if (!Number.isNaN(average[i])) {
      snow[i] = average[i];
      land[i] = 1;
    }
  }
  blur2({ data: snow, width, height }, RADIUS);
  blur2({ data: land, width, height }, RADIUS);

  // real values per line point
  const squares = readNumbers(`raw/periods/square_${period}.u16`, Uint16Array);

  // every 6th row, every 2nd square
  const pairs = new Uint16Array(squares.length * 2);
  let point = 0;
  for (let line = 0; line < meta.lineCount; line++) {
    for (let step = 0; step < meta.pointCount; step++) {
      const i = line * meta.rowStep * width + step * meta.colStep; // same square in the full map
      let smoothed = meta.nodata;
      if (land[i] > 0.5) smoothed = Math.round(snow[i] / land[i]); // mostly land
      pairs[2 * point] = squares[point];
      pairs[2 * point + 1] = smoothed;
      point++;
    }
  }
  writeFileSync(`public/data/snow_${period}.bin`, pairs);
  console.log(period);
}
