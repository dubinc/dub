"use server";

import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { createId } from "@/lib/api/utils";
import {
  connectDubSchema,
  createProgramSchema,
  fillBasicInfoSchema,
  invitePartnersSchema,
  onboardProgramSchema,
} from "@/lib/zod/schemas/program-onboarding";
import { prisma } from "@dub/prisma";
import { Project } from "@prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

export const onboardProgramAction = authActionClient
  .schema(onboardProgramSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const { workspace } = ctx;

    switch (data.step) {
      case "fill-basic-info":
        await fillBasicInfo({
          data,
          workspace,
        });
        break;
      case "configure-reward":
        await storeOnboardingProgress({
          data,
          workspace,
        });
        break;
      case "invite-partners":
        await invitePartners(data);
        break;
      case "connect-dub":
        await connectDub(data);
        break;
      case "create-program":
        await createProgram(data);
        break;
    }
  });

async function fillBasicInfo({
  data,
  workspace,
}: {
  data: z.infer<typeof fillBasicInfoSchema>;
  workspace: Project;
}) {
  const { domain } = data;

  if (!domain) {
    return;
  }

  await getDomainOrThrow({
    workspace,
    domain,
  });

  await storeOnboardingProgress({
    workspace,
    data,
  });
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
          ...store.programOnboarding,
          ...data,
          programId,
        },
      },
    },
  });
};

// TODO:
// Form validation based on each step
// Create a program ID after submitting the first step
// Store the data on the workspace store
// Remove the data from the workspace store after finishing the onboarding
// Send the owner a new email after the program creation
// Remove workspaceId from the programOnboarding object
