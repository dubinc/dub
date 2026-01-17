import { PROGRAM_ONBOARDING_PARTNERS_LIMIT } from "@/lib/constants/program";
import { PartnerLinkStructure, RewardStructure } from "@dub/prisma/client";
import * as z from "zod/v4";
import { maxDurationSchema } from "./misc";
import { updateProgramSchema } from "./programs";
import {
  FLAT_REWARD_AMOUNT_SCHEMA,
  PERCENTAGE_REWARD_AMOUNT_SCHEMA,
} from "./rewards";
import { parseUrlSchema } from "./utils";

// Getting started
export const programInfoSchema = z.object({
  name: z.string().max(100),
  logo: z.string(),
  domain: z.string(),
  url: parseUrlSchema.nullable(),
  linkStructure: z.enum(PartnerLinkStructure).default("short"),
  linkParameter: z.string().nullish(),
});

// Configure rewards
export const programRewardSchema = z.object({
  defaultRewardType: z.enum(["lead", "sale"]).default("lead"),
  type: z.enum(RewardStructure).nullish(),
  amountInCents: FLAT_REWARD_AMOUNT_SCHEMA.nullish(),
  amountInPercentage: PERCENTAGE_REWARD_AMOUNT_SCHEMA.nullish(),
  maxDuration: maxDurationSchema,
});

// Invite partners
export const programInvitePartnersSchema = z.object({
  partners: z
    .array(
      z.object({
        email: z.email({ error: "Please enter a valid email" }),
      }),
    )
    .max(
      PROGRAM_ONBOARDING_PARTNERS_LIMIT,
      `You can only invite up to ${PROGRAM_ONBOARDING_PARTNERS_LIMIT} partners.`,
    )
    .nullish()
    .transform(
      (partners) => partners?.filter((partner) => partner.email.trim()) || null,
    ),
});

// Help and support
export const programSupportSchema = updateProgramSchema.pick({
  supportEmail: true,
  helpUrl: true,
  termsUrl: true,
});

export const onboardingStepSchema = z.enum([
  "get-started",
  "configure-reward",
  "invite-partners",
  "help-and-support",
  "create-program",
]);

export const programDataSchema = programInfoSchema.extend({
  ...programRewardSchema.shape,
  ...programInvitePartnersSchema.shape,
  ...programSupportSchema.shape,
  lastCompletedStep: onboardingStepSchema.nullish(), // The last step that was completed
  currentStep: onboardingStepSchema.nullish(), // The current step when saving and exiting
});

export const onboardProgramSchema = z.discriminatedUnion("step", [
  programInfoSchema.extend({
    step: z.literal("get-started"),
    workspaceId: z.string(),
  }),

  programRewardSchema.extend({
    step: z.literal("configure-reward"),
    workspaceId: z.string(),
  }),

  programInvitePartnersSchema.extend({
    step: z.literal("invite-partners"),
    workspaceId: z.string(),
  }),

  programSupportSchema.extend({
    step: z.literal("help-and-support"),
    workspaceId: z.string(),
  }),

  z.object({
    step: z.literal("create-program"),
    workspaceId: z.string(),
  }),

  programDataSchema.partial().extend({
    step: z.literal("save-and-exit"),
    workspaceId: z.string(),
  }),
]);

export const PROGRAM_ONBOARDING_STEPS = [
  {
    stepNumber: 1,
    label: "Getting started",
    href: "/program/new",
    step: "get-started",
  },
  {
    stepNumber: 2,
    label: "Configure rewards",
    href: "/program/new/rewards",
    step: "configure-reward",
  },
  {
    stepNumber: 3,
    label: "Invite partners",
    href: "/program/new/partners",
    step: "invite-partners",
  },
  {
    stepNumber: 4,
    label: "Help and Support",
    href: "/program/new/support",
    step: "help-and-support",
  },
  {
    stepNumber: 5,
    label: "Overview",
    href: "/program/new/overview",
    step: "create-program",
  },
] as const;
