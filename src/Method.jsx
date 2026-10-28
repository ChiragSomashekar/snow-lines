import { MotionConfig } from "motion/react";
import EvidenceChart from "./components/EvidenceChart";
import { average } from "./periods";

// the method page, at ?method

const before = Math.round(average(1961, 1990));
const after = Math.round(average(1991, 2020));
const lastTen = Math.round(average(2016, 2025));

export default function Method() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="method">
        <div className="stage">
          <header className="stage-head">
            <p className="kicker">How this was made</p>
            <h1>Where did Germany's snow go?</h1>
          </header>

          <h2>The data</h2>
          <ul>
            <li>
              A snow day is a morning with at least 1 cm of snow on the ground. The German weather service (DWD)
              estimates them for every square kilometre of Germany from its weather stations, every year since 1951.
            </li>
            <li>
              Each period is thirty of those yearly maps, averaged: 1961 to 1990 and 1991 to 2020. These are the
              periods the World Meteorological Organization uses, the first as its fixed reference for climate change,
              the second as its current standard.
            </li>
            <li>
              Across Germany: {before} snow days a year in 1961 to 1990, {after} in 1991 to 2020. A third fewer.
            </li>
          </ul>

          <h2>The drawing</h2>
          <ul>
            <li>
              Each line runs west to east, one every 6 km from north to south. It rises and darkens where the ground
              had more snow days.
            </li>
            <li>
              The lines are smoothed with D3's standard blur (d3.blur2, radius 1.5), so DWD's 1 km grid does not show
              as jagged needles. The numbers are not: every number is the thirty-year average of DWD's values for one
              square kilometre. A city's dot sits on the line nearest its centre, at most 3 km away.
            </li>
          </ul>

          <h2>Is the drop real?</h2>
          <p>
            Every year since 1951, as more or fewer snow days than the 1961 to 1990 average. Single years swing
            widely, which is why each map averages thirty of them.
          </p>
          <EvidenceChart />
          <ul>
            <li>The last ten years, 2016 to 2025, averaged {lastTen} days, fewer still.</li>
          </ul>

          <h2>What this does not say</h2>
          <ul>
            <li>Why the snow went. Nothing here tests a cause.</li>
            <li>
              That the measuring never changed. DWD notes: "When comparing grid fields for different years, it should
              be considered that the measurement network has changed over time."
            </li>
          </ul>

          <h2>Sources</h2>
          <ul>
            <li>
              Deutscher Wetterdienst, Climate Data Center:{" "}
              <a href="https://opendata.dwd.de/climate_environment/CDC/grids_germany/annual/snowcover_days/">
                yearly 1 km grids of snow cover days
              </a>
              . Open data, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
            </li>
            <li>
              World Meteorological Organization (2017).{" "}
              <a href="https://library.wmo.int/idurl/4/55797">WMO Guidelines on the Calculation of Climate Normals</a>,
              WMO-No. 1203.
            </li>
            <li>
              Place positions: © <a href="https://www.bkg.bund.de">BKG</a> (2026) <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>, <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_gn250.pdf">Datenquellen</a>. From the Geographische Namen 1:250 000 (GN250),
              converted to DWD's grid; a mountain range is placed at its highest peak.
            </li>
          </ul>
          <p className="source">
            <a href={import.meta.env.BASE_URL}>Back to the map.</a>
          </p>
        </div>
      </main>
    </MotionConfig>
  );
}
