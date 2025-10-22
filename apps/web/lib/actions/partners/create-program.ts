import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getPartnerInviteRewardsAndBounties } from "@/lib/api/partners/get-partner-invite-rewards-and-bounties";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { isStored, storage } from "@/lib/storage";
import { PlanProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programDataSchema } from "@/lib/zod/schemas/program-onboarding";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { sendEmail } from "@dub/email";
import ProgramInvite from "@dub/email/templates/program-invite";
import ProgramWelcome from "@dub/email/templates/program-welcome";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { Program, Project, User } from "@prisma/client";
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
    supportEmail,
    helpUrl,
    termsUrl,
    logo: uploadedLogo,
  } = programDataSchema.parse(store.programOnboarding);

  await getDomainOrThrow({ workspace, domain });

  const programId = createId({ prefix: "prog_" });

  const logoUrl = uploadedLogo
    ? await storage
        .upload(`programs/${programId}/logo_${nanoid(7)}`, uploadedLogo)
        .then(({ url }) => url)
    : null;

  // create a new program
  const program = await prisma.$transaction(async (tx) => {
    const folderId = createId({ prefix: "fold_" });
    const defaultGroupId = createId({ prefix: "grp_" });

    const programFolder = await tx.folder.upsert({
      where: {
        name_projectId: {
          name: "Partner Links",
          projectId: workspace.id,
        },
      },
      update: {},
      create: {
        id: folderId,
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

    const programData = await tx.program.create({
      data: {
        id: programId,
        workspaceId: workspace.id,
        name,
        slug: workspace.slug,
        ...(logoUrl && { logo: logoUrl }),
        domain,
        url,
        defaultFolderId: programFolder.id,
        defaultGroupId,
        supportEmail,
        helpUrl,
        termsUrl,
        messagingEnabledAt: getPlanCapabilities(workspace.plan)
          .canMessagePartners
          ? new Date()
          : null,
        ...(type &&
          amount && {
            rewards: {
              create: {
                id: createId({ prefix: "rw_" }),
                type,
                amount,
                maxDuration,
                event: defaultRewardType,
              },
            },
          }),
      },
      include: {
        rewards: true,
      },
    });

    const createdReward = programData.rewards?.[0];

    await tx.partnerGroup.upsert({
      where: {
        programId_slug: {
          programId,
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
      create: {
        id: defaultGroupId,
        programId,
        slug: DEFAULT_PARTNER_GROUP.slug,
        name: DEFAULT_PARTNER_GROUP.name,
        color: DEFAULT_PARTNER_GROUP.color,
        ...(createdReward && {
          [REWARD_EVENT_COLUMN_MAPPING[createdReward.event]]: createdReward.id,
        }),
        partnerGroupDefaultLinks: {
          create: {
            id: createId({ prefix: "pgdl_" }),
            programId,
            domain: programData.domain!,
            url: programData.url!,
          },
        },
      },
      update: {}, // noop
    });

    // folder might be upserted, so we need to check if it was created
    const didCreateFolder = programFolder.id === folderId;

    await tx.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        defaultProgramId: programData.id,
        ...(didCreateFolder && {
          foldersUsage: {
            increment: 1,
          },
        }),
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

  waitUntil(
    Promise.allSettled([
      // invite partners
      ...(partners && partners.length > 0
        ? partners.map((partner) =>
            invitePartner({
              workspace,
              program,
              partner,
              userId: user.id,
            }),
          )
        : []),

      // delete the temporary uploaded logo
      uploadedLogo &&
        isStored(uploadedLogo) &&
        storage.delete(uploadedLogo.replace(`${R2_URL}/`, "")),

      // send email about the new program
      sendEmail({
        subject: `Your program ${program.name} is created and ready to share with your partners.`,
        to: user.email!,
        react: ProgramWelcome({
          email: user.email!,
          workspace,
          program,
        }),
      }),

      // delete the workspace product cache
      redis.del(`workspace:product:${workspace.slug}`),

      // record the audit log
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
  workspace,
  partner,
  userId,
}: {
  program: Program;
  workspace: Pick<Project, "id" | "plan" | "webhookEnabled">;
  partner: {
    email: string;
  };
  userId: string;
}) {
  await createAndEnrollPartner({
    workspace: {
      id: workspace.id,
      plan: workspace.plan as PlanProps,
      webhookEnabled: false,
    },
    program,
    partner: {
      name: partner.email.split("@")[0],
      email: partner.email,
    },
    userId,
    skipEnrollmentCheck: true,
    status: "invited",
  });

  waitUntil(
    (async () => {
      await sendEmail({
        subject: `${program.name} invited you to join Dub Partners`,
        variant: "notifications",
        to: partner.email,
        replyTo: program.supportEmail || "noreply",
        react: ProgramInvite({
          email: partner.email,
          name: null,
          program: {
            name: program.name,
            slug: program.slug,
            logo: program.logo,
          },
          ...(await getPartnerInviteRewardsAndBounties({
            programId: program.id,
            groupId: program.defaultGroupId,
          })),
        }),
      });
    })(),
  );
}
