import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import { WorkspaceEnvironment } from "@dub/prisma/client";
import { nanoid, TRIAL_LIMITS } from "@dub/utils";
import { generateRandomString } from "../utils/generate-random-string";
import { createWorkspaceId } from "./create-workspace-id";

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
      "Failed to find workspace in createStagingWorkspace",
      workspaceId,
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

  await prisma.$transaction([
    // Create a staging workspace
    prisma.project.create({
      data: {
        id: stagingWorkspaceId,
        name: `${workspace.name} [STAGING]`,
        slug: `${workspace.slug}-staging`,
        logo: workspace.logo,
        environment: WorkspaceEnvironment.staging,
        plan: workspace.plan,
        billingCycleStart: new Date().getDate(),
        invoicePrefix: generateRandomString(8),
        inviteCode: nanoid(24),
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
    }),

    // Update live to point to the staging workspace
    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        stagingWorkspaceId,
      },
    }),
  ]);

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
