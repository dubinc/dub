import * as chrono from "chrono-node";

// Function to parse a date string into a Date object
export const parseDateTime = (str: Date | string) => {
  if (str instanceof Date) return str;
  return chrono.parseDate(str);
};
