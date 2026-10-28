import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { geometry, readAt, VMAX } from "../../ridge";
import places from "../../data/places.json";
import { COLORS } from "../../tokens";
import { KEYS } from "../../periods";
import { AMP_FRAC, GUTTER, LINE_WINDOW, MAP_W, PAD_R, REDUCED, TOUCH, hintFor } from "./settings";
import { paintLines } from "./paint";
import { useSceneAnimation, useSliderSweep } from "./animate";
import { useTouch } from "./touch";
import { LineNotes, Names, PickedLine, Seas } from "./Labels";
import { readingText } from "./reading";
import { Slider } from "./Slider";
import { Legend } from "./Legend";

// Germany as stacked lines, one every 6 km from north to south; height and ink = snow days a year.
// the lines are painted on a canvas, the names, slider and picked place sit in an svg on top
//
// scene.kind: "line" (scene 1), "period" (2), "drop" (3), "compare" (4)
// scene.play: goes up every time a scene starts
// scene.back: reached with Back, so the scene before plays in reverse instead of starting over
//   "full" / "mid": scene 2 from scene 3, the lines rise again (from all the way down / from halfway)
//   "slider": scene 3 from scene 4, the slider goes east, then all the way west
// k: label scale, 1 on a wide screen, 1.6 on a phone
// period: the period named above the map

const LEGEND_K = 1.2; // legend type, a little larger than the map's labels

