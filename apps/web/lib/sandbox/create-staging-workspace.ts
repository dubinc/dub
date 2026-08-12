import { createId } from "@/lib/api/create-id";
import { addDomainToVercel } from "@/lib/api/domains/add-domain-vercel";
import { createLink } from "@/lib/api/links";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LINK_PROPS, TRIAL_LIMITS } from "@dub/utils";
import { Project, WorkspaceEnvironment } from "@prisma/client";
import { generateRandomString } from "../api/utils/generate-random-string";
import { createWorkspaceId } from "../api/workspaces/create-workspace-id";
import { STAGING_DUB_DOMAIN_SUFFIX } from "./constants";
import { isProductionEnvironment } from "./environment";

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
      // Don't copy machine users — staging sync intentionally excludes them
      users: {
        where: {
          user: {
            isMachine: false,
          },
        },
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

  const stagingWorkspaceId =
    workspace.stagingWorkspaceId ?? createWorkspaceId();

  if (!workspace.stagingWorkspaceId) {
    await prisma.$transaction(async (tx) => {
      await tx.project.create({
        data: {
          id: stagingWorkspaceId,
          name: `${workspace.name} (Staging)`,
          slug: `${workspace.slug}-staging`,
          logo: workspace.logo,
          environment: WorkspaceEnvironment.staging,
          plan: workspace.plan,
          defaultProduct: "program",
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
  }

  // Copy non-machine users to the staging workspace
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

  const userId = workspace.users[0]?.userId;

  if (!userId) {
    throw new Error(
      `No user found to create staging domain for workspace ${workspace.id}.`,
    );
  }

  const domain = `${workspace.slug}${STAGING_DUB_DOMAIN_SUFFIX}`;

  if (process.env.VERCEL === "1") {
    const vercelResponse = await addDomainToVercel(domain);

    if (
      vercelResponse.error &&
      vercelResponse.error.code !== "domain_already_in_use"
    ) {
      throw new Error(
        `Failed to add staging domain ${domain} to Vercel: ${JSON.stringify(vercelResponse.error)}`,
      );
    }
  }

  const existingDomain = await prisma.domain.findUnique({
    where: {
      slug: domain,
    },
    select: {
      projectId: true,
    },
  });

  if (!existingDomain) {
    await prisma.domain.create({
      data: {
        id: createId({ prefix: "dom_" }),
        slug: domain,
        projectId: stagingWorkspaceId,
        primary: true,
        verified: true,
      },
    });
  } else if (existingDomain.projectId !== stagingWorkspaceId) {
    throw new Error(
      `Domain ${domain} already exists under a different workspace (${existingDomain.projectId}).`,
    );
  }

  const existingRootLink = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key: "_root",
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingRootLink) {
    await createLink({
      ...DEFAULT_LINK_PROPS,
      domain,
      key: "_root",
      url: "",
      tags: undefined,
      userId,
      projectId: stagingWorkspaceId,
    });
  }
}

export async function queueCreateStagingWorkspace({
  id,
  plan,
  defaultProgramId,
}: Pick<Project, "id" | "plan" | "defaultProgramId">) {
  if (!defaultProgramId) {
    return;
  }

  const { canUseStagingWorkspace } = getPlanCapabilities(plan);

  if (!canUseStagingWorkspace) {
    return;
  }

  const { createStagingWorkspaceJob } = await import(
    "../jobs/handlers/create-staging-workspace-job"
  );

  await createStagingWorkspaceJob.dispatch(
    { workspaceId: id },
    { deduplicationId: `create-staging-workspace-${id}` },
  );
}
