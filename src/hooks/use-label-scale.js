import { useEffect, useState } from "react";

// svg text scales with its viewBox, so on a phone the maps stack and every label is
// multiplied by this factor. 1 on a desktop, 1.6 below 640 css px.
const QUERY = "(max-width: 640px)";

export function useLabelScale() {
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow ? 1.6 : 1;
}
