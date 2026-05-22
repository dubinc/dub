import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import { Prisma, WorkspaceEnvironment } from "@dub/prisma/client";
import { TRIAL_LIMITS } from "@dub/utils";
import { createId } from "../api/create-id";
import { generateRandomString } from "../api/utils/generate-random-string";
import { createWorkspaceId } from "../api/workspaces/create-workspace-id";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";

export async function createStagingWorkspace(workspaceId: string) {
  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    include: {
      users: {
        select: {
          role: true,
          userId: true,
        },
      },
    },
  });

  if (!workspace) {
    console.error(
      "Failed to find workspace in createStagingWorkspace.",
      workspaceId,
    );
    return;
  }

  if (workspace.environment !== WorkspaceEnvironment.production) {
    console.error(
      `Skipping staging creation for non-production workspace ${workspace.id}.`,
    );
    return;
  }

  if (workspace.stagingWorkspaceId) {
    console.log(
      `Staging workspace already exists for the workspace ${workspace.id}.`,
    );
    return;
  }

  const { canUseStagingWorkspace } = getPlanCapabilities(workspace.plan);

  if (!canUseStagingWorkspace) {
    console.log(
      `The workspace ${workspace.id} does not have required plan to use staging workspace.`,
    );
    return;
  }

  const stagingWorkspaceId = createWorkspaceId();

  await prisma.$transaction(async (tx) => {
    await tx.project.create({
      data: {
        id: stagingWorkspaceId,
        name: `${workspace.name} (Staging)`,
        slug: `${workspace.slug}-staging`,
        logo: workspace.logo,
        environment: WorkspaceEnvironment.staging,
        plan: workspace.plan,
        billingCycleStart: new Date().getDate(),
        invoicePrefix: generateRandomString(8),
        usageLimit: TRIAL_LIMITS.clicks,
        linksLimit: TRIAL_LIMITS.links,
        domainsLimit: TRIAL_LIMITS.domains,
        aiLimit: TRIAL_LIMITS.ai,
        tagsLimit: TRIAL_LIMITS.tags,
        foldersLimit: TRIAL_LIMITS.folders,
        usersLimit: TRIAL_LIMITS.users,
        partnersLimit: TRIAL_LIMITS.partners,
        payoutsLimit: TRIAL_LIMITS.payouts,
        partnerTagsLimit: TRIAL_LIMITS.partnerTags,
        groupsLimit: TRIAL_LIMITS.groups,
        networkInvitesLimit: TRIAL_LIMITS.networkInvites,
        defaultDomains: {
          create: {},
        },
      },
    });

    const { count } = await tx.project.updateMany({
      where: {
        id: workspace.id,
        stagingWorkspaceId: null,
      },
      data: {
        stagingWorkspaceId,
      },
    });

    if (count === 0) {
      throw new Error(
        `Staging workspace already exist for the workspace ${workspace.id}`,
      );
    }
  });

  // Copy the users to the staging workspace
  if (workspace.users.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.projectUsers.createMany({
        skipDuplicates: true,
        data: workspace.users.map((user) => ({
          projectId: stagingWorkspaceId,
          role: user.role,
          userId: user.userId,
        })),
      });

      const workspaceUsers = await tx.projectUsers.findMany({
        where: {
          projectId: stagingWorkspaceId,
        },
        select: {
          id: true,
        },
      });

      await tx.notificationPreference.createMany({
        skipDuplicates: true,
        data: workspaceUsers.map((user) => ({
          projectUserId: user.id,
        })),
      });
    });
  }

  if (workspace.defaultProgramId) {
    await copyProgramToStaging({
      productionProgramId: workspace.defaultProgramId,
      stagingWorkspaceId,
    });
  }
}

async function copyProgramToStaging({
  productionProgramId,
  stagingWorkspaceId,
}: {
  productionProgramId: string;
  stagingWorkspaceId: string;
}) {
  const program = await prisma.program.findUnique({
    where: {
      id: productionProgramId,
    },
  });

  if (!program) {
    return;
  }

  const defaultGroup = await prisma.partnerGroup.findUnique({
    where: {
      id: program.defaultGroupId,
    },
  });

  const folderUsers = await prisma.folderUser.findMany({
    where: {
      folderId: program.defaultFolderId,
    },
  });

  const stagingProgramId = createId({ prefix: "prog_" });
  const defaultFolderId = createId({ prefix: "fold_" });
  const defaultGroupId = createId({ prefix: "grp_" });

  await prisma.$transaction(async (tx) => {
    await tx.folder.create({
      data: {
        id: defaultFolderId,
        name: "Partner Links",
        projectId: stagingWorkspaceId,
        accessLevel: "write",
        users: {
          createMany: {
            data: folderUsers.map((user) => ({
              userId: user.userId,
              role: user.role,
            })),
          },
        },
      },
    });

    await tx.partnerGroup.create({
      data: {
        id: defaultGroupId,
        programId: stagingProgramId,
        name: DEFAULT_PARTNER_GROUP.name,
        slug: DEFAULT_PARTNER_GROUP.slug,
        color: DEFAULT_PARTNER_GROUP.color,
        maxPartnerLinks: defaultGroup?.maxPartnerLinks,
        applicationFormData: defaultGroup?.applicationFormData ?? Prisma.DbNull,
        landerData: defaultGroup?.landerData ?? Prisma.DbNull,
        logo: defaultGroup?.logo,
        wordmark: defaultGroup?.wordmark,
        brandColor: defaultGroup?.brandColor,
        holdingPeriodDays: defaultGroup?.holdingPeriodDays,
      },
    });

    await tx.program.create({
      data: {
        id: stagingProgramId,
        workspaceId: stagingWorkspaceId,
        defaultFolderId,
        defaultGroupId,
        name: `${program.name} (Staging)`,
        slug: `${program.slug}-staging`,
        url: program.url,
        logo: program.logo,
        description: program.description,
        primaryRewardEvent: program.primaryRewardEvent,
        minPayoutAmount: program.minPayoutAmount,
        payoutMode: program.payoutMode,
        applicationRequirements:
          program.applicationRequirements ?? Prisma.DbNull,
        termsUrl: program.termsUrl,
        helpUrl: program.helpUrl,
        supportEmail: program.supportEmail,
      },
    });

    await tx.project.update({
      where: {
        id: stagingWorkspaceId,
      },
      data: {
        defaultProgramId: stagingProgramId,
      },
    });
  });
}
