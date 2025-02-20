"use server";

import { createId } from "@/lib/api/utils";
import { prisma } from "@dub/prisma";
import { Project } from "@prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const PROGRAM_ONBOARDING_STEPS = [
  "fill-basic-info",
  "configure-reward",
  "invite-partners",
  "connect-dub",
  "create-program",
] as const;

const fillBasicInfoSchema = z.object({
  step: z.literal("fill-basic-info"),
  name: z.string().max(100),
  logo: z.string().nullish(),
  domain: z.string().nullish(),
  url: z.string().url("Enter a valid URL").max(255).nullish(),
  linkType: z.enum(["short", "query", "dynamic"]).default("short"),
  workspaceId: z.string(),
});

const configureRewardSchema = z.object({
  step: z.literal("configure-reward"),
});

const invitePartnersSchema = z.object({
  step: z.literal("invite-partners"),
});

const connectDubSchema = z.object({
  step: z.literal("connect-dub"),
});

const createProgramSchema = z.object({
  step: z.literal("create-program"),
});

const onboardProgramSchema = z.discriminatedUnion("step", [
  fillBasicInfoSchema,
  configureRewardSchema,
  invitePartnersSchema,
  connectDubSchema,
  createProgramSchema,
]);

export const onboardProgramAction = authActionClient
  .schema(onboardProgramSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const data = parsedInput;

    console.log("onboardProgramAction", data);

    switch (data.step) {
      case "fill-basic-info":
        return fillBasicInfo(data, workspace);
      case "configure-reward":
        return configureReward(data);
      case "invite-partners":
        return invitePartners(data);
      case "connect-dub":
        return connectDub(data);
      case "create-program":
        return createProgram(data);
    }
  });

async function fillBasicInfo(
  data: z.infer<typeof fillBasicInfoSchema>,
  workspace: Project,
) {
  const store =
    (workspace.store as Record<string, any> | undefined | null) ?? {};

  // Check programId exists within the programOnboarding object
  // If it does, update the object with the new data
  // If it doesn't, create a new programOnboarding object

  await storeOnboardingProgress({
    workspace,
    data,
  });
}

async function configureReward(data: z.infer<typeof configureRewardSchema>) {
  //
}

async function invitePartners(data: z.infer<typeof invitePartnersSchema>) {
  //
}

async function connectDub(data: z.infer<typeof connectDubSchema>) {
  //
}

async function createProgram(data: z.infer<typeof createProgramSchema>) {
  //
}

// TODO:
// Form validation based on each step
// Create a program ID after submitting the first step
// Store the data on the workspace store
// Remove the data from the workspace store after finishing the onboarding
// Send the owner a new email after the program creation

const storeOnboardingProgress = async ({
  workspace,
  data,
}: {
  workspace: Pick<Project, "id" | "store">;
  data: z.infer<typeof onboardProgramSchema>;
}) => {
  const store =
    (workspace.store as Record<string, any> | undefined | null) ?? {};

  const programId =
    store?.programOnboarding?.programId ?? createId({ prefix: "prog_" });

  await prisma.project.update({
    where: {
      id: workspace.id,
    },
    data: {
      store: {
        ...store,
        programOnboarding: {
          ...data,
          programId,
        },
      },
    },
  });
};

// TODO:
// Remove workspaceId from the programOnboarding object