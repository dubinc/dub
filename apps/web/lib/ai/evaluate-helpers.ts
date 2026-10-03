import * as z from "zod/v4";

export const EVALUATE_NONE = "none";
export const EVALUATE_CHOICE_THRESHOLD = 0.5;

export type EvaluateChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities?: Record<string, number>;
};

type JsonSchemaNode = {
  type?: string | string[];
  enum?: unknown[];
  description?: string;
  deprecated?: boolean;
  properties?: Record<string, JsonSchemaNode>;
};

export function withNone(
  criteria: Record<string, string>,
  label = "Not mentioned in the request.",
) {
  return { [EVALUATE_NONE]: label, ...criteria };
}

export function pickChoice(
  answer: ChoiceAnswer | undefined,
  {
    threshold = EVALUATE_CHOICE_THRESHOLD,
    none = EVALUATE_NONE,
  }: { threshold?: number; none?: string } = {},
) {
  if (!answer || answer.type !== "choice" || answer.choice === none) {
    return undefined;
  }

  const probability = answer.probabilities?.[answer.choice];
  if (probability != null && probability < threshold) {
    return undefined;
  }

  return answer.choice;
}

function criteriaFromJsonSchema(
  node: JsonSchemaNode,
  extra?: Record<string, string>,
) {
  if (extra) {
    return extra;
  }

  if (node.enum?.length) {
    return Object.fromEntries(
      node.enum.map((value) => [String(value), String(value)]),
    );
  }

  if (node.type === "boolean") {
    return { true: "True / yes", false: "False / no" };
  }

  return undefined;
}

export function questionsFromZodSchema(
  schema: z.ZodType,
  {
    keys,
    skipKeys = [],
    extraCriteria = {},
    noneLabel,
    flatten = true,
  }: {
    keys?: string[];
    skipKeys?: string[];
    extraCriteria?: Record<string, Record<string, string>>;
    noneLabel?: string;
    flatten?: boolean;
  } = {},
) {
  const json = z.toJSONSchema(schema, {
    unrepresentable: "any",
    io: "input",
  }) as JsonSchemaNode;

  const closed: Record<string, EvaluateChoiceQuestion> = {};
  const open: Record<string, string> = {};
  const skip = new Set(skipKeys);

  const walk = (properties: Record<string, JsonSchemaNode>, prefix: string) => {
    const propertyKeys = keys && !prefix ? keys : Object.keys(properties);

    for (const key of propertyKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (skip.has(key) || skip.has(path)) {
        continue;
      }

      const node = properties[key];
      if (!node) {
        continue;
      }

      if (flatten && node.type === "object" && node.properties) {
        walk(node.properties, path);
        continue;
      }

      if (!node.description || node.deprecated) {
        continue;
      }

      const criteria = criteriaFromJsonSchema(
        node,
        extraCriteria[path] ?? extraCriteria[key],
      );

      if (criteria) {
        closed[path] = {
          type: "choice",
          instructions: node.description,
          criteria: withNone(criteria, noneLabel),
        };
      } else {
        open[path] = node.description;
      }
    }
  };

  walk(json.properties ?? {}, "");

  return { closed, open };
}

export function phraseChoiceQuestions({
  phrases,
  criteria,
  prefix = "open",
  instructions,
}: {
  phrases: string[];
  criteria: Record<string, string>;
  prefix?: string;
  instructions?: (phrase: string) => string;
}): Record<string, EvaluateChoiceQuestion> {
  const questionCriteria =
    EVALUATE_NONE in criteria
      ? criteria
      : withNone(
          criteria,
          "Not a value for any of these fields, or already covered.",
        );

  return Object.fromEntries(
    phrases.map((phrase, index) => [
      `${prefix}${index}`,
      {
        type: "choice" as const,
        instructions:
          instructions?.(phrase) ??
          `If "${phrase.replaceAll('"', "'")}" is a value for one of these fields, which field is it?`,
        criteria: questionCriteria,
      },
    ]),
  );
}
