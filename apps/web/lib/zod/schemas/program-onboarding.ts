import { ToltProgramSchema } from "@/lib/tolt/schemas";
import { LinkStructure, RewardStructure } from "@dub/prisma/client";
import { z } from "zod";
import { maxDurationSchema } from "./misc";
import { updateProgramSchema } from "./programs";
import { parseUrlSchema } from "./utils";

// Getting started
export const programInfoSchema = z.object({
  name: z.string().max(100),
  logo: z.string(),
  domain: z.string(),
  url: parseUrlSchema.nullable(),
  linkStructure: z.nativeEnum(LinkStructure).default("short"),
  linkParameter: z.string().nullish(),
});

// Configure rewards
export const programRewardSchema = z
  .object({
    programType: z.enum(["new", "import"]),
    rewardful: z
      .object({
        maskedToken: z.string().nullish(),
        id: z.string(),
        affiliates: z.number(),
        commission_amount_cents: z.number().nullable(),
        max_commission_period_months: z.number().nullable(),
        reward_type: z.enum(["amount", "percent"]),
        commission_percent: z.number().nullable(),
      })
      .nullish(),
    tolt: ToltProgramSchema.extend({
      maskedToken: z.string(),
      affiliates: z.number(),
    }).nullish(),
  })
  .merge(
    z.object({
      defaultRewardType: z.enum(["lead", "sale"]).default("lead"),
      type: z.nativeEnum(RewardStructure).nullish(),
      amount: z.number().min(0).nullish(),
      maxDuration: maxDurationSchema,
    }),
  );

// Invite partners
export const programInvitePartnersSchema = z.object({
  partners: z
    .array(
      z.object({
        email: z.string().email("Please enter a valid email"),
      }),
    )
    .max(10, "You can only invite up to 10 partners.")
    .nullable()
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
  "connect",
  "create-program",
]);

export const programDataSchema = programInfoSchema
  .merge(programRewardSchema)
  .merge(programInvitePartnersSchema)
  .merge(programSupportSchema)
  .merge(
    z.object({
      lastCompletedStep: onboardingStepSchema.nullish(), // The last step that was completed
      currentStep: onboardingStepSchema.nullish(), // The current step when saving and exiting
    }),
  );

export const onboardProgramSchema = z.discriminatedUnion("step", [
  programInfoSchema.merge(
    z.object({
      step: z.literal("get-started"),
      workspaceId: z.string(),
    }),
  ),

  programRewardSchema.merge(
    z.object({
      step: z.literal("configure-reward"),
      workspaceId: z.string(),
    }),
  ),

  programInvitePartnersSchema.merge(
    z.object({
      step: z.literal("invite-partners"),
      workspaceId: z.string(),
    }),
  ),

  programSupportSchema.merge(
    z.object({
      step: z.literal("help-and-support"),
      workspaceId: z.string(),
    }),
  ),

  z.object({
    step: z.literal("connect"),
    workspaceId: z.string(),
  }),

  z.object({
    step: z.literal("create-program"),
    workspaceId: z.string(),
  }),

  programDataSchema.partial().merge(
    z.object({
      step: z.literal("save-and-exit"),
      workspaceId: z.string(),
    }),
  ),
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
    label: "Connect Dub",
    href: "/program/new/connect",
    step: "connect",
  },
  {
    stepNumber: 6,
    label: "Overview",
    href: "/program/new/overview",
    step: "create-program",
  },
] as const;
