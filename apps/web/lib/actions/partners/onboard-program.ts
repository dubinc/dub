"use server";

import { createId } from "@/lib/api/utils";
import {
  onboardProgramSchema,
  programDataSchema,
} from "@/lib/zod/schemas/program-onboarding";
import { prisma } from "@dub/prisma";
import { Project } from "@prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

export const onboardProgramAction = authActionClient
  .schema(onboardProgramSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const { workspace } = ctx;

    await handleOnboardingProgress({
      data,
      workspace,
    });

    if (data.step === "create-program") {
      return await createProgram({
        workspace,
      });
    }
  });

const handleOnboardingProgress = async ({
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

const createProgram = async ({
  workspace,
}: {
  workspace: Pick<Project, "id" | "store">;
}) => {
  const store = workspace.store as Record<string, any>;

  const program = programDataSchema.parse(store?.programOnboarding);

  console.log("createProgram", program);
};

// const { name, cookieLength, domain } = parsedInput;

// if (domain) {
//   await prisma.domain.findUniqueOrThrow({
//     where: {
//       slug: domain,
//       projectId: workspace.id,
//     },
//   });
// }

// await prisma.program.create({
//   data: {
//     workspaceId: workspace.id,
//     name,
//     slug: slugify(name),
//     cookieLength,
//     domain,
//   },
// });
