import yearly from "./data/years.json";

// WMO periods: 1961 to 1990 is the reference, 1991 to 2020 the current standard
export const KEYS = ["1961-1990", "1991-2020"];

// "1961-1990" -> "1961 to 1990"
export const label = (key) => key.replace("-", " to ");

// Germany's average snow days a year, from `first` to `last`
export function average(first, last) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < yearly.years.length; i++) {
    if (yearly.years[i] >= first && yearly.years[i] <= last) {
      total += yearly.mean[i];
      count++;
    }
  }
  return total / count;
}
