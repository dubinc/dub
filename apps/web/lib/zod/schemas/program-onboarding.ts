import { CommissionType } from "@prisma/client";
import { z } from "zod";
import { RECURRING_MAX_DURATIONS } from "./misc";
import { parseUrlSchema } from "./utils";

// Getting started
export const programInfoSchema = z.object({
  name: z.string().max(100),
  logo: z.string(),
  domain: z.string(),
  url: parseUrlSchema.nullable(),
  linkType: z.enum(["short", "query", "dynamic"]).default("short"),
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
  })
  .merge(
    z.object({
      type: z.nativeEnum(CommissionType).nullish(),
      amount: z.number().min(0).nullish(),
      maxDuration: z.coerce
        .number()
        .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
          message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
        })
        .nullish(),
    }),
  );

// Invite partners
export const programInvitePartnersSchema = z.object({
  partners: z
    .array(
      z.object({
        email: z.string().email("Please enter a valid email"),
        key: z.string().min(1, "Please enter a referral key"),
      }),
    )
    .max(10, "You can only invite up to 10 partners.")
    .nullable()
    .transform(
      (partners) =>
        partners?.filter(
          (partner) => partner.email.trim() && partner.key.trim(),
        ) || null,
    ),
});

export const onboardingStepSchema = z.enum([
  "get-started",
  "configure-reward",
  "invite-partners",
  "connect",
  "create-program",
]);

export const programDataSchema = programInfoSchema
  .merge(programRewardSchema)
  .merge(programInvitePartnersSchema)
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
    href: "/programs/new",
    step: "get-started",
  },
  {
    stepNumber: 2,
    label: "Configure rewards",
    href: "/programs/new/rewards",
    step: "configure-reward",
  },
  {
    stepNumber: 3,
    label: "Invite partners",
    href: "/programs/new/partners",
    step: "invite-partners",
  },
  {
    stepNumber: 4,
    label: "Connect Dub",
    href: "/programs/new/connect",
    step: "connect",
  },
  {
    stepNumber: 5,
    label: "Overview",
    href: "/programs/new/overview",
    step: "create-program",
  },
] as const;
