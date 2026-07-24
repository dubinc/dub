type ConditionValue = number | { min: number; max?: number };

type WorkflowOperator = {
  name: string;
  label: string;
  validate: (value: ConditionValue) => void;
  evaluate: (attributeValue: number, conditionValue: ConditionValue) => boolean;
};

export const WORKFLOW_OPERATORS = {
  // Greater than or equal to
  gte: {
    name: "gte",
    label: "at least",
    validate(value: ConditionValue) {
      if (typeof value !== "number" || isNaN(value) || value < 0) {
        throw new Error("Please enter a value greater than or equal to 0.");
      }
    },
    evaluate(attributeValue: number, conditionValue: ConditionValue) {
      if (typeof conditionValue !== "number") {
        return false;
      }

      return attributeValue >= conditionValue;
    },
  },

  // Between (inclusive)
  between: {
    name: "between",
    label: "between",
    validate(value: ConditionValue) {
      if (typeof value !== "object" || value === null) {
        throw new Error("Please enter a valid value.");
      }

      const min = value.min;
      const max = value.max;

      if (min == null || min === undefined || isNaN(min) || min <= 0) {
        throw new Error("Please enter a minimum value greater than 0.");
      }

      if (max == null || max === undefined || isNaN(max) || max <= 0) {
        throw new Error("Please enter a maximum value (limit) greater than 0.");
      }

      if (max <= min) {
        throw new Error("Maximum value must be greater than minimum value.");
      }
    },
    evaluate(attributeValue: number, conditionValue: ConditionValue) {
      if (typeof conditionValue !== "object" || conditionValue === null) {
        return false;
      }

      const { min, max } = conditionValue;

      if (min == null || max == null) {
        return false;
      }

      return attributeValue >= min && attributeValue <= max;
    },
  },
} satisfies Record<string, WorkflowOperator>;

export const WORKFLOW_OPERATOR_KEYS = Object.keys(
  WORKFLOW_OPERATORS,
) as readonly (keyof typeof WORKFLOW_OPERATORS)[];
