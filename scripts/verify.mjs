// checks every number the two pages print against the data files the scripts wrote,
// and a few things about the pages themselves. exit code 1 on any failure.
//   node scripts/verify.mjs
import { readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const json = (path) => JSON.parse(read(path));
const meta = json("public/data/meta.json");
const stats = json("src/data/stats.json");
const gauges = json("src/data/gauges.json");
const robust = json("src/data/robustness.json");
const places = json("src/data/places.json");
const grid = (key) => new Uint16Array(read(`public/data/snow_${key}.bin`).buffer);
const years = meta.years;
const mean = (y) => meta.stats[y].mean;
const avg = (ys) => ys.reduce((s, y) => s + mean(y), 0) / ys.length;
const r = Math.round;
const PERIODS = ["1961-1990", "1991-2020"];
const CITIES = ["Hamburg", "Berlin", "Cologne", "Frankfurt", "Dresden", "Munich"];

let fails = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) fails++;
};

// the poster's headline numbers
const P1 = meta.periods["1961-1990"];
const P2 = meta.periods["1991-2020"];
check("75 years, 1951 to 2025", years.length === 75 && years[0] === 1951 && years[74] === 2025);
check("1961 to 1990 averaged 48 days a year", r(P1.mean) === 48, P1.mean);
check("1991 to 2020 averaged 32 days a year", r(P2.mean) === 32, P2.mean);
check("a period grid's mean equals the mean of its yearly means", Math.abs(P1.mean - avg(years.filter((y) => y >= 1961 && y <= 1990))) < 0.05
  && Math.abs(P2.mean - avg(years.filter((y) => y >= 1991 && y <= 2020))) < 0.05);
check("four in five square kilometres had a month or more, now two in five", r(P1.share30 * 5) === 4 && r(P2.share30 * 5) === 2,
  `${P1.share30} ${P2.share30}`);
check("no cell was dropped from either period", P1.cellsDropped === 0 && P2.cellsDropped === 0);
check("stats.json agrees with meta.json on the period means", Math.abs(stats.periods["1961-1990"].countryMean - P1.mean) < 0.05
  && Math.abs(stats.periods["1991-2020"].countryMean - P2.mean) < 0.05);

// the city dots print the drawn cell, and the hover reads the same cell
const { readAt } = await import("../src/ridge.js");
for (const key of PERIODS) {
  const g = grid(key);
  for (const c of CITIES) {
    const pl = places.find((p) => p.name === c);
    const row = r(pl.row / meta.rowStep), col = r(pl.col / meta.colStep);
    const drawn = stats.periods[key].cities[c].drawn;
    check(`${c} ${key}: the dot prints the drawn cell`, g[row * meta.subCols + col] === drawn, drawn);
    const hover = readAt(g, meta, row * meta.rowStep, pl.col);
    check(`${c} ${key}: a hover reads the same ${drawn}`, hover && hover.v === drawn, hover && hover.v);
    check(`${c} ${key}: a possible number of days`, drawn <= 365);
  }
}
check("a hover on the sea reads nothing", readAt(grid("1961-1990"), meta, 30, 30) === null);
for (const key of PERIODS) {
  // "Zugspitze, up to N": the highest raw cell within 2 km of the station, from gridcells.py
  const near = gauges["5792"].grid[key].near, gauge = gauges["5792"].periods[key].mean;
  check(`Zugspitze label ${key} is within 5 percent of the station and a possible number of days`,
    Math.abs(near - gauge) / gauge < 0.05 && near <= 365, `${near} vs ${gauge}`);
}

// the yearly chart and the split
check("the chart's zero line is the 1961 to 1990 average", Math.abs(stats.baseline.mean - P1.mean) < 0.05, stats.baseline.mean);
check("the split is after 1987", stats.step.lastYearBefore === 1987 && stats.step.p < 0.001, `${stats.step.lastYearBefore}, p ${stats.step.p.toExponential(1)}`);
check("48 days a year up to 1987, 29 from 1988", r(stats.step.meanBefore) === 48 && r(stats.step.meanAfter) === 29, `${stats.step.meanBefore}, ${stats.step.meanAfter}`);
check("no clear trend on either side of the split", stats.step.withinHalves.before.mkP > 0.05 && stats.step.withinHalves.after.mkP > 0.05,
  `${stats.step.withinHalves.before.mkP}, ${stats.step.withinHalves.after.mkP}`);

