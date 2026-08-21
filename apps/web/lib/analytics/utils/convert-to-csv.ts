import { json2csv } from "json-2-csv";

const FORMULA_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r", "\n"]);

// Prevents CSV/Excel formula injection
function neutralizeCsvFormula(value: string): string {
  return FORMULA_PREFIXES.has(value[0] ?? "") ? `'${value}` : value;
}

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
        return defaultParser(neutralizeCsvFormula(fieldValue));
      }

      return defaultParser(fieldValue);
    },
  });
};
