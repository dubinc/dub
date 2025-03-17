"use server";

import { createId } from "@/lib/api/create-id";
import { onboardProgramSchema } from "@/lib/zod/schemas/program-onboarding";
import { prisma } from "@dub/prisma";
import { Project } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "../safe-action";
import { createProgram } from "./create-program";

export const onboardProgramAction = authActionClient
  .schema(onboardProgramSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const { workspace, user } = ctx;

    const programsCount = await prisma.program.count({
      where: {
        workspaceId: workspace.id,
      },
    });

    if (programsCount > 0 || !workspace.partnersEnabled) {
      throw new Error("You are not allowed to create a new program.");
    }

    if (data.step === "create-program") {
      const program = await createProgram({
        workspace,
        user,
      });

      redirect(
        `/${workspace.slug}/programs/${program.id}?onboarded-program=true`,
      );
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
    redirect(`/${workspace.slug}`);
  }
};
