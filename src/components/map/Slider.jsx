import { COLORS } from "../../tokens";
import { MAP_W, PAD_R, TOUCH } from "./settings";

// scene 4's slider: a thin line, a round knob with two arrows, and a pill for each period
// x: the slider's position; height: the map's; k: label scale; perPx: svg units per css px

const NAMES = ["1961 to 1990", "1991 to 2020"];

export function Slider({ x, height, k, perPx }) {
  const knobY = height * 0.52;
  const r = TOUCH ? 22 * perPx : 13 * k; // 44 px across under a finger
  const pill = pillSize(perPx);
  const widths = NAMES.map((name) => pillSize(perPx, name).w);

  // each pill on its own side of the line, hidden when there's no room
  const leftX = x - 8 * perPx - widths[0];
  const rightX = x + 8 * perPx;
  const show = [leftX >= 2, rightX + widths[1] <= MAP_W + PAD_R - 2];

  // the knob stays whole on screen, even when the line is at the edge
  const kx = Math.min(Math.max(x, r + 2), MAP_W + PAD_R - r - 2);
  const arrow = r * 0.246; // half an arrow's height
  const gap = r * 0.323; // arrow distance from the centre

  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={pill.y + pill.h + 6 * perPx} y2={height - 4} stroke={COLORS.ink} strokeOpacity={0.32} strokeWidth={0.75} />
      {show[0] && <Pill x={leftX} text={NAMES[0]} perPx={perPx} />}
      {show[1] && <Pill x={rightX} text={NAMES[1]} perPx={perPx} />}
      <g filter="url(#lift)">
        <circle cx={kx} cy={knobY} r={r} fill="#fffdf9" />
      </g>
      <path d={`M${kx - gap + arrow * 0.5},${knobY - arrow} L${kx - gap - arrow * 0.5},${knobY} L${kx - gap + arrow * 0.5},${knobY + arrow}
        M${kx + gap - arrow * 0.5},${knobY - arrow} L${kx + gap + arrow * 0.5},${knobY} L${kx + gap - arrow * 0.5},${knobY + arrow}`}
        fill="none" stroke={COLORS.ink} strokeOpacity={0.7} strokeWidth={1.1 * k} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

// 13 px type in a 28 px pill, the same size on every screen
function pillSize(perPx, text = "") {
  return { font: 13 * perPx, h: 28 * perPx, y: 2 * perPx, w: (text.length * 13 * 0.55 + 26) * perPx };
}

function Pill({ x, text, perPx }) {
  const { font, h, y, w } = pillSize(perPx, text);
  return (
    <g filter="url(#lift)" pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="#fffdf9" fillOpacity={0.92} />
      <text x={x + w / 2} y={y + h / 2 + font * 0.35} textAnchor="middle" fontSize={font} fontWeight={500}
        letterSpacing="0.01em" fill={COLORS.ink} fillOpacity={0.82}>{text}</text>
    </g>
  );
}
