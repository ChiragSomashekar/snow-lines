import { change, nearestPlace, whereIs } from "../../ridge";
import places from "../../data/places.json";
import { KEYS } from "../../periods";

// what the reader picked, in words: where it is, and its snow days
// view: the period on screen, or "both" in scene 4
// before 1991 to 2020 is on screen: "45 snow days a year"
// after: "64 → 45 snow days a year", "30% fewer than in 1961 to 1990"
export function readingText(picked, view) {
  if (!picked) return { where: "", main: "", rest: "" };
  const near = whereIs(nearestPlace(places, picked.rowKm, picked.colKm));
  const where = near.charAt(0).toUpperCase() + near.slice(1); // "the Harz" -> "The Harz"
  const { a, b } = picked;

  if (view === KEYS[0]) {
    return { where, main: `${a} snow ${a === 1 ? "day" : "days"} a year`, rest: "" };
  }
  const rest = a === b ? "the same in both periods" : `${change(a, b)} than in 1961 to 1990`;
  return { where, main: `${a} → ${b} snow days a year`, rest };
}
