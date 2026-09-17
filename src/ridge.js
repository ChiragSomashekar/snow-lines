// The maths behind the ridge map: where a band sits, how tall it stands, how dark it is.
// Kept out of the component file so RidgeMap.jsx exports a component and nothing else.
//
// geometry is in km on the DWD grid: x = col * ppk, y = row * ppk, where ppk is
// pixels per km and row 0 is the northern edge.
import * as d3 from "d3";

export const VMAX = 365; // days, the height scale. fixed so both maps share one scale
const WEIGHT_MAX = 120; // days at which a line reaches full ink. keeps the lowland difference readable; mountains are full ink
const INK_LEVELS = 8;

// headroom: how far the northern bands rise above the map's top edge, in px.
export function geometry(meta, width, ampPx, headroom = ampPx) {
  const ppk = width / (meta.subCols * meta.colStep);
  const amp = d3.scaleLinear().domain([0, VMAX]).range([0, ampPx]);
  const mapH = meta.subRows * meta.rowStep * ppk;
  return {
    ppk,
    amp,
    mapH,
    headroom,
    height: mapH + headroom,
    x: (colKm) => colKm * ppk,
    y: (rowKm) => rowKm * ppk + headroom, // baseline of that band
    at: (grid, rowKm, colKm) => {
      const r = Math.round(rowKm / meta.rowStep);
      const c = Math.round(colKm / meta.colStep);
      const v = grid[r * meta.subCols + c];
      return v === meta.nodata ? null : v;
    },
    subRow: (rowKm) => Math.round(rowKm / meta.rowStep),
  };
}

// ink level 0..INK_LEVELS-1 for a value in days, and the stroke for a level
export function inkLevel(v) {
  const t = Math.pow(Math.min(v / WEIGHT_MAX, 1), 0.7);
  return Math.min(INK_LEVELS - 1, Math.floor(t * INK_LEVELS));
}
export function inkStroke(level) {
  const t = (level + 0.5) / INK_LEVELS;
  // the floor is raised so the faintest lines survive compression and a phone screen
  return { opacity: 0.3 + 0.7 * t, width: 0.5 + 1.2 * t };
}

// highest cell within +-radiusKm of a place, for labels that sit on a border cell
export function peakNear(grid, meta, rowKm, colKm, radiusKm = 12) {
  const r0 = Math.round(rowKm / meta.rowStep);
  const c0 = Math.round(colKm / meta.colStep);
  const dr = Math.round(radiusKm / meta.rowStep);
  const dc = Math.round(radiusKm / meta.colStep);
  let best = null;
  for (let r = r0 - dr; r <= r0 + dr; r++) {
    for (let c = c0 - dc; c <= c0 + dc; c++) {
      if (r < 0 || c < 0 || r >= meta.subRows || c >= meta.subCols) continue;
      const v = grid[r * meta.subCols + c];
      if (v === meta.nodata) continue;
      if (!best || v > best.v) best = { v, rowKm: r * meta.rowStep, colKm: c * meta.colStep };
    }
  }
  return best;
}

// px the tallest northern band rises above row 0, for the given scale
export function neededHeadroom(grid, meta, ppk, amp) {
  let need = 0;
  for (let r = 0; r < meta.subRows; r++) {
    let m = 0;
    for (let c = 0; c < meta.subCols; c++) {
      const v = grid[r * meta.subCols + c];
      if (v !== meta.nodata && v > m) m = v;
    }
    need = Math.max(need, amp(m) - r * meta.rowStep * ppk);
  }
  return Math.ceil(need) + 6;
}

export function rowPaths(grid, meta, geo, weighted = false) {
  const { subRows, subCols, colStep, rowStep, nodata } = meta;
  const xOf = (i) => geo.x(i * colStep);
  // points are 2 km apart, under 2 px on the poster: straight segments look smooth,
  // and they let the line and its paper fill share exactly the same edge
  const curve = weighted ? d3.curveLinear : d3.curveCatmullRom.alpha(0.5);
  const rows = [];
  for (let r = 0; r < subRows; r++) {
    const base = geo.y(r * rowStep);
    const pts = [];
    let any = false;
    for (let c = 0; c < subCols; c++) {
      const v = grid[r * subCols + c];
      const ok = v !== nodata;
      any = any || ok;
      pts.push({ i: c, v: ok ? v : null });
    }
    if (!any) continue;
    const yOf = (d) => base - geo.amp(d.v);
    const line = d3.line().defined((d) => d.v !== null).x((d) => xOf(d.i)).y(yOf).curve(curve);
    const area = d3.area().defined((d) => d.v !== null).x((d) => xOf(d.i)).y0(base).y1(yOf).curve(curve);

    // weighted: one path per ink level holding every segment of that level.
    // a segment takes the level of the higher of its two ends, so peaks keep their ink.
    let levels = null;
    if (weighted) {
      const bufs = Array.from({ length: INK_LEVELS }, () => []);
      let prevLevel = -1;
      for (let c = 0; c < subCols - 1; c++) {
        const a = pts[c];
        const b = pts[c + 1];
        if (a.v === null || b.v === null) {
          prevLevel = -1;
          continue;
        }
        const lv = inkLevel(Math.max(a.v, b.v));
        const ax = xOf(a.i).toFixed(1);
        const ay = yOf(a).toFixed(1);
        const seg = `L${xOf(b.i).toFixed(1)},${yOf(b).toFixed(1)}`;
        bufs[lv].push(lv === prevLevel ? seg : `M${ax},${ay}${seg}`);
        prevLevel = lv;
      }
      levels = bufs.map((b, lv) => ({ lv, d: b.join("") })).filter((l) => l.d);
    }
    rows.push({ r, base, line: line(pts), area: area(pts), levels });
  }
  return rows;
}

// what a reader gets when they point at a spot: the drawn cell, the same one the city dots
// print, so a hover at Berlin reads the 37 that is printed there. null on the sea.
export function readAt(grid, meta, rowKm, colKm) {
  const r = Math.round(rowKm / meta.rowStep);
  const c = Math.round(colKm / meta.colStep);
  if (r < 0 || r >= meta.subRows || c < 0 || c >= meta.subCols) return null;
  const v = grid[r * meta.subCols + c];
  return v === meta.nodata ? null : { r, c, v, rowKm: r * meta.rowStep, colKm: c * meta.colStep };
}

// the nearest named place and how far, in km, which the grid gives for free. so a label can
// say "40 km east of Hamburg" without a gazetteer or a projection.
export function nearestPlace(places, rowKm, colKm) {
  let best = null;
  for (const p of places) {
    const dr = rowKm - p.row; // row 0 is the north, so negative is north
    const dc = colKm - p.col;
    const d = Math.hypot(dr, dc);
    if (!best || d < best.d) best = { name: p.kind === "city" ? p.name : `the ${p.name}`, d, dr, dc };
  }
  return best;
}

export function whereIs(place) {
  const km = Math.round(place.d);
  if (km < 4) return place.name;
  const ns = place.dr < 0 ? "north" : "south";
  const ew = place.dc < 0 ? "west" : "east";
  const a = Math.abs(place.dr), b = Math.abs(place.dc);
  const dir = a > 2.4 * b ? ns : b > 2.4 * a ? ew : `${ns}-${ew}`;
  return `${km} km ${dir} of ${place.name}`;
}
