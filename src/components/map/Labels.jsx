import { COLORS, TYPE } from "../../tokens";
import { peakNear } from "../../ridge";
import places from "../../data/places.json";
import { CITIES, LINE_MS, MAP_W, PHONE_RANGES, RANGES, RANGE_STYLE, REDUCED, SEAS } from "./settings";

// the names on the map. all of them sit on the lines, so they move when the lines move
// liftAt(r, c): how high line r stands at point c right now
// periodAt(c): which period the labels at point c show
// clear(x0, x1): false when the slider runs through that stretch, so the label is left out

// paper-coloured outline behind text, so it reads over the lines
const HALO = { paintOrder: "stroke", stroke: COLORS.paper, strokeLinejoin: "round" };

const findPlace = (name) => places.find((p) => p.name === name);

export function Seas({ geo, k }) {
  return SEAS.map((sea) => (
    <text key={sea.name} className="fade-in" x={geo.x(sea.colKm)} y={geo.y(sea.rowKm)} fontSize={10 * k} fontStyle="italic"
      letterSpacing="0.18em" fill={COLORS.muted} style={{ fontFamily: TYPE.display }}>{sea.name.toUpperCase()}</text>
  ));
}

// scene 1: the Harz name as the line passes it, then a note at its peak and one in the flat west
export function LineNotes({ geo, meta, grids, k, liftAt, harzRow, harzPeak, westCol, resting, play }) {
  const y0 = geo.y(harzRow * meta.rowStep);
  const peakX = geo.x(harzPeak * meta.colStep);
  const peakY = y0 - liftAt(harzRow, harzPeak);
  const westX = geo.x(westCol * meta.colStep);
  const westY = y0 - liftAt(harzRow, westCol);
  const note = { fontSize: 11 * k, fontStyle: "italic", fill: COLORS.ink, strokeWidth: 3.5 * k, style: { fontFamily: TYPE.display }, ...HALO };
  // the name appears just after the drawing line reaches the Harz
  const harzDelay = REDUCED ? 0 : Math.round(LINE_MS * Math.min(1, harzPeak / meta.pointCount + 0.08));
  const daysAt = (c) => grids[0].square[harzRow * meta.pointCount + c];

  return (
    <g pointerEvents="none" key={play}>
      <text className="fade-in" style={{ animationDelay: `${harzDelay}ms` }} x={peakX} y={peakY - 10 * k} textAnchor="middle"
        fontSize={10.5 * k} fontWeight={600} letterSpacing="0.12em" fill={COLORS.ink} strokeWidth={3.5 * k} {...HALO}>HARZ</text>
      {resting && (
        <g className="fade-in">
          <text x={peakX + 12 * k} y={peakY + 4 * k} {...note}>high and dark: {daysAt(harzPeak)} snow days a year</text>
          <text x={westX} y={westY + 18 * k} {...note} fill={COLORS.muted}>low and pale: {daysAt(westCol)} days</text>
        </g>
      )}
    </g>
  );
}

// mountain ranges and cities. in scene 4 a city right of the slider shows both periods
// kind: the scene, for when the labels fade in ("rise" = back from scene 3)
export function Names({ geo, meta, grids, k, liftAt, periodAt, clear, kind }) {
  const ranges = k > 1 ? PHONE_RANGES : RANGES;

  return (
    <g pointerEvents="none" className={kind === "period" ? "fade-in slow" : undefined}>
      {ranges.map((name) => {
        const p = findPlace(name);
        const peak = peakNear(grids[periodAt(Math.round(p.col / meta.colStep))].drawn, meta, p.row, p.col);
        const style = RANGE_STYLE[name] ?? { anchor: "middle", dx: 0, dy: 0 };
        const x = geo.x(peak.colKm) + style.dx;
        const w = name.length * 7.2 * k;
        const x0 = style.anchor === "middle" ? x - w / 2 : x;
        if (!clear(x0, x0 + w)) return null;
        return (
          <text key={name} x={x} y={geo.y(peak.rowKm) - liftAt(peak.r, peak.c) - 7 + style.dy * k} textAnchor={style.anchor}
            fontSize={10.5 * k} fontWeight={600} letterSpacing="0.12em" fill={COLORS.muted} strokeWidth={3.5 * k} {...HALO}>
            {name.toUpperCase()}
          </text>
        );
      })}

      {CITIES.map((name) => {
        const p = findPlace(name);
        const r = Math.round(p.row / meta.rowStep);
        const c = Math.round(p.col / meta.colStep);
        const i = r * meta.pointCount + c;
        const period = periodAt(c);
        const days = grids[period].square[i];
        // the change; on a phone without "days", so it fits right of the dot and clear of the slider's knob
        const unit = k > 1 ? "" : " days";
        const text = kind === "compare" && period === 1 ? `${grids[0].square[i]} → ${days}${unit}` : `${days} days`;

        const x = geo.x(c * meta.colStep);
        const y = geo.y(r * meta.rowStep) - liftAt(r, c);
        // the label goes left of the dot when it would run off the map
        const chars = Math.max(name.length * 7.5, text.length * 5.6);
        const left = x + (chars + 12) * k > MAP_W + (k > 1 ? 30 : 14);
        const labelX = x + (left ? -7 : 7) * k;
        const w = chars * k + 10;
        if (!clear(left ? labelX - w : x - 4, left ? x + 4 : labelX + w)) return null;

        return (
          <g key={name}>
            <circle cx={x} cy={y} r={3.2 * k} fill={COLORS.paper} />
            <circle cx={x} cy={y} r={1.9 * k} fill={COLORS.ink} />
            <text x={labelX} y={y + 3 * k} textAnchor={left ? "end" : "start"} fontSize={10 * k} fontWeight={600}
              letterSpacing="0.12em" fill={COLORS.ink} strokeWidth={3.5 * k} {...HALO}>{name.toUpperCase()}</text>
            <text key={period} className={(kind === "drop" && period === 1) || (kind === "rise" && period === 0) ? "fade-in" : undefined} x={labelX} y={y + 15 * k}
              textAnchor={left ? "end" : "start"} fontSize={10 * k} fill={COLORS.muted} strokeWidth={3 * k} {...HALO}>{text}</text>
          </g>
        );
      })}
    </g>
  );
}

// the picked line, lit in rust, and a dot on the picked point (scene 1: the dot only)
export function PickedLine({ picked, geo, meta, k, liftAt, kind }) {
  const y0 = geo.y(picked.r * meta.rowStep);
  let d = "";
  let drawing = false;
  for (let c = 0; c < meta.pointCount; c++) {
    const h = liftAt(picked.r, c);
    if (Number.isNaN(h)) {
      drawing = false;
      continue;
    }
    d += `${drawing ? "L" : "M"}${geo.x(c * meta.colStep).toFixed(1)},${(y0 - h).toFixed(1)}`;
    drawing = true;
  }
  const x = geo.x(picked.c * meta.colStep);
  const y = y0 - liftAt(picked.r, picked.c);

  return (
    <g pointerEvents="none">
      {kind !== "line" && (
        <>
          <path d={d} fill="none" stroke={COLORS.paper} strokeWidth={4.5 * k} strokeLinejoin="round" />
          <path d={d} fill="none" stroke={COLORS.accent} strokeWidth={1.4 * k} strokeLinejoin="round" />
        </>
      )}
      <circle cx={x} cy={y} r={3.4 * k} fill={COLORS.paper} />
      <circle cx={x} cy={y} r={2.2 * k} fill={COLORS.accent} />
    </g>
  );
}
