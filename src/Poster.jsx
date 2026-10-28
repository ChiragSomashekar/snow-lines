import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useSnow } from "./hooks/use-snow";
import { useLabelScale } from "./hooks/use-label-scale";
import { SnowMap } from "./components/map/SnowMap";
import { KEYS, label } from "./periods";

// the map page: four scenes with Back and Next (or the arrow keys)
// 1. one line  2. every line, 1961 to 1990  3. the lines sink to 1991 to 2020  4. a slider to compare

export default function Poster() {
  const snow = useSnow();
  const k = useLabelScale();
  const [step, setStep] = useState(0);
  const [play, setPlay] = useState(0); // goes up every time a scene starts, so its animation replays
  const [arrived, setArrived] = useState(false); // the lines have reached the period they move to
  // with Back, the scene before plays in reverse instead of starting over:
  // "full" / "mid": 3 to 2, the lines rise again (they had sunk all the way / Back came while they sank)
  // "slider": 4 to 3, the slider goes east, then all the way west
  const [back, setBack] = useState(false);

  const scene = useMemo(() => {
    const scenes = [
      { kind: "line", play },
      { kind: "period", play, back },
      { kind: "drop", play, back },
      { kind: "compare", play },
    ];
    return scenes[step];
  }, [step, play, back]);

  function go(to) {
    if (to < 0 || to > 3) return;
    setArrived(false);
    let reverse = false;
    if (step === 2 && to === 1) reverse = arrived ? "full" : "mid";
    if (step === 3 && to === 2) reverse = "slider";
    setBack(reverse);
    setPlay(play + 1);
    setStep(to);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest(".map-svg")) return; // the map uses the arrow keys itself
      if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return; // cmd/alt + arrow = browser back/forward
      if (e.key === "ArrowRight") { e.preventDefault(); go(step + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!snow) return <main className="steps-page"><p className="loading">Loading the grids</p></main>;
  if (snow.error) return <main className="steps-page"><p className="loading">The map could not load. Reload the page to try again.</p></main>;

  const { meta, grids } = snow;
  const before = Math.round(meta.periods[KEYS[0]].mean);
  const after = Math.round(meta.periods[KEYS[1]].mean);
  const dropped = `Thirty years later, the same lines sit lower: ${after} snow days a year.`;

  const captions = [
    "This line crosses Germany from west to east. The more days with snow, the higher and darker it gets.",
    `Add one every ${meta.rowStep} km from north to south and the country appears: ${before} snow days a year on average.`,
    arrived ? dropped : "Thirty years later, the same lines.",
    "Drag across the map to compare the two periods.",
  ];

  // the period shown above the map (none in scene 4, the slider has its own labels)
  let period = label(KEYS[0]);
  if (step === 2 && arrived) period = label(KEYS[1]);
  if (step === 1 && back === "full" && !arrived) period = label(KEYS[1]); // still rising from 1991 to 2020
  if (step === 2 && back === "slider" && !arrived) period = ""; // the slider is still on screen
  if (step === 3) period = "";

  function dotClass(i) {
    if (i < step) return "step-dot done";
    if (i === step) return "step-dot now";
    return "step-dot";
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="steps-page">
        <div className="stage">
          <header className="stage-head">
            <p className="kicker">Where did Germany's snow go?</p>
            <h1>Germany now has a third fewer snow days than in 1961 to 1990</h1>
          </header>

          <div className="caption-row">
            <div className="caption-cell">
              {/* every caption, invisible and stacked, so the row is always as tall as the longest
                  one and the map doesn't jump when the caption changes */}
              {[...captions, dropped].map((text, i) => (
                <p key={i} className="caption sizer" aria-hidden="true">{text}</p>
              ))}
              <AnimatePresence mode="wait">
                <motion.p key={step === 2 ? `${step}-${arrived}` : step} className="caption" aria-live="polite"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                  {captions[step]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <SnowMap meta={meta} grids={grids} scene={scene} k={k} onArrive={() => setArrived(true)} period={period} />

          <p className="source">
            Data: Deutscher Wetterdienst. Places: © <a href="https://www.bkg.bund.de">BKG</a> (2026){" "}
            <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>,{" "}
            <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_gn250.pdf">Datenquellen</a>.{" "}
            <a href={import.meta.env.BASE_URL + "?method"}>How this was made.</a>
          </p>
        </div>

        <nav className="stepper" aria-label="Scenes">
          {/* aria-disabled instead of disabled, so the button keeps keyboard focus at either end */}
          <button type="button" className="step-btn" onClick={() => go(step - 1)} aria-disabled={step === 0}>
            <span aria-hidden="true">&larr; </span>Back
          </button>
          <div className="dots" aria-label={`Scene ${step + 1} of 4`}>
            {captions.map((_, i) => (
              <button key={i} type="button" className={dotClass(i)} onClick={() => go(i)}
                aria-label={`Go to scene ${i + 1}`} aria-current={i === step ? "step" : undefined} />
            ))}
          </div>
          <button type="button" className="step-btn" onClick={() => go(step + 1)} aria-disabled={step === 3}>
            Next<span aria-hidden="true"> &rarr;</span>
          </button>
        </nav>
      </main>
    </MotionConfig>
  );
}
