import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { MotionConfig } from "motion/react";
import { useSnow } from "./hooks/use-snow";
import { useLabelScale } from "./hooks/use-label-scale";
import { RidgeMap } from "./components/RidgeMap";
import { geometry, peakNear, neededHeadroom, readAt, nearestPlace, whereIs, rowPaths, VMAX } from "./ridge";
import places from "./data/places.json";
import gauges from "./data/gauges.json";
import { COLORS, TYPE } from "./tokens";

// the poster: two maps side by side, each its own drawing so they stack on a phone.
// 1961 to 1990, the WMO reference period, next to 1991 to 2020, the current WMO period.
const KEYS = ["1961-1990", "1991-2020"];

const MAP_W = 560; // one panel's map width in viewBox units
const HEAD = 84; // room above each map for the kicker, the period and its caption
const AMP_FRAC = 0.3; // tallest possible line (365 days) as a share of the map height

// every range named on both maps, so each map reads on its own
const RANGES = ["Black Forest", "Harz", "Erzgebirge", "Bavarian Forest", "Thuringian Forest"];
// a label that would sit on a neighbour is placed beside its peak instead
const RANGE_STYLE = { Erzgebirge: { anchor: "end", dx: -8, dy: 3 } };
const CITIES = ["Hamburg", "Berlin", "Cologne", "Frankfurt", "Dresden", "Munich"];
// where the seas sit, in km on the grid, chosen by eye against the coastline. on both maps,
// because on a phone they stack and the second map arrives a screen below the first
const SEAS = [
  { name: "North Sea", colKm: 60, rowKm: 95 },
  { name: "Baltic Sea", colKm: 372, rowKm: 18 },
];

// the subtitle counts land in fifths, from the share of raw 1 km cells with 30 days or more
const WORDS = ["None", "One", "Two", "Three", "Four", "Five"];
const label = (key) => key.replace("-", " to ");
const days = (v) => (v === 1 ? "1 day" : `${v} days`);

function Caps({ x, y, anchor = "start", fill = COLORS.muted, size = 10, k = 1, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size * k} fontWeight={600} letterSpacing="0.12em" fill={fill}
      paintOrder="stroke" stroke={COLORS.paper} strokeWidth={3.5 * k} strokeLinejoin="round">
      {children}
    </text>
  );
}

function Italic({ x, y, anchor = "start", fill = COLORS.ink, size = 12.5, k = 1, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size * k} fontStyle="italic" fill={fill}
      paintOrder="stroke" stroke={COLORS.paper} strokeWidth={3.5 * k} strokeLinejoin="round" style={{ fontFamily: TYPE.display }}>
      {children}
    </text>
  );
}

