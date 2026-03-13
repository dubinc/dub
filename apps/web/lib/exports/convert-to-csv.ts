import { json2csv } from "json-2-csv";

export const convertToCSV = (
  data: object[],
  opts?: { prependHeader?: boolean },
) => {
  return json2csv(data, {
    prependHeader: opts?.prependHeader ?? true,
    parseValue(fieldValue, defaultParser) {
      if (fieldValue instanceof Date) {
        return fieldValue.toISOString();
      }
      return defaultParser(fieldValue);
    },
  });
};
