import * as d3 from "d3";
import { motion } from "motion/react";
import yearly from "../data/years.json";
import { average } from "../periods";
import { COLORS } from "../tokens";
import { useLabelScale } from "../hooks/use-label-scale";

// the method page's chart: every year as a bar above or below the 1961 to 1990 average,
// and the 1991 to 2020 average as a dotted line

export default function EvidenceChart() {
  // on a phone: narrower, type 1.25x, two-line title, so nothing is smaller than 11 px
  const phone = useLabelScale() !== 1;
  const k = phone ? 1.25 : 1;
  const W = phone ? 360 : 940;
  const H = phone ? 320 : 430;
  const M = phone ? { top: 48, right: 104, bottom: 56, left: 34 } : { top: 34, right: 150, bottom: 44, left: 52 };
  const IW = W - M.left - M.right; // inner width and height, inside the margins
  const IH = H - M.top - M.bottom;

  const years = yearly.years;
  const baseline = average(1961, 1990);
  const current = average(1991, 2020);
  const anomaly = yearly.mean.map((v) => v - baseline); // each year, above (+) or below (-) the baseline

  const x = d3.scaleBand().domain(years).range([0, IW]).paddingInner(0.28);
  const biggest = d3.max(anomaly, (a) => Math.abs(a));
  const y = d3.scaleLinear().domain([-biggest, biggest]).range([IH, 0]).nice();
  const zero = y(0);
  const currentY = y(current - baseline);

  const ticks = y.ticks(phone ? 4 : 6).filter((t) => t !== 0);
  const signed = (v) => (v > 0 ? "+" : "") + Math.round(v);
  const decades = phone ? [1970, 1990, 2010] : [1960, 1970, 1980, 1990, 2000, 2010, 2020];

  // names for the two lines, in the right margin
  const notes = [
    { what: "this line", when: phone ? "1961 to 1990" : "1961 to 1990 average", days: baseline, at: zero },
    { what: "dotted line", when: phone ? "1991 to 2020" : "1991 to 2020 average", days: current, at: currentY },
  ];
  function noteY(note) {
    if (!phone) return note.at - 9;
    if (note.what === "this line") return note.at - 4 - 26 * k; // above the line
    return note.at + 13 * k; // below it
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
      aria-label="Every year 1951 to 2025 as a bar above or below the 1961 to 1990 average, with the 1991 to 2020 average as a dotted line">
      <g transform={`translate(${M.left}, ${M.top})`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={IW} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeOpacity={0.18} />
            <text x={-10} y={y(t) + 3.5 * k} textAnchor="end" fontSize={10 * k} fill={COLORS.muted}>{signed(t)}</text>
          </g>
        ))}

        {phone ? (
          <text x={-M.left} y={-30} fontSize={9.5 * k} fontWeight={600} letterSpacing="0.1em" fill={COLORS.muted}>
            <tspan x={-M.left}>DAYS ABOVE OR BELOW THE</tspan>
            <tspan x={-M.left} dy={14}>1961 TO 1990 AVERAGE OF {Math.round(baseline)} DAYS A YEAR</tspan>
          </text>
        ) : (
          <>
            <text x={-10} y={-14} textAnchor="end" fontSize={9.5} fontWeight={600} letterSpacing="0.12em" fill={COLORS.muted}>DAYS</text>
            <text x={0} y={-14} fontSize={9.5} fontWeight={600} letterSpacing="0.12em" fill={COLORS.muted}>
              ABOVE OR BELOW THE 1961 TO 1990 AVERAGE OF {Math.round(baseline)} DAYS A YEAR
            </text>
          </>
        )}

        {/* 1991 to 2020 average, dotted, over its own years */}
        <line x1={x(1991)} x2={x(2020) + x.bandwidth()} y1={currentY} y2={currentY}
          stroke={COLORS.ink} strokeWidth={1.2 * k} strokeDasharray={`${2 * k} ${3 * k}`} />

        {years.map((year, i) => {
          const up = anomaly[i] >= 0;
          const top = up ? y(anomaly[i]) : zero;
          return (
            <motion.rect key={year} x={x(year)} width={x.bandwidth()} fill={up ? COLORS.muted : COLORS.accent} fillOpacity={0.8}
              initial={{ y: zero, height: 0 }}
              animate={{ y: top, height: Math.abs(y(anomaly[i]) - zero) }}
              transition={{ duration: 0.5, delay: i * 0.012, ease: "easeOut" }} />
          );
        })}

        {/* 1961 to 1990 average = the zero line */}
        <line x1={0} x2={IW} y1={zero} y2={zero} stroke={COLORS.ink} strokeWidth={k} />

        {notes.map((note) => (
          <text key={note.what} x={IW + 10} y={noteY(note)} fontSize={11 * k} fill={COLORS.ink}>
            <tspan x={IW + 10} fill={COLORS.muted}>{note.what}</tspan>
            <tspan x={IW + 10} dy={13 * k}>{note.when}</tspan>
            <tspan x={IW + 10} dy={13 * k}>{`${Math.round(note.days)} days a year`}</tspan>
          </text>
        ))}

        {decades.map((year) => (
          <text key={year} x={x(year) + x.bandwidth() / 2} y={IH + 22 * k} textAnchor="middle" fontSize={10.5 * k} fill={COLORS.muted}>
            {year}
          </text>
        ))}
        <text x={phone ? -M.left : IW} y={IH + 40 * k} textAnchor={phone ? "start" : "end"} fontSize={9.5 * k} fill={COLORS.muted}>
          each bar is one year's average over all of Germany
        </text>
      </g>
    </svg>
  );
}
