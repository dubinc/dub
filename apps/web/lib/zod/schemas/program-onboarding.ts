import { z } from "zod";

// const PROGRAM_ONBOARDING_STEPS = [
//   "fill-basic-info",
//   "configure-reward",
//   "invite-partners",
//   "connect-dub",
//   "create-program",
// ] as const;

export const fillBasicInfoSchema = z.object({
  step: z.literal("fill-basic-info"),
  name: z.string().max(100),
  logo: z.string().nullish(),
  domain: z.string().nullish(),
  url: z.string().url("Enter a valid URL").max(255).nullish(),
  linkType: z.enum(["short", "query", "dynamic"]).default("short"),
  workspaceId: z.string(),
});

export const configureRewardSchema = z.object({
  step: z.literal("configure-reward"),
});

export const invitePartnersSchema = z.object({
  step: z.literal("invite-partners"),
});

export const connectDubSchema = z.object({
  step: z.literal("connect-dub"),
});

export const createProgramSchema = z.object({
  step: z.literal("create-program"),
});

export const onboardProgramSchema = z.discriminatedUnion("step", [
  fillBasicInfoSchema,
  configureRewardSchema,
  invitePartnersSchema,
  connectDubSchema,
  createProgramSchema,
]);

export type ProgramBasicInfo = z.infer<typeof fillBasicInfoSchema>;
export type ProgramReward = z.infer<typeof configureRewardSchema>;
export type ProgramPartners = z.infer<typeof invitePartnersSchema>;
export type ProgramConnectDub = z.infer<typeof connectDubSchema>;
export type ProgramCreateProgram = z.infer<typeof createProgramSchema>;
