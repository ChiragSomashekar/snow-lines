// the maths behind the map: where a line sits, how tall and dark it is, and where a point is in words
// positions are in km on DWD's grid, row 0 = the northern edge
import * as d3 from "d3";

export const VMAX = 365; // days at full height, the same for both periods

// ink: palest at 0 days, black from 60 days up, in 16 even steps of lightness
// the palest step stays visible on the paper, so little snow never looks like no data
export const INK_FULL = 60;
export const INK_LEVELS = 16;
const inkRamp = d3.interpolateLab("#cdc6ba", "#21201c");

export function inkLevel(days) {
  const share = Math.min(Math.max(days, 0) / INK_FULL, 1);
  return Math.round(share * (INK_LEVELS - 1));
}

export function inkStyle(level) {
  const t = level / (INK_LEVELS - 1);
  return { color: inkRamp(t), width: 0.5 + 1.2 * t };
}

// width: the map's width in px; ampPx: the height of a 365-day line in px
// headroom: space above the map for the northern lines to rise into
export function geometry(meta, width, ampPx, headroom) {
  const ppk = width / (meta.pointCount * meta.colStep); // px per km
  const mapH = meta.lineCount * meta.rowStep * ppk;
  return {
    ppk,
    height: mapH + headroom,
    x: (colKm) => colKm * ppk,
    y: (rowKm) => rowKm * ppk + headroom, // a line's baseline
    lift: (days) => (days * ampPx) / VMAX, // how far a line rises
    lineAt: (rowKm) => Math.round(rowKm / meta.rowStep), // the line nearest a place
  };
}

// the highest point within 12 km of a place, so a mountain's name sits on its peak
export function peakNear(values, meta, rowKm, colKm, radiusKm = 12) {
  const r0 = Math.round(rowKm / meta.rowStep);
  const c0 = Math.round(colKm / meta.colStep);
  const dr = Math.round(radiusKm / meta.rowStep);
  const dc = Math.round(radiusKm / meta.colStep);
  let best = null;
  for (let r = r0 - dr; r <= r0 + dr; r++) {
    for (let c = c0 - dc; c <= c0 + dc; c++) {
      if (r < 0 || c < 0 || r >= meta.lineCount || c >= meta.pointCount) continue;
      const v = values[r * meta.pointCount + c];
      if (v === meta.nodata) continue;
      if (!best || v > best.v) best = { v, r, c, rowKm: r * meta.rowStep, colKm: c * meta.colStep };
    }
  }
  return best;
}

// what a reader gets at a line point: DWD's real value there, in both periods (null outside Germany)
export function readAt(grids, meta, r, c) {
  if (r < 0 || r >= meta.lineCount || c < 0 || c >= meta.pointCount) return null;
  const i = r * meta.pointCount + c;
  const a = grids[0].square[i];
  const b = grids[1].square[i];
  if (a === meta.nodata || b === meta.nodata) return null;
  return { r, c, rowKm: r * meta.rowStep, colKm: c * meta.colStep, a, b };
}

// the closest place in places.json, and how far north/south and east/west of it
export function nearestPlace(places, rowKm, colKm) {
  let best = null;
  for (const p of places) {
    const dr = rowKm - p.row; // negative = north of the place
    const dc = colKm - p.col; // negative = west of it
    const d = Math.hypot(dr, dc);
    const name = p.kind === "city" ? p.name : "the " + p.name;
    if (!best || d < best.d) best = { name, d, dr, dc };
  }
  return best;
}

// "17 km south-east of the Rhön", or just the name when it's under 4 km away
export function whereIs(place) {
  const km = Math.round(place.d);
  if (km < 4) return place.name;

  const ns = place.dr < 0 ? "north" : "south";
  const ew = place.dc < 0 ? "west" : "east";
  const across = Math.abs(place.dr);
  const along = Math.abs(place.dc);

  // 2.4 = tan(67.5°), the edge between e.g. "south" and "south-east" on an 8-point compass
  let direction = ns + "-" + ew;
  if (across > 2.4 * along) direction = ns;
  if (along > 2.4 * across) direction = ew;

  return km + " km " + direction + " of " + place.name;
}

// "30% fewer", the change from 1961 to 1990 (a) to 1991 to 2020 (b)
export function change(a, b) {
  if (a === b) return "no change";
  if (a === 0) return "more"; // from none, a percentage makes no sense
  const percent = Math.round((Math.abs(a - b) / a) * 100);
  return percent + "% " + (b < a ? "fewer" : "more");
}
