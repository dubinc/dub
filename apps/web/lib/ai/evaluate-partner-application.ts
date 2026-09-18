import {
  formatApplicationFormData,
  formatWebsiteAndSocialsFields,
} from "@/lib/partners/format-application-form-data";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { ProgramApplication } from "@prisma/client";
import * as z from "zod/v4";

export const JEV_MATCH_THRESHOLD = 0.85;

const MAX_TEXT_LENGTH = 500;
const JEV_EVALUATE_TIMEOUT_MS = 2_000;
const JEV_MODEL_ID = "typesafe-ai/jev";
const JEV_EVALUATE_URL = "https://ai-gateway.vercel.sh/v4/ai/evaluation-model";

export type EvaluatePartnerApplicationInput = {
  program: {
    name: string;
    description: string | null;
  };
  partner: {
    name: string;
    country: string | null;
    description: string | null;
    platforms: {
      type: string;
      identifier: string;
      subscribers: bigint | number;
      verifiedAt: Date | null;
    }[];
  };
  application: ProgramApplication | null;
  landerData: unknown;
};

/**
 * `skipped` (nothing to evaluate) and `failed` (Jev errored) both fail open –
 * only `matched` is a high-confidence yes.
 */
export type JevEvaluation = {
  status: "matched" | "unmatched" | "skipped" | "failed";
  probability?: number;
  error?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

const jevEvaluateResponseSchema = z.object({
  answers: z.record(
    z.string(),
    z.object({
      type: z.literal("boolean"),
      probability: z.number().finite(),
    }),
  ),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
    })
    .optional(),
});

export function isConfidentMatch(probability: number | null | undefined) {
  return (
    probability != null &&
    Number.isFinite(probability) &&
    probability >= JEV_MATCH_THRESHOLD
  );
}

export async function evaluatePartnerApplication(
  input: EvaluatePartnerApplicationInput,
): Promise<JevEvaluation> {
  const state = buildPartnerApplicationState(input);

  if (!state) {
    return { status: "skipped" };
  }

  return await evaluateBooleanQuestion({
    state,
    questionKey: "poorFit",
    instructions:
      "Is this application spam, empty, or clearly irrelevant to this program?",
    criteria: {
      true: "Spam, empty, or clearly irrelevant to the program",
      false: "Plausible fit, or not enough signal to reject",
    },
    tag: "jev-partner-auto-approve",
  });
}

export async function evaluateApplicationScreening({
  screeningCriteria,
  ...input
}: EvaluatePartnerApplicationInput & {
  screeningCriteria: string;
}): Promise<JevEvaluation> {
  const state = buildPartnerApplicationState(input);

  if (!state) {
    return { status: "skipped" };
  }

  return await evaluateBooleanQuestion({
    state: {
      ...state,
      screeningCriteria: truncate(screeningCriteria, 1000),
    },
    questionKey: "matchesScreeningCriteria",
    instructions:
      "Does this application match the program's rejection criteria in screeningCriteria?",
    criteria: {
      true: "The application clearly matches the program's rejection criteria",
      false:
        "The application does not match, or there is not enough signal to reject",
    },
    tag: "jev-partner-application-screening",
  });
}

// Returns null when the application has no text worth evaluating
function buildPartnerApplicationState({
  program,
  partner,
  application,
  landerData,
}: EvaluatePartnerApplicationInput) {
  const applicationAnswers = (
    application ? formatApplicationFormData(application) : []
  )
    .filter((field) => field.value.trim().length > 0)
    .map((field) => ({
      title: field.title,
      value: truncate(field.value),
    }));

  const formSocials = application
    ? formatWebsiteAndSocialsFields(application)
    : {};

  const socials = application
    ? compactRecord({
        website: formSocials.website ?? application.website,
        youtube: formSocials.youtube ?? application.youtube,
        twitter: formSocials.twitter ?? application.twitter,
        linkedin: formSocials.linkedin ?? application.linkedin,
        instagram: formSocials.instagram ?? application.instagram,
        tiktok: formSocials.tiktok ?? application.tiktok,
      })
    : {};

  const platforms = partner.platforms
    .filter((platform) => platform.identifier.trim().length > 0)
    .map((platform) => ({
      type: platform.type,
      identifier: platform.identifier,
      subscribers: Number(platform.subscribers),
      verified: Boolean(platform.verifiedAt),
    }));

  const hasEvaluableText =
    applicationAnswers.length > 0 ||
    Boolean(truncate(partner.description)) ||
    Object.keys(socials).length > 0 ||
    platforms.length > 0;

  if (!hasEvaluableText) {
    return null;
  }

  const parsedLander = programLanderSchema.safeParse(landerData);
  const lander = parsedLander.success
    ? compactRecord({
        title: truncate(parsedLander.data.title),
        description: truncate(parsedLander.data.description),
      })
    : undefined;

  return {
    program: compactRecord({
      name: program.name,
      description: truncate(program.description),
    }),
    ...(lander && Object.keys(lander).length > 0 ? { lander } : {}),
    partner: compactRecord({
      name: partner.name,
      country: partner.country ?? undefined,
      description: truncate(partner.description),
      ...socials,
      ...(platforms.length > 0 ? { platforms } : {}),
    }),
    ...(applicationAnswers.length > 0 ? { applicationAnswers } : {}),
  };
}

async function evaluateBooleanQuestion({
  state,
  questionKey,
  instructions,
  criteria,
  tag,
}: {
  state: Record<string, unknown>;
  questionKey: string;
  instructions: string;
  criteria: {
    true: string;
    false: string;
  };
  tag: string;
}): Promise<JevEvaluation> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return { status: "skipped" };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(),
    JEV_EVALUATE_TIMEOUT_MS,
  );

  try {
    const response = await fetch(JEV_EVALUATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "ai-gateway-protocol-version": "0.0.1",
        "ai-gateway-auth-method": "api-key",
        "ai-evaluation-model-specification-version": "4",
        "ai-model-id": JEV_MODEL_ID,
      },
      body: JSON.stringify({
        state,
        questions: {
          [questionKey]: {
            type: "boolean",
            instructions,
            criteria,
          },
        },
        providerOptions: {
          gateway: {
            zeroDataRetention: true,
            disallowPromptTraining: true,
            tags: [tag],
          },
        },
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Jev evaluate failed with status ${response.status}.`);
    }

    const parsed = jevEvaluateResponseSchema.safeParse(await response.json());
    const answer = parsed.success
      ? parsed.data.answers[questionKey]
      : undefined;

    if (!parsed.success || !answer) {
      throw new Error("Jev evaluate returned an invalid response.");
    }

    return {
      status: isConfidentMatch(answer.probability) ? "matched" : "unmatched",
      probability: answer.probability,
      usage: parsed.data.usage,
    };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function truncate(value: string | null | undefined, max = MAX_TEXT_LENGTH) {
  if (!value?.trim()) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function compactRecord<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value != null && value !== ""),
  ) as Partial<T>;
}
