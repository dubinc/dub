"use server";

import { createId } from "@/lib/api/create-id";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { onboardProgramSchema } from "@/lib/zod/schemas/program-onboarding";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { isLegacyBusinessPlan } from "@dub/utils";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "../safe-action";
import { createProgram } from "./create-program";

export const onboardProgramAction = authActionClient
  .schema(onboardProgramSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const { workspace, user } = ctx;

    if (workspace.defaultProgramId) {
      throw new Error(
        "You've already created a program for your workspace. Please use the existing program instead.",
      );
    }

    if (
      !getPlanCapabilities(workspace.plan).canManageProgram ||
      isLegacyBusinessPlan(workspace)
    ) {
      throw new Error(
        "Your current plan does not support creating a program. Please upgrade to a higher plan to proceed.",
      );
    }

    if (data.step === "create-program") {
      await createProgram({
        workspace,
        user,
      });
      return;
    }

    await saveOnboardingProgress({
      data,
      workspace,
    });
  });

// Save the onboarding progress
const saveOnboardingProgress = async ({
  workspace,
  data,
}: {
  workspace: Pick<Project, "id" | "store" | "slug">;
  data: z.infer<typeof onboardProgramSchema>;
}) => {
  const store =
    (workspace.store as Record<string, any> | undefined | null) ?? {};

  const programId =
    store?.programOnboarding?.programId ?? createId({ prefix: "prog_" });

  const lastCompletedStep =
    data.step !== "save-and-exit"
      ? data.step
      : store.programOnboarding?.lastCompletedStep;

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
          lastCompletedStep,
          step: undefined,
        },
      },
    },
  });

  if (data.step == "save-and-exit") {
    redirect(`/${workspace.slug}/program`);
  }
};
