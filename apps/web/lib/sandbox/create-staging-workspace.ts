import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { TRIAL_LIMITS } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import { generateRandomString } from "../api/utils/generate-random-string";
import { createWorkspaceId } from "../api/workspaces/create-workspace-id";
import { isProductionEnvironment } from "./workspace-guards";

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

  if (!isProductionEnvironment(workspace.environment)) {
    console.error(
      `Skipping staging workspace creation for non-production workspace ${workspace.id}.`,
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
        // Staging workspace will uses the trial limits
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
}
