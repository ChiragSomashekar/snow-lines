import { useEffect, useRef } from "react";
import { DROP_HOLD, DROP_MS, LINE_MS, REDUCED, REVEAL_MS, SETTLE_MS, SETTLE_PAUSE, SWEEP_MS, ease } from "./settings";

// draws each scene, animated:
// 1. the one line draws itself west to east
// 2. the land rises in a wave, north to south (back from scene 3: the lines rise again to 1961 to 1990)
// 3. every line sinks from 1961 to 1990 to 1991 to 2020 (back from scene 4: both sides of the slider)
// 4. one side of the slider each, redrawn as it moves
// with reduced motion, each scene jumps to its end
export function useSceneAnimation({ scene, periods, paint, meta, harzRow, sliderCol, onDone, onDrop, onArrive }) {
  const frame = useRef(0);
  const towards = useRef(0); // how far the lines are towards 1991 to 2020, kept between scenes 2 and 3

  useEffect(() => {
    cancelAnimationFrame(frame.current);
    const [before, after] = periods;
    const stop = () => cancelAnimationFrame(frame.current);

    // calls draw(ms since start) every frame until it returns true, then done()
    function play(draw, done) {
      let start = null;
      function tick(now) {
        if (start === null) start = now;
        if (draw(now - start)) done();
        else frame.current = requestAnimationFrame(tick);
      }
      frame.current = requestAnimationFrame(tick);
    }
    const doneNextFrame = (also) => {
      frame.current = requestAnimationFrame(() => { onDone(scene.play); also?.(); });
    };

    // every line moves between the periods, after a pause of `hold` ms.
    // e: how far the lines are towards 1991 to 2020, 0 to 1. it starts from where the lines are,
    // so Back while they sink turns them around instead of jumping
    function move(toE, hold) {
      const fromE = towards.current;
      const target = toE === 1 ? after : before;
      if (REDUCED) {
        towards.current = toE;
        paint(target);
        doneNextFrame(onArrive);
        return;
      }
      const mix = { height: new Float32Array(before.height.length), days: new Float32Array(before.days.length) };
      const duration = Math.max(DROP_MS * Math.abs(toE - fromE), 1); // a shorter way takes less time
      play((ms) => {
        const t = Math.min(Math.max(ms - hold, 0) / duration, 1);
        const e = fromE + (toE - fromE) * ease(t);
        towards.current = e;
        onDrop(e);
        for (let i = 0; i < mix.height.length; i++) {
          mix.height[i] = before.height[i] + (after.height[i] - before.height[i]) * e;
          mix.days[i] = before.days[i] + (after.days[i] - before.days[i]) * e;
        }
        paint(t >= 1 ? target : mix);
        return t >= 1;
      }, () => { onDone(scene.play); onArrive(); });
    }

    // every other scene starts from 1961 to 1990
    if (scene.kind !== "drop" && !scene.back) towards.current = 0;

    if (scene.kind === "line") {
      if (REDUCED) {
        paint(before, { only: harzRow });
        doneNextFrame();
        return stop;
      }
      play((ms) => {
        const t = Math.min(ms / LINE_MS, 1);
        paint(before, { only: harzRow, toCol: Math.round(ease(t) * meta.pointCount) });
        return t >= 1;
      }, () => onDone(scene.play));
      return stop;
    }

    if (scene.kind === "period" && scene.back) {
      move(0, 0);
      return stop;
    }

    if (scene.kind === "period") {
      if (REDUCED) {
        paint(before);
        doneNextFrame();
        return stop;
      }
      // each line rises on its own, the north first
      const spread = 0.55;
      play((ms) => {
        const t = Math.min(ms / REVEAL_MS, 1);
        const rise = (r) => ease(Math.min(Math.max(t * (1 + spread) - (r / meta.lineCount) * spread, 0), 1));
        paint(before, t >= 1 ? {} : { rise });
        return t >= 1;
      }, () => onDone(scene.play));
      return stop;
    }

    if (scene.kind === "compare") {
      paint(null, { from: (c) => (c < sliderCol ? before : after), slider: sliderCol });
      return stop;
    }

    // back from scene 4: the slider's two sides, until it reaches the west edge and all is 1991 to 2020
    if (scene.back === "slider") {
      towards.current = 1;
      if (sliderCol <= 0) paint(after);
      else paint(null, { from: (c) => (c < sliderCol ? before : after), slider: sliderCol });
      return stop;
    }

    // the drop
    move(1, DROP_HOLD);
    return stop;
    // only a new scene, new data or a moved slider redraws; the callbacks change every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, periods, sliderCol]);
}

// scene 4 opens with the slider crossing from west to east, then settling in the middle.
// Back to scene 3 does the opposite: from where the slider is to the east edge, then all the way west,
// and calls onBack at the end. returns a function that stops it, for when the reader grabs the slider
export function useSliderSweep(scene, setSlider, at, onBack) {
  const frame = useRef(0);

  useEffect(() => {
    if (scene.kind === "drop" && scene.back === "slider") {
      if (REDUCED) {
        frame.current = requestAnimationFrame(() => { setSlider(0); onBack(); });
        return () => cancelAnimationFrame(frame.current);
      }
      const toEast = Math.max(SETTLE_MS * 2 * (1 - at), 1); // the same speed as settling in the middle
      let start = null;
      function tick(now) {
        if (start === null) start = now;
        const ms = now - start;
        if (ms < toEast) {
          setSlider(at + (1 - at) * ease(ms / toEast)); // to the east edge
        } else {
          const west = Math.min(Math.max((ms - toEast - SETTLE_PAUSE) / SWEEP_MS, 0), 1);
          setSlider(1 - ease(west)); // all the way west
          if (west >= 1) return onBack();
        }
        frame.current = requestAnimationFrame(tick);
      }
      frame.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame.current);
    }

    if (scene.kind !== "compare") return;
    if (REDUCED) {
      frame.current = requestAnimationFrame(() => setSlider(0.5));
      return () => cancelAnimationFrame(frame.current);
    }
    let start = null;
    function tick(now) {
      if (start === null) start = now;
      const ms = now - start;
      if (ms < SWEEP_MS) {
        setSlider(ease(ms / SWEEP_MS)); // west to east
      } else {
        const back = Math.min(Math.max((ms - SWEEP_MS - SETTLE_PAUSE) / SETTLE_MS, 0), 1);
        setSlider(1 - 0.5 * ease(back)); // back to the middle
      }
      if (ms < SWEEP_MS + SETTLE_PAUSE + SETTLE_MS) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]); // setSlider changes every render

  return () => cancelAnimationFrame(frame.current);
}
