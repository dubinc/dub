import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import { describe, expect, it } from "vitest";

describe("WORKFLOW_OPERATORS.gte.evaluate", () => {
  const { evaluate } = WORKFLOW_OPERATORS.gte;

  it("returns true when attribute value is greater than or equal to condition", () => {
    expect(evaluate(10, 10)).toBe(true);
    expect(evaluate(11, 10)).toBe(true);
  });

  it("returns false when attribute value is less than condition", () => {
    expect(evaluate(9, 10)).toBe(false);
  });

  it("returns false when condition value is not a number", () => {
    expect(evaluate(10, { min: 1, max: 5 })).toBe(false);
  });
});

describe("WORKFLOW_OPERATORS.between.evaluate", () => {
  const { evaluate } = WORKFLOW_OPERATORS.between;

  it("returns true when attribute value is within inclusive range", () => {
    expect(evaluate(1, { min: 1, max: 5 })).toBe(true);
    expect(evaluate(3, { min: 1, max: 5 })).toBe(true);
    expect(evaluate(5, { min: 1, max: 5 })).toBe(true);
  });

  it("returns false when attribute value is outside range", () => {
    expect(evaluate(0, { min: 1, max: 5 })).toBe(false);
    expect(evaluate(6, { min: 1, max: 5 })).toBe(false);
  });

  it("returns false when condition value is missing or invalid", () => {
    expect(evaluate(3, 3)).toBe(false);
    expect(evaluate(3, { min: 1 })).toBe(false);
    expect(evaluate(3, null as unknown as { min: number; max: number })).toBe(
      false,
    );
  });
});

describe("WORKFLOW_OPERATORS.gte.validate", () => {
  const { validate } = WORKFLOW_OPERATORS.gte;

  it("accepts a non-negative number", () => {
    expect(() => validate(0)).not.toThrow();
    expect(() => validate(1)).not.toThrow();
    expect(() => validate(100)).not.toThrow();
  });

  it("rejects non-number, NaN, and negative values", () => {
    expect(() => validate({ min: 1, max: 5 })).toThrow(
      "Please enter a value greater than or equal to 0.",
    );
    expect(() => validate(NaN)).toThrow(
      "Please enter a value greater than or equal to 0.",
    );
    expect(() => validate(-1)).toThrow(
      "Please enter a value greater than or equal to 0.",
    );
  });
});

describe("WORKFLOW_OPERATORS.between.validate", () => {
  const { validate } = WORKFLOW_OPERATORS.between;

  it("accepts a valid min/max range", () => {
    expect(() => validate({ min: 1, max: 5 })).not.toThrow();
  });

  it("rejects an invalid value shape", () => {
    expect(() => validate(5)).toThrow("Please enter a valid value.");
  });

  it("rejects arrays", () => {
    expect(() => validate(["grp_1"])).toThrow("Please enter a valid value.");
  });

  it("rejects non-positive or missing min", () => {
    expect(() => validate({ min: 0, max: 5 })).toThrow(
      "Please enter a minimum value greater than 0.",
    );
    expect(() => validate({ min: NaN, max: 5 })).toThrow(
      "Please enter a minimum value greater than 0.",
    );
  });

  it("rejects non-positive or missing max", () => {
    expect(() => validate({ min: 1, max: 0 })).toThrow(
      "Please enter a maximum value (limit) greater than 0.",
    );
    expect(() => validate({ min: 1 })).toThrow(
      "Please enter a maximum value (limit) greater than 0.",
    );
  });

  it("rejects when max is less than or equal to min", () => {
    expect(() => validate({ min: 5, max: 5 })).toThrow(
      "Maximum value must be greater than minimum value.",
    );
    expect(() => validate({ min: 5, max: 4 })).toThrow(
      "Maximum value must be greater than minimum value.",
    );
  });
});

describe("WORKFLOW_OPERATORS.eq", () => {
  const { evaluate, validate } = WORKFLOW_OPERATORS.eq;

  it("evaluates string equality", () => {
    expect(evaluate("grp_1", "grp_1")).toBe(true);
    expect(evaluate("grp_1", "grp_2")).toBe(false);
  });

  it("returns false for non-string inputs", () => {
    expect(evaluate(1, "grp_1")).toBe(false);
    expect(evaluate("grp_1", 1)).toBe(false);
  });

  it("validates non-empty strings", () => {
    expect(() => validate("grp_1")).not.toThrow();
    expect(() => validate("")).toThrow("Please select a valid value.");
    expect(() => validate(["grp_1"])).toThrow("Please select a valid value.");
  });
});

describe("WORKFLOW_OPERATORS.ne", () => {
  const { evaluate, validate } = WORKFLOW_OPERATORS.ne;

  it("evaluates string inequality", () => {
    expect(evaluate("grp_1", "grp_2")).toBe(true);
    expect(evaluate("grp_1", "grp_1")).toBe(false);
  });

  it("validates non-empty strings", () => {
    expect(() => validate("grp_1")).not.toThrow();
    expect(() => validate("")).toThrow("Please select a valid value.");
  });
});

describe("WORKFLOW_OPERATORS.in", () => {
  const { evaluate, validate } = WORKFLOW_OPERATORS.in;

  it("evaluates membership in a list", () => {
    expect(evaluate("grp_1", ["grp_1", "grp_2"])).toBe(true);
    expect(evaluate("grp_3", ["grp_1", "grp_2"])).toBe(false);
  });

  it("returns false for invalid shapes", () => {
    expect(evaluate("grp_1", "grp_1")).toBe(false);
    expect(evaluate(1, ["grp_1"])).toBe(false);
  });

  it("validates non-empty string arrays", () => {
    expect(() => validate(["grp_1"])).not.toThrow();
    expect(() => validate([])).toThrow(
      "Please select at least one valid value.",
    );
    expect(() => validate("grp_1")).toThrow(
      "Please select at least one valid value.",
    );
    expect(() => validate([""])).toThrow(
      "Please select at least one valid value.",
    );
  });
});

describe("WORKFLOW_OPERATORS.notIn", () => {
  const { evaluate, validate } = WORKFLOW_OPERATORS.notIn;

  it("evaluates exclusion from a list", () => {
    expect(evaluate("grp_3", ["grp_1", "grp_2"])).toBe(true);
    expect(evaluate("grp_1", ["grp_1", "grp_2"])).toBe(false);
  });

  it("validates non-empty string arrays", () => {
    expect(() => validate(["grp_1", "grp_2"])).not.toThrow();
    expect(() => validate([])).toThrow(
      "Please select at least one valid value.",
    );
  });
});
