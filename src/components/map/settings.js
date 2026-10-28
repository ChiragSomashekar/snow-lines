// fixed numbers for the map

// sizes, in svg units
export const MAP_W = 560; // the map's width
export const PAD_R = 40; // room right of the map
export const GUTTER = 175; // room left of the map for the legend, on a wide screen
export const AMP_FRAC = 0.3; // a 365-day line rises 30% of the map's height

// timings, in ms
export const LINE_MS = 2200; // scene 1: the line draws itself
export const REVEAL_MS = 2400; // scene 2: the land rises
export const DROP_HOLD = 700; // scene 3: pause before the lines sink
export const DROP_MS = 3000; //          the lines sink
export const SWEEP_MS = 1600; // scene 4: the slider crosses to the east
export const SETTLE_PAUSE = 200; //       waits
export const SETTLE_MS = 1100; //         and comes back to the middle
export const HOLD_MS = 500; // touch and hold, Apple's default (UILongPressGestureRecognizer)

// phone, scene 1: the map is seen through a window this tall (px) around the one line
export const LINE_WINDOW = 240;

export const CITIES = ["Hamburg", "Berlin", "Cologne", "Frankfurt", "Dresden", "Munich"];
export const RANGES = ["Black Forest", "Harz", "Erzgebirge", "Bavarian Forest", "Thuringian Forest"];
export const PHONE_RANGES = ["Black Forest", "Harz", "Bavarian Forest"]; // less room on a phone
export const RANGE_STYLE = { Erzgebirge: { anchor: "middle", dx: -34, dy: 17 } }; // nudged off the lines

// on open water: North Sea west of Heligoland (54.3°N 6.8°E), Baltic north of Rügen (55.0°N 12.95°E)
export const SEAS = [
  { name: "North Sea", colKm: 76, rowKm: 84 },
  { name: "Baltic Sea", colKm: 473, rowKm: 4 },
];

export const TOUCH = window.matchMedia("(hover: none)").matches; // a phone or tablet, no mouse
export const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// slow, fast, slow
export function ease(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// what the reading says before anything is picked
export function hintFor(kind) {
  if (!TOUCH && kind === "line") return "Point at the line to read it";
  if (!TOUCH) return "Point at the map to read any place";
  if (kind === "line") return "Touch the line and slide to read it.";
  if (kind === "compare") return "Tap the map to read a place. Drag sideways to compare.";
  return "Tap the map to read a place, or touch and hold, then slide.";
}
