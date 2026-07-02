import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";

export async function createStagingProgram(workspaceId: string) {
  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      defaultProgramId: true,
      stagingWorkspaceId: true,
    },
  });

  if (!workspace) {
    console.error(`Workspace not found for id ${workspaceId}. Skipping...`);
    return;
  }

  if (!workspace.defaultProgramId) {
    console.error(
      `Default program not found for workspace ${workspaceId}. Skipping...`,
    );
    return;
  }

  const stagingWorkspaceId = workspace.stagingWorkspaceId;

  if (!stagingWorkspaceId) {
    console.error(
      `Staging workspace not found for workspace ${workspace.id}. Skipping...`,
    );
    return;
  }

  const stagingWorkspace = await prisma.project.findUnique({
    where: {
      id: stagingWorkspaceId,
    },
    select: {
      defaultProgramId: true,
    },
  });

  if (stagingWorkspace?.defaultProgramId) {
    console.log(
      `Staging program already exists for workspace ${workspace.id}. Skipping...`,
    );
    return;
  }

  const program = await prisma.program.findUnique({
    where: {
      id: workspace.defaultProgramId,
    },
  });

  if (!program) {
    console.error(
      `Program ${workspace.defaultProgramId} not found. Skipping...`,
    );
    return;
  }

  const [defaultGroup, folderUsers] = await Promise.all([
    prisma.partnerGroup.findUnique({
      where: {
        id: program.defaultGroupId,
      },
    }),

    prisma.folderUser.findMany({
      where: {
        folderId: program.defaultFolderId,
      },
    }),
  ]);

  if (!defaultGroup) {
    console.error(
      `Default group not found for program ${program.id}. Skipping...`,
    );
    return;
  }

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

    const { count } = await tx.project.updateMany({
      where: {
        id: stagingWorkspaceId,
        defaultProgramId: null,
      },
      data: {
        defaultProgramId: stagingProgramId,
      },
    });

    if (count === 0) {
      throw new Error(
        `Staging program already exists for workspace ${workspace.id}`,
      );
    }
  });
}
