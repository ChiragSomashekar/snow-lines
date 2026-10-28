import { COLORS } from "../../tokens";
import { inkLevel, inkStyle, INK_FULL } from "../../ridge";

// the legend: what a line's height and ink mean, in css px at the map's own scale
// wide screen: height bar, then the ink below it. phone (column): ink standing beside the height bar

const STEPS = 7; // ink samples shown
const TICKS = [[0, ""], [30, "30"], [100, "100"]]; // days, label

export function Legend({ keyH, lift, k, column }) {
  const heading = { fontSize: 9.5 * k, fontWeight: 600, letterSpacing: "0.12em", fill: COLORS.muted };
  const small = { fontSize: 10.5 * k, fill: COLORS.muted, style: { fontVariantNumeric: "tabular-nums" } };
  const inkAt = (i) => inkStyle(inkLevel((i / (STEPS - 1)) * INK_FULL));

  // the height bar with its ticks, drawn upward from (0, 0)
  const heightBar = (labelX) => (
    <>
      <line x1={0} x2={0} y1={0} y2={-keyH} stroke={COLORS.ink} strokeWidth={1} />
      {TICKS.map(([days, text]) => (
        <g key={days} transform={`translate(0, ${-lift(days)})`}>
          <line x1={-4} x2={4} y1={0} y2={0} stroke={COLORS.ink} strokeWidth={1} />
          {text && <text x={labelX} y={3.5 * k} {...small}>{text}</text>}
        </g>
      ))}
    </>
  );

  if (column) {
    const top = 10 * k;
    const inkX = 62 * k;
    const step = keyH / STEPS;
    return (
      <g pointerEvents="none">
        <text x={0} y={0} {...heading}>SNOW DAYS A YEAR</text>
        <g transform={`translate(4, ${top + keyH})`}>{heightBar(9 * k)}</g>
        {Array.from({ length: STEPS }, (_, i) => (
          <rect key={i} x={inkX} y={top + keyH - (i + 1) * step + 0.6} width={8 * k} height={step - 1.2} rx={1.5} fill={inkAt(i).color} />
        ))}
        <text x={inkX + 12 * k} y={top + 3.5 * k} {...small}>{INK_FULL}+</text>
        <text x={inkX + 12 * k} y={top + keyH + 1 * k} {...small}>0</text>
        <text x={0} y={top + keyH + 16 * k} {...small}>height</text>
        <text x={inkX} y={top + keyH + 16 * k} {...small}>ink</text>
      </g>
    );
  }

  const barX = 46 * k; // after the row names
  const inkW = 96 * k;
  const top = 16 * k;
  const inkY = top + keyH + 20 * k;
  return (
    <g pointerEvents="none">
      <text x={0} y={0} {...heading}>SNOW DAYS A YEAR</text>
      <text x={0} y={top + 3.5 * k} {...small}>height</text>
      <g transform={`translate(${barX + 4 * k}, ${top + keyH})`}>{heightBar(10 * k)}</g>
      <text x={0} y={inkY + 3.5 * k} {...small}>ink</text>
      {Array.from({ length: STEPS }, (_, i) => {
        const x = barX + (i * inkW) / STEPS;
        return <line key={i} x1={x} x2={x + inkW / STEPS - 2.5 * k} y1={inkY} y2={inkY} stroke={inkAt(i).color}
          strokeWidth={inkAt(i).width * 1.6} strokeLinecap="round" />;
      })}
      <text x={barX} y={inkY + 16 * k} {...small}>0</text>
      <text x={barX + inkW} y={inkY + 16 * k} textAnchor="end" {...small}>{INK_FULL}+</text>
    </g>
  );
}
