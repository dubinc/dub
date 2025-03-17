"use server";

import { createId } from "@/lib/api/create-id";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { createLink, processLink } from "@/lib/api/links";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { storage } from "@/lib/storage";
import { PlanProps } from "@/lib/types";
import {
  onboardProgramSchema,
  programDataSchema,
} from "@/lib/zod/schemas/program-onboarding";
import { sendEmail } from "@dub/email";
import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Program, Project, User } from "@prisma/client";
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
  workspace: Pick<Project, "id" | "store" | "plan" | "webhookEnabled">;
  user: Pick<User, "id">;
}) => {
  const store = workspace.store as Record<string, any>;
  if (!store.programOnboarding) {
    throw new Error("Program onboarding data not found");
  }

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
  } = programDataSchema.parse(store.programOnboarding);

  await getDomainOrThrow({ workspace, domain });

  const programFolder = await prisma.folder.create({
    data: {
      id: createId({ prefix: "fold_" }),
      name: "Partner Links",
      projectId: workspace.id,
      accessLevel: "write",
      users: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
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
      defaultFolderId: programFolder.id,
      ...(type &&
        amount &&
        maxDuration && {
          rewards: {
            create: {
              id: createId({ prefix: "rw_" }),
              type,
              amount,
              maxDuration,
              event: "sale",
            },
          },
        }),
    },
    include: {
      rewards: true,
    },
  });

  const logoUrl = logo
    ? await storage
        .upload(`programs/${program.id}/logo_${nanoid(7)}`, logo)
        .then(({ url }) => url)
    : null;

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
    Promise.all([
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
      prisma.program.update({
        where: {
          id: program.id,
        },
        data: {
          ...(logoUrl && { logo: logoUrl }),
          ...(program.rewards && { defaultRewardId: program.rewards[0].id }),
        },
      }),
    ]),
  );

  return program;
};

// Invite a partner to the program
async function invitePartner({
  program,
  workspace,
  partner,
  userId,
}: {
  program: Program;
  workspace: Pick<Project, "id" | "plan" | "webhookEnabled">;
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

  await createAndEnrollPartner({
    program,
    link,
    workspace,
    partner: {
      name: partner.email.split("@")[0],
      email: partner.email,
    },
    skipEnrollmentCheck: true,
    status: "invited",
  });

  waitUntil(
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
  );
}