// would a different choice change the answer?
check("every possible pair of thirty-year periods was tested: 136", robust.allPairs.count === 136, robust.allPairs.count);
check("every pair falls, the smallest by more than a tenth", robust.allPairs.min.fall > 0.1,
  `${(robust.allPairs.min.fall * 100).toFixed(0)}% at ${robust.allPairs.min.a}-${robust.allPairs.min.b}`);
check("the poster's pair is not the most dramatic pair", robust.slicings[0].fall < robust.allPairs.max.fall,
  `${(robust.slicings[0].fall * 100).toFixed(0)}% vs ${(robust.allPairs.max.fall * 100).toFixed(0)}%`);
check("the poster's pair is the WMO pair and falls a third", robust.slicings[0].a[0] === 1961 && robust.slicings[0].b[0] === 1991
  && robust.slicings[0].fall > 0.3 && robust.slicings[0].fall < 0.37, robust.slicings[0].fall);
check("the last ten years sit below the 1991 to 2020 average", robust.lastTen.from === 2016 && robust.lastTen.to === 2025
  && robust.lastTen.mean < P2.mean, `${robust.lastTen.mean} vs ${P2.mean}`);
check("all but three square kilometres have less snow in the second period", robust.cells.rose === 3
  && robust.cells.fell + robust.cells.rose === robust.cells.compared, `${robust.cells.fell} of ${robust.cells.compared}`);

// do the weather stations agree?
check("nine stations", Object.keys(gauges).length === 9);
for (const g of Object.values(gauges)) {
  check(`${g.name}: less snow in the second period`, g.periods["1991-2020"].mean < g.periods["1961-1990"].mean,
    `${g.periods["1961-1990"].mean} to ${g.periods["1991-2020"].mean}`);
  const summit = g.height > 1000;
  // lowland stations: the map cell within 3 days of the station. mountain stations: below it, by at most 20 percent
  for (const key of PERIODS) {
    const station = g.periods[key].mean, map = g.grid[key].exact;
    check(`${g.name} ${key}: the map agrees with the station`,
      summit ? map <= station && r(((station - map) / station) * 100) <= 20 : Math.abs(map - station) <= 3, `map ${map}, station ${station}`);
  }
}
{
  const lows = Object.values(gauges).filter((g) => g.height > 1000).flatMap((g) =>
    PERIODS.map((key) => r(((g.periods[key].mean - g.grid[key].exact) / g.periods[key].mean) * 100)));
  check("at the four mountain stations the map runs low by 5 to 20 percent", Math.min(...lows) === 5 && Math.max(...lows) === 20, lows.join(" "));
}
check("the map at a station with missing years is averaged over the same years", Object.values(gauges).every((g) =>
  PERIODS.every((key) => g.periods[key].years === g.periods[key].yearsUsed.length)));

// what this does not say
check("four cells above 365 days, in six of the 75 years", robust.over365.cells === 4 && robust.over365.years === 6, JSON.stringify(robust.over365));
check("capping them at 365 changes no number on the poster",
  PERIODS.every((key) => robust.over365.meanCapped[key] === robust.over365.meanAsPublished[key]));

// the pages themselves
const poster = read("src/Poster.jsx").toString();
const method = read("src/Method.jsx").toString();
const html = read("index.html").toString();
check("one headline on the poster, the method page and the title tag",
  poster.includes("<h1>Where did Germany's snow go?</h1>") && method.includes("<h1>Where did Germany's snow go?</h1>")
  && html.includes("<title>Where did Germany's snow go?</title>"));
check("index.html links the favicon", /rel="icon"[^>]*href="\/favicon\.svg"/.test(html));
check("the favicon is the drawn one", read("public/favicon.svg").toString().includes("#21201c"));
check("og.png is 1200 by 630", (() => { const b = read("public/og.png"); return b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630; })());

// no em dashes anywhere a reader can see
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)]));
for (const f of [...walk(new URL("../src/", import.meta.url)), new URL("../index.html", import.meta.url), new URL("../README.md", import.meta.url)]) {
  if (!/\.(jsx?|css|json|html|md)$/.test(f.pathname)) continue;
  check(`no em dash in ${f.pathname.split("/snow-lines/")[1]}`, !readFileSync(f, "utf8").includes("—"));
}

console.log(fails ? `\n${fails} check(s) failed` : "\nall checks pass");
process.exit(fails ? 1 : 0);
