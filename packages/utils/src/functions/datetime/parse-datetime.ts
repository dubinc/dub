import * as chrono from "chrono-node";

// Function to parse a date string into a Date object
export const parseDateTime = (str: Date | string) => {
  if (str instanceof Date) return str;
  return chrono.parseDate(str);
};

export const toDate = (
  value: Date | string | null | undefined,
): Date | null => {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};
