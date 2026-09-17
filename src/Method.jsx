import { MotionConfig } from "motion/react";
import EvidenceChart from "./components/EvidenceChart";
import stats from "./data/stats.json";
import gauges from "./data/gauges.json";
import robust from "./data/robustness.json";

// ?method: only what the poster cannot stand without. every number comes from src/data
// (scripts/*.py); scripts/verify.mjs checks them against the raw files.

const r = Math.round;
const pct = (f) => `${r(f * 100)}%`;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const ref = stats.periods["1961-1990"];
const cur = stats.periods["1991-2020"];
const base = import.meta.env.BASE_URL;

export default function Method() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="method">
        <div className="stage">
          <header className="stage-head">
            <p className="kicker">HOW THIS WAS MADE</p>
            <h1>Where did Germany's snow go?</h1>
            <p className="subtitle">What the maps count, and how to check them.</p>
          </header>

          <h2>What is counted</h2>
          <ul>
            <li>
              A snow day is a morning with at least 1 cm of snow on the ground. The German weather service (DWD) publishes
              how many such days each square kilometre of Germany had, every year since 1951.
            </li>
            <li>
              The lines run west to east, one every 6 km from north to south. A line rises where the land under it had
              more snow days, averaged over thirty years.
            </li>
            <li>
              1961 to 1990 and 1991 to 2020 are the two periods the World Meteorological Organization uses: the first
              as its fixed reference for climate change, the second as its current standard.
            </li>
          </ul>

          <h2>Every year, 1951 to 2025</h2>
          <p>
            Each bar is one year's country average, shown as more or less than the {r(stats.baseline.mean)} days of 1961 to
            1990. The curve is smoothed over about ten years.
          </p>
          <EvidenceChart />
          <p>
            The snow did not fade slowly. It dropped once, at the end of the 1980s: {r(stats.step.meanBefore)} days a year up
            to {stats.step.lastYearBefore}, {r(stats.step.meanAfter)} from {stats.step.lastYearBefore + 1}, with no clear
            trend on either side. Pettitt's test, which finds the year where a record splits most sharply, puts the split
            there. A Swiss study found the same drop in Switzerland (Marty, 2008).
          </p>

          <h2>Would a different choice change the answer?</h2>
          <ul>
            <li>
              Pick any thirty years of the record, then any later thirty years. The later ones always have less snow, by{" "}
              {pct(robust.allPairs.min.fall)} to {pct(robust.allPairs.max.fall)}. The poster's pair: {pct(robust.slicings[0].fall)}.
            </li>
            <li>
              The last ten years, {robust.lastTen.from} to {robust.lastTen.to}, averaged {r(robust.lastTen.mean)} days a year,
              below the {r(cur.countryMean)} of the right-hand map.
            </li>
            <li>
              Of {robust.cells.compared.toLocaleString("en")} square kilometres, all but {WORDS[robust.cells.rose]} have less
              snow in the second period.
            </li>
          </ul>

          <h2>Do the weather stations agree?</h2>
          <p>
            Every number on the poster comes from the grid, which has a value for every square kilometre in every year.
            The grid is not measured everywhere: DWD works it out from the weather stations around each square. So here
            are nine stations as a check: how many snow days each one counted, next to what the map shows for that
            spot. They agree. All nine had less snow in the second period.
          </p>
          <table>
            <thead>
              <tr><th></th><th></th><th colSpan={2}>1961 to 1990, snow days a year</th><th colSpan={2}>1991 to 2020, snow days a year</th></tr>
              <tr><th>Weather station</th><th>Height</th><th>station counted</th><th>map shows</th><th>station counted</th><th>map shows</th></tr>
            </thead>
            <tbody>
              {Object.entries(gauges).map(([id, g]) => {
                const yrs = (k) => (g.periods[k].years < 30 ? ` (${g.periods[k].years})` : "");
                return (
                  <tr key={id}>
                    <td>{g.name}</td><td>{r(g.height)} m</td>
                    <td>{r(g.periods["1961-1990"].mean)}{yrs("1961-1990")}</td><td>{r(g.grid["1961-1990"].exact)}</td>
                    <td>{r(g.periods["1991-2020"].mean)}{yrs("1991-2020")}</td><td>{r(g.grid["1991-2020"].exact)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="source">
            At the four mountain stations the map runs low, by 5 to 20 percent. The station sits on the peak; the map
            value stands for the whole square kilometre around it, most of which is lower. A number in brackets means the
            station has data for only that many of the thirty years; its average, and the map value next to it, are over
            those years.
          </p>
          <p className="source">
            A second check, on the country average: DWD's own chart of this data prints 47.2 days a year for 1961 to
            1990. This grid gives {ref.countryMean.toFixed(1)}.
          </p>

          <h2>What this does not say</h2>
          <ul>
            <li>Why the snow went. Nothing here tests a cause.</li>
            <li>
              That every cell is right. Four cells in the highest Alps carry more snow days than the year has days, in six
              of the 75 years. They are left as published. Capping them at 365 changes no number on the poster.
            </li>
          </ul>

          <h2>Sources</h2>
          <ul>
            <li>
              Deutscher Wetterdienst, Climate Data Center:{" "}
              <a href="https://opendata.dwd.de/climate_environment/CDC/grids_germany/annual/snowcover_days/">annual 1 km grids of snow cover days</a>, 1951 to 2025, and{" "}
              <a href="https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical/">daily station observations</a>, stations {Object.keys(gauges).join(", ")}.
              Each folder holds its own description, a file named DESCRIPTION. Open data, CC BY 4.0.
            </li>
            <li>
              Deutscher Wetterdienst, <a href="https://www.dwd.de/DE/leistungen/zeitreihen/zeitreihen.html">Zeitreihen und Trends</a>: Tage mit Schneedecke, Deutschland, Jahr. The 47.2 in the second check is
              printed on that chart with the 1961 to 1990 reference.
            </li>
            <li>
              World Meteorological Organization (2017). <a href="https://library.wmo.int/idurl/4/55797">WMO Guidelines on the Calculation of Climate Normals</a>, WMO-No. 1203.
            </li>
            <li>
              Marty, C. (2008). <a href="https://doi.org/10.1029/2008GL033998">Regime shift of snow days in Switzerland</a>. Geophysical Research Letters 35, L12501.
            </li>
            <li>
              Pettitt, A. N. (1979). <a href="https://doi.org/10.2307/2346729">A non-parametric approach to the change-point problem</a>. Applied Statistics 28, 126 to 135.
            </li>
          </ul>
          <p className="source">
            <a href={base}>Back to the poster.</a>
          </p>
        </div>
      </main>
    </MotionConfig>
  );
}
