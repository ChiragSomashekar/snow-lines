import { useEffect, useState } from "react";
import { KEYS } from "../periods";

// loads meta.json and the two period files from public/data (written by scripts/draw.mjs)
// per line point: square = DWD's real value, the number a reader sees
//                 drawn  = the smoothed value the line is drawn with
// meta.nodata = outside Germany
const base = import.meta.env.BASE_URL;

async function loadJson(name) {
  const response = await fetch(base + "data/" + name);
  if (!response.ok) throw new Error(name);
  return response.json();
}

async function loadPeriod(key) {
  const response = await fetch(base + "data/snow_" + key + ".bin");
  if (!response.ok) throw new Error(key);
  const pairs = new Uint16Array(await response.arrayBuffer());

  // the file is square, drawn, square, drawn, ...
  const square = new Uint16Array(pairs.length / 2);
  const drawn = new Uint16Array(pairs.length / 2);
  for (let i = 0; i < square.length; i++) {
    square[i] = pairs[2 * i];
    drawn[i] = pairs[2 * i + 1];
  }
  return { square, drawn };
}

export function useSnow() {
  const [snow, setSnow] = useState(null);

  useEffect(() => {
    Promise.all([loadJson("meta.json"), loadPeriod(KEYS[0]), loadPeriod(KEYS[1])])
      .then(([meta, before, after]) => setSnow({ meta, grids: [before, after] }))
      .catch(() => setSnow({ error: true })); // show an error instead of loading forever
  }, []);

  return snow;
}