function MapPanel({ dataKey, grid, meta, ampPx, headroom, keyPart, amp, k }) {
  const geo = useMemo(() => geometry(meta, MAP_W, ampPx, headroom), [meta, ampPx, headroom]);
  // the hover: point anywhere and one strip lights up in rust with its value read off the
  // drawn cell, the same value the city dots print. a tap does the same on a phone.
  const svgRef = useRef(null);
  const [spot, setSpot] = useState(null);
  const plainRows = useMemo(() => rowPaths(grid, meta, geo), [grid, meta, geo]);
  const onPoint = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const rowKm = (q.y - HEAD * k - geo.headroom) / geo.ppk; // the strip is picked by where it lives, not by its lift
    const colKm = q.x / geo.ppk;
    setSpot(readAt(grid, meta, rowKm, colKm));
  };
  const near = spot ? nearestPlace(places, spot.rowKm, spot.colKm) : null;
  const lit = spot ? plainRows.find((row) => row.r === spot.r) : null;
  const stats_ = meta.periods[dataKey];
  const place = (name) => places.find((p) => p.name === name);

  // a city is a dot on its own line, at the height that line has over the city centre
  const cities = CITIES.map((name) => {
    const p = place(name);
    const rowKm = geo.subRow(p.row) * meta.rowStep;
    const v = geo.at(grid, rowKm, p.col);
    const x = geo.x(p.col);
    const left = x + (name.length * 7.5 + 12) * k > MAP_W + (k > 1 ? 30 : 14); // would run off the panel
    return { name, v, left, x, y: geo.y(rowKm) - geo.amp(v ?? 0) };
  });

  // a range is named at its highest cell
  const ranges = RANGES.map((name) => {
        const p = place(name);
        const peak = peakNear(grid, meta, p.row, p.col);
        const st = RANGE_STYLE[name] ?? { anchor: "middle", dx: 0, dy: 0 };
        return { name, anchor: st.anchor, x: geo.x(peak.colKm) + st.dx, y: geo.y(peak.rowKm) - geo.amp(peak.v) - 7 + st.dy };
  });

  // the summit label sits on the drawn peak near the zugspitze; its number is the highest
  // raw 1 km cell within 2 km of the station, the same figure the method page checks
  const zug = place("Zugspitze");
  const top = peakNear(grid, meta, zug.row, zug.col, 20);
  const zugValue = Math.round(gauges["5792"].grid[dataKey].near);

  const head = HEAD * k;
  const padR = k > 1 ? 40 : 24; // room on the right for labels that run past the coast
  const H = head + geo.height + (keyPart ? 26 + 16 * k + amp(100) + 22 * k : 24);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${MAP_W + padR} ${H}`} role="img"
      aria-label={`Germany ${label(dataKey)}, drawn as stacked lines whose height is the number of snow days a year`}
      style={{ cursor: "crosshair" }} onPointerMove={onPoint} onPointerDown={onPoint} onPointerLeave={() => setSpot(null)}>
      <g transform={`translate(0, ${head})`}>
        <text y={-head + 30 * k} fontSize={28 * k} fontWeight={560} fill={COLORS.ink} style={{ fontFamily: TYPE.display }}>
          {label(dataKey)}
        </text>
        <text y={-head + 50 * k} fontSize={12 * k} fill={COLORS.muted}>
          {Math.round(stats_.mean)} snow days a year, country average
        </text>

        {SEAS.map((s) => (
          <text key={s.name} x={geo.x(s.colKm)} y={geo.y(s.rowKm)} fontSize={10 * k} fontStyle="italic" letterSpacing="0.18em"
            fill={COLORS.muted} style={{ fontFamily: TYPE.display }}>
            {s.name.toUpperCase()}
          </text>
        ))}

        <RidgeMap grid={grid} meta={meta} width={MAP_W} ampPx={ampPx} headroom={headroom} reveal />

        {lit && (
          <g pointerEvents="none">
            <path d={lit.line} fill="none" stroke={COLORS.paper} strokeWidth={4.5 * k} strokeLinejoin="round" />
            <path d={lit.line} fill="none" stroke={COLORS.accent} strokeWidth={1.4 * k} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        )}

        {ranges.map((l) => (
          <Caps key={l.name} x={l.x} y={l.y} anchor={l.anchor} size={10.5} k={k}>{l.name.toUpperCase()}</Caps>
        ))}

        {cities.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={3.2 * k} fill={COLORS.paper} />
            <circle cx={c.x} cy={c.y} r={1.9 * k} fill={COLORS.ink} />
            <Caps x={c.x + (c.left ? -7 : 7) * k} y={c.y + 3 * k} size={10} fill={COLORS.ink} k={k} anchor={c.left ? "end" : "start"}>{c.name.toUpperCase()}</Caps>
            <text x={c.x + (c.left ? -7 : 7) * k} y={c.y + 15 * k} textAnchor={c.left ? "end" : "start"} fontSize={10 * k} fill={COLORS.muted} paintOrder="stroke" stroke={COLORS.paper} strokeWidth={3 * k}>
              {c.v === null ? "no data" : days(c.v)}
            </text>
          </g>
        ))}

        {spot && (() => {
          const x = geo.x(spot.colKm);
          const y = geo.y(spot.rowKm) - geo.amp(spot.v);
          const text = `${whereIs(near)} \u00b7 ${days(spot.v)} a year`;
          // keep the label on the sheet: to the right of the dot if it fits, else to the left,
          // else (a long label on a phone) centred over the dot and pushed in from the edges
          const w = text.length * 6 * k;
          const side = x + 9 * k + w <= MAP_W ? "start" : x - 9 * k - w >= 0 ? "end" : "middle";
          const lx = side === "start" ? x + 9 * k : side === "end" ? x - 9 * k : Math.min(Math.max(x, w / 2), MAP_W - w / 2);
          return (
            <g pointerEvents="none">
              <circle cx={x} cy={y} r={3.4 * k} fill={COLORS.paper} />
              <circle cx={x} cy={y} r={2.2 * k} fill={COLORS.accent} />
              <text x={lx} y={y - 9 * k} textAnchor={side} fontSize={11 * k} fill={COLORS.ink}
                paintOrder="stroke" stroke={COLORS.paper} strokeWidth={4 * k} strokeLinejoin="round">
                {text}
              </text>
            </g>
          );
        })()}

        {(
          <Italic x={geo.x(top.colKm) + 8} y={geo.y(top.rowKm) - geo.amp(top.v) - 22} size={11} k={k}>
            Zugspitze, up to {days(zugValue)} a year
          </Italic>
        )}


        {keyPart && <Key y={geo.height + 26} amp={amp} k={k} />}
      </g>
    </svg>
  );
}

// the only key on the poster, drawn as a map draws its scale bar: one rule, three ticks, at the
// exact lift the map uses. line weight is explained by one word in the dek ("darkened") instead.
function Key({ y, amp, k }) {
  const H = amp(100);
  // label offsets from the tick: the 0 and 30 ticks sit 18 units apart, so on a phone (k 1.6)
  // their labels are pushed apart a little further
  // there is no zero to point at on a ridge map: every line's baseline is its own row and is
  // not drawn. so the bar is a scale for a rise, and the bottom tick says what zero looks like
  const ticks = [
    [0, "flat and faint: little or no snow", k > 1 ? 7 : 4],
    [30, "a rise this tall: a month of snow", k > 1 ? 0 : 2],
    [100, "100 days", 3.5],
  ];
  return (
    <g transform={`translate(0, ${y})`}>
      <Caps x={0} y={0} k={k}>HOW HIGH A LINE RISES</Caps>
      <g transform={`translate(5, ${16 * k + H})`}>
        <line x1={0} x2={0} y1={0} y2={-H} stroke={COLORS.ink} strokeWidth={1} />
        {ticks.map(([d, label, dy]) => (
          <g key={d} transform={`translate(0, ${-amp(d)})`}>
            <line x1={-4} x2={4} y1={0} y2={0} stroke={COLORS.ink} strokeWidth={1} />
            <text x={12} y={dy * k} fontSize={10.5 * k} fill={COLORS.muted}>{label}</text>
          </g>
        ))}
      </g>
    </g>
  );
}

export default function Poster() {
  const snow = useSnow(KEYS);
  const k = useLabelScale();

  if (!snow) return <main><p className="loading">Loading the grids</p></main>;
  const { meta, grids } = snow;

  const ppk = MAP_W / (meta.subCols * meta.colStep);
  const ampPx = Math.round(AMP_FRAC * meta.subRows * meta.rowStep * ppk);
  const amp = d3.scaleLinear().domain([0, VMAX]).range([0, ampPx]);
  const headroom = Math.max(...KEYS.map((key) => neededHeadroom(grids[key], meta, ppk, amp)));
  const [pA, pB] = KEYS.map((key) => meta.periods[key]);
  const common = { meta, ampPx, headroom, amp, k };

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <div className="stage">
          <header className="stage-head">
            <h1>Where did Germany's snow go?</h1>
            <p className="subtitle">
              {WORDS[Math.round(pA.share30 * 5)]} in five square kilometres used to get a month of snow a year. Now{" "}
              {WORDS[Math.round(pB.share30 * 5)].toLowerCase()} in five.
            </p>
            <p className="dek">
              In the thirty years from 1961, Germany averaged {Math.round(pA.mean)} days a year with snow on the ground.
              In the thirty years from 1991, {Math.round(pB.mean)}.
            </p>
            <p className="dek how">
              One line every {meta.rowStep} km, north to south. More snow: higher and darker. Point anywhere to read a
              number.
            </p>
          </header>

          <div className="poster-grid">
            <MapPanel dataKey={KEYS[0]} grid={grids[KEYS[0]]} keyPart {...common} />
            <MapPanel dataKey={KEYS[1]} grid={grids[KEYS[1]]} {...common} />
          </div>

          <p className="source">
            Data: Deutscher Wetterdienst, 1 km grids of snow cover days, 1951 to 2025. A snow day is a morning with at
            least 1 cm of snow on the ground. <a href={`${import.meta.env.BASE_URL}?method`}>How this was made.</a>
          </p>
        </div>
      </main>
    </MotionConfig>
  );
}
