import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { rewardfulImporter } from "@/lib/rewardful/importer";
import { isStored, storage } from "@/lib/storage";
import { toltImporter } from "@/lib/tolt/importer";
import { WorkspaceProps } from "@/lib/types";
import { programDataSchema } from "@/lib/zod/schemas/program-onboarding";
import { sendEmail } from "@dub/email";
import PartnerInvite from "@dub/email/templates/partner-invite";
import ProgramWelcome from "@dub/email/templates/program-welcome";
import { prisma } from "@dub/prisma";
import { generateRandomString, nanoid, R2_URL } from "@dub/utils";
import { Program, Project, Reward, User } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { redirect } from "next/navigation";

// Create a program from the onboarding data
export const createProgram = async ({
  workspace,
  user,
}: {
  workspace: Pick<
    Project,
    "id" | "slug" | "plan" | "store" | "webhookEnabled" | "invoicePrefix"
  >;
  user: Pick<User, "id" | "email">;
}) => {
  const store = workspace.store as Record<string, any>;
  if (!store.programOnboarding) {
    throw new Error("Program onboarding data not found");
  }

  const {
    name,
    domain,
    url,
    defaultRewardType,
    type,
    amount,
    maxDuration,
    partners,
    rewardful,
    tolt,
    linkStructure,
    supportEmail,
    helpUrl,
    termsUrl,
    logo: uploadedLogo,
  } = programDataSchema.parse(store.programOnboarding);

  await getDomainOrThrow({ workspace, domain });

  const programFolder = await prisma.folder.upsert({
    where: {
      name_projectId: {
        name: "Partner Links",
        projectId: workspace.id,
      },
    },
    update: {},
    create: {
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
  const program = await prisma.$transaction(async (tx) => {
    const programData = await tx.program.create({
      data: {
        id: createId({ prefix: "prog_" }),
        workspaceId: workspace.id,
        name,
        slug: workspace.slug,
        domain,
        url,
        defaultFolderId: programFolder.id,
        linkStructure,
        supportEmail,
        helpUrl,
        termsUrl,
        ...(type &&
          amount && {
            rewards: {
              create: {
                id: createId({ prefix: "rw_" }),
                type,
                amount,
                maxDuration,
                event: defaultRewardType,
                default: true,
              },
            },
          }),
      },
      include: {
        rewards: true,
      },
    });

    await tx.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        defaultProgramId: programData.id,
        foldersUsage: {
          increment: 1,
        },
        store: {
          ...store,
          programOnboarding: undefined,
        },
        // if the workspace doesn't have an invoice prefix, generate one
        ...(!workspace.invoicePrefix && {
          invoicePrefix: generateRandomString(8),
        }),
      },
    });

    return programData;
  });

  const logoUrl = uploadedLogo
    ? await storage
        .upload(`programs/${program.id}/logo_${nanoid(7)}`, uploadedLogo)
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

  // import the tolt program if it exists
  if (tolt && tolt.id) {
    await toltImporter.queue({
      programId: program.id,
      action: "import-affiliates",
    });
  }

  const reward = program.rewards?.[0];

  waitUntil(
    Promise.allSettled([
      // invite partners
      ...(partners && partners.length > 0
        ? partners.map((partner) =>
            invitePartner({
              workspace,
              program,
              reward,
              partner,
              userId: user.id,
            }),
          )
        : []),

      // update the program with the logo and default reward
      prisma.program.update({
        where: {
          id: program.id,
        },
        data: {
          ...(logoUrl && { logo: logoUrl }),
        },
      }),

      // delete the temporary uploaded logo
      uploadedLogo &&
        isStored(uploadedLogo) &&
        storage.delete(uploadedLogo.replace(`${R2_URL}/`, "")),

      // send email about the new program
      sendEmail({
        subject: `Your program ${program.name} is created and ready to share with your partners.`,
        email: user.email!,
        react: ProgramWelcome({
          email: user.email!,
          workspace,
          program: {
            ...program,
            logo: logoUrl,
          },
        }),
      }),

      recordAuditLog({
        workspaceId: workspace.id,
        programId: program.id,
        action: "program.created",
        description: `Program ${program.name} created`,
        actor: user,
        targets: [
          {
            type: "program",
            id: program.id,
            metadata: program,
          },
        ],
      }),
    ]),
  );

  redirect(`/${workspace.slug}/program?onboarded-program=true`);
};

// Invite a partner to the program
async function invitePartner({
  program,
  reward,
  workspace,
  partner,
  userId,
}: {
  program: Program;
  reward?: Pick<Reward, "id" | "event">;
  workspace: Pick<Project, "id" | "plan" | "webhookEnabled">;
  partner: {
    email: string;
  };
  userId: string;
}) {
  const partnerLink = await createPartnerLink({
    workspace: workspace as WorkspaceProps,
    program,
    partner: {
      name: partner.email.split("@")[0],
      email: partner.email,
    },
    userId,
  });

  await createAndEnrollPartner({
    program,
    link: partnerLink,
    workspace,
    partner: {
      name: partner.email.split("@")[0],
      email: partner.email,
    },
    skipEnrollmentCheck: true,
    status: "invited",
    ...(reward && { reward }),
  });

  waitUntil(
    sendEmail({
      subject: `${program.name} invited you to join Dub Partners`,
      email: partner.email,
      react: PartnerInvite({
        email: partner.email,
        program: {
          name: program.name,
          slug: program.slug,
          logo: program.logo,
        },
      }),
    }),
  );
}
