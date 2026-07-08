import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, TRIAL_LIMITS } from "@dub/utils";
import { Project, WorkspaceEnvironment } from "@prisma/client";
import { generateRandomString } from "../api/utils/generate-random-string";
import { createWorkspaceId } from "../api/workspaces/create-workspace-id";
import { qstash } from "../cron";
import { isProductionEnvironment } from "./workspace-guards";

export async function createStagingWorkspace(workspaceId: string) {
  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      environment: true,
      plan: true,
      stagingWorkspaceId: true,
      defaultProgramId: true,
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

  if (!workspace.defaultProgramId) {
    console.log(
      `Skipping staging workspace creation for workspace ${workspace.id} without a default program.`,
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

export async function queueCreateStagingWorkspace({
  id,
  plan,
}: Pick<Project, "id" | "plan">) {
  const { canUseStagingWorkspace } = getPlanCapabilities(plan);

  if (!canUseStagingWorkspace) {
    return;
  }

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/create-staging`,
    deduplicationId: `create-staging-workspace:${id}`,
    body: {
      workspaceId: id,
    },
  });
}
