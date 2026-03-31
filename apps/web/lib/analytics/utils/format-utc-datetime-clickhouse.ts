import { TZDate } from "@date-fns/tz";

export const formatUTCDateTimeClickhouse = (date: Date | TZDate) => {
  return new Date(date.getTime())
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
};
