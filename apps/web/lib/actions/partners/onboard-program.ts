"use server";

import { createId } from "@/lib/api/create-id";
import { createLink, processLink } from "@/lib/api/links";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { PlanProps } from "@/lib/types";
import {
  onboardProgramSchema,
  programDataSchema,
} from "@/lib/zod/schemas/program-onboarding";
import { sendEmail } from "@dub/email";
import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { Program, Project, Reward, User } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import { waitUntil } from "@vercel/functions";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "../safe-action";

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

// Create a new program from the onboarding data
const createProgram = async ({
  workspace,
  user,
}: {
  workspace: Pick<Project, "id" | "store" | "plan">;
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
      ...(logo && { logo }),
    },
  });

  // import the rewardful campaign if it exists
  if (rewardful && rewardful.id) {
    const credentials = await rewardfulImporter.getCredentials(workspace.id);

    await rewardfulImporter.setCredentials(workspace.id, {
      ...credentials,
      campaignId: rewardful.id,
    });

    await rewardfulImporter.queue({
      programId: program.id,
      action: "import-campaign",
    });
  }

  // invite the partners
  if (partners && partners.length > 0) {
    await Promise.all(
      partners.map((partner) =>
        invitePartner({
          workspace,
          program,
          partner,
          userId: user.id,
        }),
      ),
    );
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

// Invite a partner to the program
async function invitePartner({
  workspace,
  program,
  partner,
  userId,
}: {
  workspace: Pick<Project, "id" | "plan">;
  program: Pick<Program, "id" | "name" | "logo" | "url" | "domain">;
  partner: {
    email: string;
    key: string;
  };
  userId: string;
}) {
  const { link: partnerLink, error } = await processLink({
    payload: {
      url: program.url!,
      domain: program.domain!,
      key: partner.key,
      programId: program.id,
      trackConversion: true,
    },
    workspace: {
      id: workspace.id,
      plan: workspace.plan as PlanProps,
    },
    userId,
  });

  if (error != null) {
    console.log("Error creating partner link", error);
    return;
  }

  const link = await createLink(partnerLink);

  await Promise.all([
    prisma.programInvite.create({
      data: {
        id: createId({ prefix: "pgi_" }),
        email: partner.email,
        linkId: link.id,
        programId: program.id,
      },
    }),

    sendEmail({
      subject: `${program.name} invited you to join Dub Partners`,
      email: partner.email,
      react: PartnerInvite({
        email: partner.email,
        appName: `${process.env.NEXT_PUBLIC_APP_NAME}`,
        program: {
          name: program.name,
          logo: program.logo,
        },
      }),
    }),
  ]);
}
