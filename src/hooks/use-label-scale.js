import { useEffect, useState } from "react";

// svg text shrinks with the map on a phone, so labels are drawn 1.6 times larger there
const PHONE = "(max-width: 640px)";

export function useLabelScale() {
  const [phone, setPhone] = useState(window.matchMedia(PHONE).matches);

  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const update = () => setPhone(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return phone ? 1.6 : 1;
}
