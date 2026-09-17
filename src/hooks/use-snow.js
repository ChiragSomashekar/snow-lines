import { useEffect, useState } from "react";

// loads meta.json and one uint16 grid per requested period from public/data.
// grid[r * subCols + c] = snow days a year, or meta.nodata outside Germany.
const base = import.meta.env.BASE_URL;
const cache = new Map();

async function fetchGrid(key) {
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`${base}data/snow_${key}.bin`)
        .then((r) => r.arrayBuffer())
        .then((b) => new Uint16Array(b))
    );
  }
  return cache.get(key);
}

export function useSnow(keys) {
  const [state, setState] = useState(null);
  const joined = keys.join(",");
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${base}data/meta.json`).then((r) => r.json()),
      ...keys.map(fetchGrid),
    ]).then(([meta, ...grids]) => {
      if (!alive) return;
      const byKey = {};
      keys.forEach((key, i) => (byKey[key] = grids[i]));
      setState({ meta, grids: byKey });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
  return state;
}
