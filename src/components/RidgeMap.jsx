import { memo, useMemo } from "react";
import { motion } from "motion/react";
import { COLORS } from "../tokens";
import { geometry, inkStroke, rowPaths } from "../ridge";

// one map of Germany as stacked lines. every line is a band of the country
// (meta.rowStep km from north to south), running west to east. its height is the
// number of days with snow on the ground, its ink gets darker with the same number.
// rows are painted north to south with a paper fill under each line, so a nearer
// band covers the one behind it.

export const RidgeMap = memo(function RidgeMap({ grid, meta, width, ampPx, headroom, reveal = false }) {
  const geo = useMemo(() => geometry(meta, width, ampPx, headroom ?? ampPx), [meta, width, ampPx, headroom]);
  const rows = useMemo(() => rowPaths(grid, meta, geo, true), [grid, meta, geo]);
  const n = rows.length;

  return (
    <g>
      {rows.map(({ r, area, levels }, i) => (
        <motion.g key={r} initial={reveal ? { opacity: 0 } : false} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: reveal ? (i / n) * 1.6 : 0 }}>
          <path d={area} fill={COLORS.paper} />
          {levels.map(({ lv, d }) => {
            const s = inkStroke(lv);
            return (
              <path key={lv} d={d} fill="none" stroke={COLORS.ink} strokeOpacity={s.opacity} strokeWidth={s.width}
                strokeLinejoin="round" strokeLinecap="round" />
            );
          })}
        </motion.g>
      ))}
    </g>
  );
});
