import { CommissionType } from "@prisma/client";
import { z } from "zod";
import { RECURRING_MAX_DURATIONS } from "./rewards";

// const PROGRAM_ONBOARDING_STEPS = [
//   "fill-basic-info",
//   "configure-reward",
//   "invite-partners",
//   "connect-dub",
//   "create-program",
// ] as const;

export const fillBasicInfoSchema = z.object({
  step: z.literal("fill-basic-info"),
  workspaceId: z.string(),
  name: z.string().max(100),
  logo: z.string().nullish(),
  domain: z.string().nullish(),
  url: z.string().url("Enter a valid URL").max(255).nullish(),
  linkType: z.enum(["short", "query", "dynamic"]).default("short"),
});

export const configureRewardSchema = z
  .object({
    step: z.literal("configure-reward"),
    workspaceId: z.string(),
    programType: z.enum(["new", "import"]),
    rewardful: z
      .object({
        apiToken: z.string(),
        campaign: z.object({
          id: z.string(),
          affiliates: z.number(),
          commission_amount_cents: z.number().nullable(),
          max_commission_period_months: z.number(),
          reward_type: z.enum(["amount", "percent"]),
          commission_percent: z.number().nullable(),
        }),
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

export const invitePartnersSchema = z.object({
  step: z.literal("invite-partners"),
  workspaceId: z.string(),
  partners: z
    .array(
      z.object({
        email: z.string().email("Please enter a valid email"),
        key: z.string().min(1, "Please enter a referral key"),
      }),
    )
    .nullable(),
});

export const connectDubSchema = z.object({
  step: z.literal("connect-dub"),
  workspaceId: z.string(),
});

export const createProgramSchema = z.object({
  step: z.literal("create-program"),
  workspaceId: z.string(),
});

export const onboardProgramSchema = z.discriminatedUnion("step", [
  fillBasicInfoSchema,
  configureRewardSchema,
  invitePartnersSchema,
  connectDubSchema,
  createProgramSchema,
]);

export type BasicInfo = z.infer<typeof fillBasicInfoSchema>;

export type ConfigureReward = z.infer<typeof configureRewardSchema>;

export type InvitePartners = z.infer<typeof invitePartnersSchema>;
