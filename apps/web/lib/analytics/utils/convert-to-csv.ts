import { json2csv } from "json-2-csv";

const FORMULA_TRIGGER_CHARS = /^[=+\-@\t\r]/;
const neutralizeFormula = (value: string) =>
  FORMULA_TRIGGER_CHARS.test(value) ? `'${value}` : value;

export const convertToCSV = (data: object[]) => {
  return json2csv(data, {
    parseValue(fieldValue, defaultParser) {
      if (fieldValue == null) {
        return "";
      }

      if (fieldValue instanceof Date) {
        return fieldValue.toISOString();
      }

      if (typeof fieldValue === "string") {
        return defaultParser(neutralizeFormula(fieldValue));
      }

      return defaultParser(fieldValue);
    },
  });
};