export function SnowMap({ meta, grids, scene, k, onArrive, period }) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const readingRef = useRef(null);
  const shown = useRef(null); // what's on the canvas, to repaint after a resize
  const dragging = useRef(false); // the mouse is moving the slider
  const fingerTaken = useRef(false); // a finger is reading or moving the slider
  const down = useRef(null); // where the pointer went down, to tell a tap from a scroll

  const [canvasW, setCanvasW] = useState(0); // the map's width on screen, css px
  const [doneFor, setDoneFor] = useState(null); // the play whose animation has finished

  // kept with the play they belong to, so a new scene starts without them
  const [drop, setDrop] = useState({ play: -1, e: 0 }); // how far the lines have sunk, 0 to 1
  const [slider, setSliderState] = useState({ play: -1, at: 0 }); // 0 = west edge, 1 = east edge
  const [pick, setPick] = useState({ play: -1, at: null }); // the place the reader picked
  const resting = scene.kind === "compare" || doneFor === scene.play; // the scene's animation is over
  const rising = scene.kind === "period" && scene.back; // back from scene 3
  const unsweep = scene.kind === "drop" && scene.back === "slider" && !resting; // back from scene 4
  const dropE = drop.play === scene.play || rising ? drop.e : 0; // back from scene 3 starts where the lines are
  const sliderAt = slider.play === scene.play || scene.back === "slider" ? slider.at : 0; // back from scene 4 too
  const picked = pick.play === scene.play ? pick.at : null;
  const setSlider = (at) => setSliderState({ play: scene.play, at });
  const setPicked = (at) => setPick({ play: scene.play, at });

  const geo = useMemo(() => {
    const ppk = MAP_W / (meta.pointCount * meta.colStep);
    const ampPx = Math.round(AMP_FRAC * meta.lineCount * meta.rowStep * ppk);
    // room above the map for the highest northern line, in either period
    let headroom = 0;
    for (const grid of grids) {
      for (let r = 0; r < meta.lineCount; r++) {
        for (let c = 0; c < meta.pointCount; c++) {
          const v = grid.drawn[r * meta.pointCount + c];
          if (v !== meta.nodata) headroom = Math.max(headroom, (v * ampPx) / VMAX - r * meta.rowStep * ppk);
        }
      }
    }
    return geometry(meta, MAP_W, ampPx, Math.ceil(headroom) + 8);
  }, [meta, grids]);
  const gutter = k === 1 ? GUTTER : 0; // a phone has no legend column
  const svgW = gutter + MAP_W + PAD_R;
  const svgH = geo.height + 10;

  // each period's lines: height in px and smoothed days, for every point (NaN outside Germany)
  const periods = useMemo(() => grids.map((grid) => {
    const height = new Float32Array(grid.drawn.length);
    const days = new Float32Array(grid.drawn.length);
    for (let i = 0; i < grid.drawn.length; i++) {
      const v = grid.drawn[i];
      height[i] = v === meta.nodata ? NaN : geo.lift(v);
      days[i] = v === meta.nodata ? NaN : v;
    }
    return { height, days };
  }), [grids, geo, meta]);

  function paint(lines, options) {
    if (!canvasRef.current) return;
    paintLines(canvasRef.current, geo, meta, gutter, lines, options);
    shown.current = { lines, options };
  }
  // a resize must repaint with the current layout (a phone has no gutter), so keep the latest paint
  const paintNow = useRef(paint);
  useLayoutEffect(() => { paintNow.current = paint; });

  // scene 4 (and back from it): west of the slider is 1961 to 1990, east of it 1991 to 2020
  const sliderCol = Math.round(sliderAt * meta.pointCount);
  const sliderX = geo.x(sliderCol * meta.colStep);
  const sliderFrom = (point) => Math.min(1, Math.max(0, point.x / MAP_W));

  // the period (0 or 1) the map shows at point c
  function periodAt(c) {
    if (scene.kind === "compare" || unsweep) return c < sliderCol ? 0 : 1;
    if (scene.kind === "drop") return 1;
    return 0;
  }

  // scene 1's line runs through the Harz
  const harz = places.find((p) => p.name === "Harz");
  const harzRow = geo.lineAt(harz.row);
  // its highest point near the Harz, and a flat point in the west, for the two notes
  const harzPeak = useMemo(() => {
    const c0 = Math.round(harz.col / meta.colStep);
    let best = c0;
    for (let c = c0 - 8; c <= c0 + 8; c++) {
      if (grids[0].drawn[harzRow * meta.pointCount + c] > grids[0].drawn[harzRow * meta.pointCount + best]) best = c;
    }
    return best;
  }, [grids, meta, harz, harzRow]);
  const westCol = useMemo(() => {
    let c = 0;
    while (c < meta.pointCount && grids[0].square[harzRow * meta.pointCount + c] === meta.nodata) c++;
    return c + 14;
  }, [grids, meta, harzRow]);

  useSceneAnimation({
    scene, periods, paint, meta, harzRow, sliderCol,
    onDone: setDoneFor,
    onDrop: (e) => setDrop({ play: scene.play, e }),
    onArrive,
  });
  const stopSweep = useSliderSweep(scene, setSlider, sliderAt, () => { setDoneFor(scene.play); onArrive(); });

  // when the map changes size (a turned phone, a resized window), repaint what's on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const observer = new ResizeObserver(() => {
      setCanvasW(canvas.clientWidth); // the legend follows the map's size
      if (shown.current) paintNow.current(shown.current.lines, shown.current.options);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // a scene rests once its animation is over (scene 4 has none); nothing is read before that

  // a screen position, in svg units
  function toSvg(e) {
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  // the place under a point: the frontmost (most southern) line whose shape covers it, so pointing
  // at a tall peak reads that peak's line. in scene 1, the one line, at any height
  function hit(point) {
    const c = Math.round(point.x / geo.ppk / meta.colStep);
    if (c < 0 || c >= meta.pointCount || !resting) return null;
    const lines = periods[periodAt(c)];
    if (scene.kind === "line") {
      if (Number.isNaN(lines.height[harzRow * meta.pointCount + c])) return null;
      return readAt(grids, meta, harzRow, c);
    }
    for (let r = meta.lineCount - 1; r >= 0; r--) {
      const h = lines.height[r * meta.pointCount + c];
      if (Number.isNaN(h)) continue;
      const y0 = geo.y(r * meta.rowStep);
      if (point.y <= y0 + 1 && point.y >= y0 - h - 2) return readAt(grids, meta, r, c);
    }
    return null;
  }

  // mouse: hovering reads; in scene 4, press and move sideways to move the slider.
  // a finger is handled in touch.js; a tap still reads here, on pointer up
  function onPointerMove(e) {
    const point = toSvg(e);
    if (dragging.current) {
      setSlider(sliderFrom(point));
      return;
    }
    if (fingerTaken.current) return;
    if (scene.kind === "compare" && down.current && e.pointerType === "mouse" && e.buttons) {
      const dx = e.clientX - down.current.x;
      const dy = e.clientY - down.current.y;
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        stopSweep();
        dragging.current = true;
        svgRef.current.setPointerCapture(e.pointerId);
        setSlider(sliderFrom(point));
        return;
      }
    }
    if (e.pointerType === "mouse" && !e.buttons) {
      const place = hit(point);
      if (place) setPicked(place);
    }
  }

  function onPointerDown(e) {
    down.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (dragging.current) {
      dragging.current = false;
      down.current = null;
      return;
    }
    if (fingerTaken.current) { // the end of a touch and hold, not a tap
      down.current = null;
      return;
    }
    if (e.pointerType === "mouse" || !down.current) return;
    // a tap reads; a scroll that starts on the map doesn't
    if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) < 10) {
      const place = hit(toSvg(e));
      if (place) setPicked(place);
    }
    down.current = null;
  }

  function onPointerCancel() {
    dragging.current = false;
    fingerTaken.current = false;
    down.current = null;
  }

  function onPointerLeave(e) {
    if (e.pointerType === "mouse" && !dragging.current) setPicked(null);
  }

  // keyboard: the first arrow picks the Harz, the next ones walk from there
  function onKeyDown(e) {
    const steps = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -3], ArrowRight: [0, 3] };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    if (!picked) {
      const place = readAt(grids, meta, harzRow, harzPeak);
      if (place) setPicked(place);
      return;
    }
    if (scene.kind === "line" && step[0] !== 0) return; // one line: only west and east
    let { r, c } = picked;
    for (let i = 0; i < 40; i++) { // skip over the sea
      r += step[0];
      c += step[1];
      if (r < 0 || c < 0 || r >= meta.lineCount || c >= meta.pointCount) return;
      const place = readAt(grids, meta, r, c);
      if (place) {
        setPicked(place);
        return;
      }
    }
  }

  // what touch.js needs, fresh every render
  const finger = useRef(null);
  useLayoutEffect(() => {
    finger.current = {
      kind: scene.kind,
      read: (touch) => {
        const place = hit(toSvg(touch));
        if (place) setPicked(place);
      },
      sliderTo: (touch) => {
        stopSweep();
        setSlider(sliderFrom(toSvg(touch)));
      },
      sliderScreenX: () => {
        const m = svgRef.current.getScreenCTM();
        return m.a * sliderX + m.e;
      },
      // a reading under Back and Next (a short phone screen) scrolls into view
      reveal: () => {
        const reading = readingRef.current;
        if (!picked || !reading) return;
        const bar = document.querySelector(".stepper");
        const limit = Math.min(window.innerHeight, bar ? bar.getBoundingClientRect().top : Infinity) - 12;
        const over = reading.getBoundingClientRect().bottom - limit;
        if (over > 0) window.scrollBy({ top: over, behavior: REDUCED ? "auto" : "smooth" });
      },
    };
  });
  useTouch(svgRef, finger, fingerTaken);

  // while the lines sink (or rise again), the labels ride on them, still showing the period they left
  const moving = ((scene.kind === "drop" && !scene.back) || rising) && !resting;
  const labelPeriod = (c) => (moving ? (scene.back === "full" ? 1 : 0) : periodAt(c));
  function liftAt(r, c) {
    const i = r * meta.pointCount + c;
    if (!moving) return periods[periodAt(c)].height[i];
    return periods[0].height[i] + (periods[1].height[i] - periods[0].height[i]) * dropE;
  }
  const showLabels = (resting || scene.kind === "drop" || rising) && scene.kind !== "line";
  // back after a full drop the numbers fade back to 1961 to 1990; back mid-drop they carry on as in the drop
  let namesKind = scene.kind;
  if (scene.back === "full") namesKind = "rise";
  if (scene.back === "mid") namesKind = "drop";
  if (unsweep) namesKind = "compare"; // back from scene 4: labels as in scene 4 until the slider is gone
  // in scene 4 a label the slider runs through is left out
  const sliding = scene.kind === "compare" || unsweep;
  const clear = (x0, x1) => !sliding || sliderX < x0 - 8 || sliderX > x1 + 8;

  // the reading speaks for the period on screen
  let view = KEYS[0];
  if (scene.kind === "drop" && resting) view = KEYS[1];
  if (scene.kind === "compare") view = "both";
  const { where, main, rest } = readingText(picked, view);

  // svg units to screen px, so the legend and pills keep one size on every screen
  const pxPerUnit = canvasW / svgW;
  const perPx = pxPerUnit > 0 ? 1 / pxPerUnit : 1;
  const keyH = geo.lift(100) * pxPerUnit; // the legend's height bar, at the map's own scale

  // phone, scene 1: a short window onto the Harz line, opening to the whole map in scene 2
  const windowed = k > 1 && canvasW > 0;
  const lineWindow = windowed && scene.kind === "line";
  const harzTop = Math.max(0, geo.y(harzRow * meta.rowStep) * pxPerUnit - LINE_WINDOW * 0.72);

  const legendColumn = k > 1;
  const legendW = legendColumn ? 132 : 200;
  const legendH = legendColumn ? keyH + 34 * LEGEND_K : keyH + 70 * LEGEND_K;

  return (
    <div className={scene.kind === "compare" ? "snowmap compare" : "snowmap"}>
      {/* the period on screen, above the map and the reading (scene 4 has it on the slider) */}
      <p className="map-period" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          {period && scene.kind !== "compare" && (
            <motion.span key={period} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {period}
            </motion.span>
          )}
        </AnimatePresence>
      </p>

      <div className={windowed ? "map-fit windowed" : "map-fit"} style={windowed ? { height: lineWindow ? LINE_WINDOW : svgH * pxPerUnit } : undefined}>
        <div className="canvas-wrap" style={{ "--ratio": svgW / svgH, transform: lineWindow ? `translateY(${-harzTop}px)` : undefined }}>
          <canvas ref={canvasRef} aria-hidden="true" />
          <svg ref={svgRef} viewBox={`${-gutter} 0 ${svgW} ${svgH}`} role="img" tabIndex={0} className="map-svg"
            aria-label="Germany drawn as stacked lines whose height and ink show snow days a year. Use the arrow keys to read a place."
            onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
            onPointerLeave={onPointerLeave} onKeyDown={onKeyDown} onContextMenu={(e) => e.preventDefault()}>
            <defs>
              {/* soft shadow for the slider's knob and pills */}
              <filter id="lift" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy={0.5 * k} stdDeviation={0.6 * k} floodColor={COLORS.ink} floodOpacity="0.14" />
                <feDropShadow dx="0" dy={3 * k} stdDeviation={4 * k} floodColor={COLORS.ink} floodOpacity="0.10" />
              </filter>
            </defs>

            {showLabels && !sliding && <Seas geo={geo} k={k} />}

            {picked && (resting || scene.kind === "drop") && (
              <PickedLine picked={picked} geo={geo} meta={meta} k={k} liftAt={liftAt} kind={scene.kind} />
            )}

            {scene.kind === "line" && (
              <LineNotes geo={geo} meta={meta} grids={grids} k={k} liftAt={liftAt} harzRow={harzRow} harzPeak={harzPeak}
                westCol={westCol} resting={resting} play={scene.play} />
            )}

            {showLabels && (
              <Names geo={geo} meta={meta} grids={grids} k={k} liftAt={liftAt} periodAt={labelPeriod} clear={clear}
                kind={namesKind} />
            )}

            <AnimatePresence>
              {sliding && (
                <motion.g key="slider" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                  <Slider x={sliderX} height={geo.height} k={k} perPx={perPx} />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>
      </div>

      {/* phone: the reading and the legend side by side under the map. wide screen: both in the left column */}
      <div className="under">
        <p className="reading" aria-hidden="true" ref={readingRef}>
          {picked && (
            <>
              <span className="where">{where}</span>
              <span className="now">{main}</span>
              {rest && <span className="rest">{rest}</span>}
            </>
          )}
          {!picked && resting && <span className={TOUCH ? "hint touch" : "hint"}>{hintFor(scene.kind)}</span>}
        </p>
        {canvasW > 0 && (
          <svg className="legend-side" width={legendW} height={legendH} viewBox={`0 -14 ${legendW} ${legendH}`} aria-hidden="true">
            <Legend keyH={keyH} lift={(days) => geo.lift(days) * pxPerUnit} k={LEGEND_K} column={legendColumn} />
          </svg>
        )}
      </div>

      {/* for screen readers */}
      <p className="sr-only" aria-live="polite">{picked ? `${where}: ${rest ? `${main}; ${rest}` : main}` : ""}</p>
      {scene.kind === "compare" && (
        <label className="sr-only">
          Compare 1961 to 1990 with 1991 to 2020
          <input type="range" min={0} max={100} value={Math.round(sliderAt * 100)} onChange={(e) => setSlider(+e.target.value / 100)} />
        </label>
      )}
    </div>
  );
}
