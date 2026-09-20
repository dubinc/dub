"use server";

import {
  INTERVAL_DISPLAYS,
  TRIGGER_TYPES,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { CONTINENTS, COUNTRIES } from "@dub/utils";
import { experimental_evaluate as evaluate } from "ai";
import {
  phraseChoiceQuestions,
  pickChoice,
  questionsFromZodSchema,
  withNone,
} from "./evaluate-helpers";

/** Closed-set values that live outside the Zod enum (ISO maps, trigger types, interval labels). */
const CHOICE_CRITERIA: Record<string, Record<string, string>> = {
  country: COUNTRIES,
  continent: CONTINENTS,
  trigger: Object.fromEntries(TRIGGER_TYPES.map((value) => [value, value])),
  interval: Object.fromEntries(
    INTERVAL_DISPLAYS.map(({ value, display }) => [value, display]),
  ),
};

const { closed: CLOSED_QUESTIONS, open: OPEN_FIELDS } = questionsFromZodSchema(
  analyticsQuerySchema,
  {
    keys: VALID_ANALYTICS_FILTERS,
    skipKeys: ["start", "end"],
    extraCriteria: CHOICE_CRITERIA,
  },
);

const OPEN_CRITERIA = withNone(
  OPEN_FIELDS,
  "Not a filter value, or already covered by another question.",
);

function extractPhrases(prompt: string) {
  const tokens = prompt.match(
    /https?:\/\/[^\s,]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi,
  );
  const clauses = prompt
    .split(/,|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return [...new Set([...(tokens ?? []), ...clauses])].slice(0, 5);
}

function setFilter(
  filters: Record<string, string>,
  key: string,
  value: string | undefined,
) {
  if (!value || !VALID_ANALYTICS_FILTERS.includes(key)) {
    return;
  }

  filters[key] = filters[key] ? `${filters[key]},${value}` : value;
}

export async function generateFilters(prompt: string) {
  const request = prompt.trim();
  if (!request) {
    return {};
  }

  const phrases = extractPhrases(request);

  try {
    const result = await evaluate({
      model: "typesafe-ai/jev",
      state: {
        request,
        today: new Date().toISOString().slice(0, 10),
      },
      questions: {
        ...CLOSED_QUESTIONS,
        ...phraseChoiceQuestions({
          phrases,
          criteria: OPEN_CRITERIA,
          instructions: (phrase) =>
            `If "${phrase.replaceAll('"', "'")}" is an analytics filter value, which filter is it for?`,
        }),
      },
      providerOptions: {
        gateway: {
          zeroDataRetention: true,
        },
      },
    });

    const filters: Record<string, string> = {};

    for (const key of Object.keys(CLOSED_QUESTIONS)) {
      setFilter(filters, key, pickChoice(result.answers[key]));
    }

    phrases.forEach((phrase, index) => {
      const key = pickChoice(result.answers[`open${index}`]);
      if (key && filters[key] == null) {
        setFilter(filters, key, phrase);
      }
    });

    return filters;
  } catch (error) {
    console.error("[generateFilters] failed", error);
    return {};
  }
}
