import { useMemo } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";
import stats from "../data/stats.json";
import { COLORS, TYPE } from "../tokens";
import { useLabelScale } from "../hooks/use-label-scale";

// the evidence: every year as a bar above or below the 1961 to 1990 average,
// a 10-year smoother through them, and the tested step. marty's figure 2, our way.

const W = 940;

export default function EvidenceChart({ animate = true }) {
  // on a phone the whole chart is 375 px wide, so its type is scaled up more than the maps' is
  const k = useLabelScale() === 1 ? 1 : 2.2;
  const H = k === 1 ? 430 : 560;
  const M = { top: 34 * k, right: k === 1 ? 150 : 250, bottom: 44 * k, left: 52 * k };
  const IW = W - M.left - M.right;
  const IH = H - M.top - M.bottom;
  const { years, anomaly, smooth, baseline, step, periods } = stats;
  const { x, y, bars, smoothPath } = useMemo(() => {
    const x = d3.scaleBand().domain(years).range([0, IW]).paddingInner(0.28);
    const ext = d3.max(anomaly, (a) => Math.abs(a));
    const y = d3.scaleLinear().domain([-ext, ext]).range([IH, 0]).nice();
    const bars = years.map((yr, i) => ({ yr, a: anomaly[i], s: smooth[i] }));
    const smoothPath = d3
      .line()
      .x((d) => x(d.yr) + x.bandwidth() / 2)
      .y((d) => y(d.s - baseline.mean))
      .curve(d3.curveCatmullRom.alpha(0.5))(bars);
    return { x, y, bars, smoothPath };
  }, [years, anomaly, smooth, baseline, IW, IH]);

  const cx = (yr) => x(yr) + x.bandwidth() / 2;
  const zero = y(0);
  const ticks = y.ticks(k === 1 ? 6 : 4).filter((t) => t !== 0);
  const cur = periods["1991-2020"];
  const breakX = (x(step.lastYearBefore) + x(step.lastYearBefore + 1)) / 2 + x.bandwidth() / 2;
  const fmt = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
      aria-label="Every year 1951 to 2025 as a bar above or below the 1961 to 1990 average, with a 10-year smoother and the step after 1987">
      <g transform={`translate(${M.left}, ${M.top})`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={IW} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeOpacity={0.18} />
            <text x={-10} y={y(t) + 3.5 * k} textAnchor="end" fontSize={10 * k} fill={COLORS.muted}>{fmt(t)}</text>
          </g>
        ))}
        <text x={-10} y={-14 * k} textAnchor="end" fontSize={9.5 * k} fontWeight={600} letterSpacing="0.12em" fill={COLORS.muted}>
          DAYS
        </text>
        <text x={0} y={-14 * k} fontSize={9.5 * k} fontWeight={600} letterSpacing="0.12em" fill={COLORS.muted}>
          ABOVE OR BELOW THE 1961 TO 1990 AVERAGE OF {Math.round(baseline.mean)} DAYS A YEAR
        </text>

        {/* the 1991 to 2020 normal as a flat line; the 1961 to 1990 normal is the zero line itself */}
        <line x1={x(1991)} x2={x(2020) + x.bandwidth()} y1={y(cur.countryMean - baseline.mean)} y2={y(cur.countryMean - baseline.mean)}
          stroke={COLORS.ink} strokeWidth={1.2 * k} strokeDasharray={`${2 * k} ${3 * k}`} />

        {bars.map((d, i) => {
          const up = d.a >= 0;
          return (
            <motion.rect
              key={d.yr}
              x={x(d.yr)}
              width={x.bandwidth()}
              fill={up ? COLORS.muted : COLORS.accent}
              fillOpacity={0.8}
              initial={animate ? { y: zero, height: 0 } : false}
              animate={{ y: up ? y(d.a) : zero, height: Math.abs(y(d.a) - zero) }}
              transition={{ duration: 0.5, delay: i * 0.012, ease: "easeOut" }}
            />
          );
        })}
        <line x1={0} x2={IW} y1={zero} y2={zero} stroke={COLORS.ink} strokeWidth={k} />
        {/* both averages named in the margin, at the height of their lines, clear of the bars */}
        {[
          ["this line", "1961 to 1990 average", `${Math.round(baseline.mean)} days a year`, zero],
          ["dotted line", "1991 to 2020 average", `${Math.round(cur.countryMean)} days a year`, y(cur.countryMean - baseline.mean)],
        ].map(([what, when, days, at]) => (
          <text key={what} x={IW + 10} y={k === 1 ? at - 9 : what === "this line" ? at - 4 - 26 * k : at + 13 * k} fontSize={11 * k} fill={COLORS.ink}>
            <tspan x={IW + 10} fill={COLORS.muted}>{what}</tspan>
            <tspan x={IW + 10} dy={13 * k}>{when}</tspan>
            <tspan x={IW + 10} dy={13 * k}>{days}</tspan>
          </text>
        ))}

        <motion.path d={smoothPath} fill="none" stroke={COLORS.ink} strokeWidth={2.4 * k} strokeLinecap="round"
          initial={animate ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.9, ease: "easeInOut" }} />

        {/* the step */}
        <line x1={breakX} x2={breakX} y1={0} y2={IH} stroke={COLORS.ink} strokeWidth={0.9 * k} strokeDasharray={`${4 * k} ${3 * k}`} />
        {k === 1 ? (
          <text x={breakX + 8} y={12} fontSize={12} fontStyle="italic" fill={COLORS.ink} style={{ fontFamily: TYPE.display }}>
            where the record splits most sharply: {Math.round(step.meanBefore)} days a year up to {step.lastYearBefore},{" "}
            {Math.round(step.meanAfter)} from {step.lastYearBefore + 1}
          </text>
        ) : (
          <text x={IW} y={12 * k} textAnchor="end" fontSize={11 * k} fontStyle="italic" fill={COLORS.ink} style={{ fontFamily: TYPE.display }}
            paintOrder="stroke" stroke={COLORS.paper} strokeWidth={4 * k}>
            <tspan x={IW}>sharpest split, after {step.lastYearBefore}:</tspan>
            <tspan x={IW} dy={13 * k}>{Math.round(step.meanBefore)} days a year before, {Math.round(step.meanAfter)} after</tspan>
          </text>
        )}

        {d3.range(1950, 2030, 10).filter((t) => x(t) !== undefined).map((t) => (
          <text key={t} x={cx(t)} y={IH + 22 * k} textAnchor="middle" fontSize={10.5 * k} fill={COLORS.muted}>{t}</text>
        ))}
        <text x={IW} y={IH + 38 * k} textAnchor="end" fontSize={9.5 * k} fill={COLORS.muted}>
          bars: each year. curve: smoothed over about ten years.
        </text>
      </g>
    </svg>
  );
}
