import { z } from "zod";
import { createOrUpdateRewardSchema } from "./rewards";

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
    rewardfulApiToken: z.string().optional(),
    rewardfulCampaignId: z.string().optional(),
    rewardfulAffiliateCount: z.number().optional(),
  })
  .merge(
    createOrUpdateRewardSchema.pick({
      type: true,
      amount: true,
      maxDuration: true,
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

export type ConnectDub = z.infer<typeof connectDubSchema>;

export type CreateProgram = z.infer<typeof createProgramSchema>;
