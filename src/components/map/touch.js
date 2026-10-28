import { useEffect } from "react";
import { HOLD_MS } from "./settings";

// a finger on the map. native listeners, because only a non-passive touchmove can stop the page
// from scrolling once the map has the finger
// - scene 1: any touch reads the one line, left to right
// - scene 4: a touch on the slider takes it at once; elsewhere the first move decides:
//   sideways moves the slider, up or down scrolls the page
// - scenes 2 and 3: a swipe scrolls; touch and hold, then slide, reads as the finger moves
//
// finger.current = { kind, read(touch), sliderTo(touch), sliderScreenX(), reveal() }, set every render
// taken.current = true while the map has the finger
export function useTouch(svgRef, finger, taken) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let timer = 0;
    let start = null;
    let mode = null; // "read", "slider", "scroll", or null while undecided

    const point = (touch) => ({ clientX: touch.clientX, clientY: touch.clientY });
    function take(newMode) {
      mode = newMode;
      taken.current = true;
      clearTimeout(timer);
    }

    function onStart(e) {
      if (e.touches.length !== 1) return;
      const f = finger.current;
      const t = point(e.touches[0]);
      start = t;
      mode = null;
      clearTimeout(timer);
      if (f.kind === "line") {
        take("read");
        f.read(t);
        return;
      }
      if (f.kind === "compare") {
        if (Math.abs(t.clientX - f.sliderScreenX()) < 30) {
          take("slider");
          f.sliderTo(t);
        }
        return;
      }
      timer = setTimeout(() => {
        if (start && !mode) {
          take("read");
          navigator.vibrate?.(8);
          f.read(start);
        }
      }, HOLD_MS);
    }

    function onMove(e) {
      if (!start) return;
      const f = finger.current;
      const t = point(e.touches[0]);
      if (mode === "read") { e.preventDefault(); f.read(t); return; }
      if (mode === "slider") { e.preventDefault(); f.sliderTo(t); return; }
      if (mode === "scroll") return;
      const dx = t.clientX - start.clientX;
      const dy = t.clientY - start.clientY;
      if (f.kind === "compare" && Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        take("slider");
        f.sliderTo(t);
        return;
      }
      if (Math.hypot(dx, dy) > 8) {
        mode = "scroll";
        clearTimeout(timer);
      }
    }

    function onEnd() {
      // a tap or a read: once its reading is on screen, make sure it's not under Back and Next
      if (start && mode !== "scroll" && mode !== "slider") setTimeout(() => finger.current.reveal(), 60);
      clearTimeout(timer);
      start = null;
      mode = null;
      taken.current = false;
    }

    svg.addEventListener("touchstart", onStart, { passive: true });
    svg.addEventListener("touchmove", onMove, { passive: false });
    svg.addEventListener("touchend", onEnd);
    svg.addEventListener("touchcancel", onEnd);
    return () => {
      clearTimeout(timer);
      svg.removeEventListener("touchstart", onStart);
      svg.removeEventListener("touchmove", onMove);
      svg.removeEventListener("touchend", onEnd);
      svg.removeEventListener("touchcancel", onEnd);
    };
  }, [svgRef, finger, taken]);
}
