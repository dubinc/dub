"use server";

import { createId } from "@/lib/api/utils";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { storage } from "@/lib/storage";
import {
  onboardProgramSchema,
  programDataSchema,
} from "@/lib/zod/schemas/program-onboarding";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Project, Reward, User } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

export const onboardProgramAction = authActionClient
  .schema(onboardProgramSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const { workspace, user } = ctx;

    await handleOnboardingProgress({
      data,
      workspace,
    });

    if (data.step === "create-program") {
      return await createProgram({
        workspace,
        user,
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
  user,
}: {
  workspace: Pick<Project, "id" | "store">;
  user: Pick<User, "id">;
}) => {
  const store = workspace.store as Record<string, any>;
  const {
    name,
    domain,
    url,
    type,
    amount,
    maxDuration,
    partners,
    rewardful,
    linkType,
    logo,
  } = programDataSchema.parse(store?.programOnboarding);

  await prisma.domain.findUniqueOrThrow({
    where: {
      slug: domain!,
      projectId: workspace.id,
    },
  });

  // create a new program
  const program = await prisma.program.create({
    data: {
      id: createId({ prefix: "prog_" }),
      workspaceId: workspace.id,
      name,
      slug: slugify(name),
      domain,
      url,
    },
  });

  const logoUrl = logo
    ? await storage
        .upload(`programs/${program.id}/logo_${nanoid(7)}`, logo)
        .then(({ url }) => url)
    : null;

  let reward: Reward | null = null;

  // create a new reward
  if (type && amount && maxDuration) {
    reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId: program.id,
        type,
        amount,
        maxDuration,
        event: "sale",
      },
    });
  }

  await prisma.program.update({
    where: {
      id: program.id,
    },
    data: {
      ...(reward && { defaultRewardId: reward.id }),
      ...(logoUrl && { logo: logoUrl }),
    },
  });

  // import the rewardful campaign if it exists
  if (rewardful) {
    await rewardfulImporter.setCredentials(program.id, {
      token: rewardful.apiToken,
      campaignId: rewardful.campaign.id,
      userId: user.id,
    });

    await rewardfulImporter.queue({
      programId: program.id,
      action: "import-campaign",
    });
  }

  // invite the partners
  if (partners && partners.length > 0) {
    //
  }

  waitUntil(
    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        store: {
          ...store,
          programOnboarding: undefined,
        },
      },
    }),
  );

  return program;
};
