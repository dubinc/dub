import { CommissionType } from "@prisma/client";
import { z } from "zod";
import { RECURRING_MAX_DURATIONS } from "./rewards";

// Getting started
export const programInfoSchema = z.object({
  name: z.string().max(100),
  logo: z.string().nullish(),
  domain: z.string().nullish(),
  url: z.string().url("Enter a valid URL").max(255).nullish(),
  linkType: z.enum(["short", "query", "dynamic"]).default("short"),
});

// Configure reward
export const programRewardSchema = z
  .object({
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

// Invite partners
export const programInvitePartnersSchema = z.object({
  partners: z
    .array(
      z.object({
        email: z.string().email("Please enter a valid email"),
        key: z.string().min(1, "Please enter a referral key"),
      }),
    )
    .nullable(),
});

export const onboardProgramSchema = z.discriminatedUnion("step", [
  programInfoSchema.merge(
    z.object({
      step: z.literal("fill-basic-info"),
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
    step: z.literal("create-program"),
    workspaceId: z.string(),
  }),
]);

export const programDataSchema = programInfoSchema
  .merge(programRewardSchema)
  .merge(programInvitePartnersSchema);

export type ProgramData = z.infer<typeof programDataSchema>;
