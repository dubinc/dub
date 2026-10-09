import { prisma } from "@/lib/prisma";
import { TRIAL_LIMITS } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const SLUG_SUFFIX_REGEX = /-staging$/;

async function main() {
  // Manually created staging workspaces are paid production workspaces whose slug ends with -staging
  const manualWorkspaces = await prisma.project.findMany({
    where: {
      environment: WorkspaceEnvironment.production,
      plan: {
        notIn: ["free", "pro"],
      },
      slug: {
        endsWith: "-staging",
      },
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      stripeId: true,
    },
  });

  const productWorkspaceSlugs = manualWorkspaces.map((workspace) =>
    workspace.slug.replace(SLUG_SUFFIX_REGEX, ""),
  );

  const productionWorkspaces = await prisma.project.findMany({
    where: {
      slug: {
        in: productWorkspaceSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      stripeId: true,
    },
  });

  const productionBySlug = new Map(
    productionWorkspaces.map((workspace) => [workspace.slug, workspace]),
  );

  const workspacePairs = manualWorkspaces.flatMap((staging) => {
    const production = productionBySlug.get(
      staging.slug.replace(SLUG_SUFFIX_REGEX, ""),
    );

    if (!production) {
      return [];
    }

    return [
      {
        stagingWorkspaceId: staging.id,
        stagingSlug: staging.slug,
        stagingPlan: staging.plan,
        stagingStripeId: staging.stripeId,
        productionWorkspaceId: production.id,
        productionSlug: production.slug,
        productionPlan: production.plan,
        productionStripeId: production.stripeId,
      },
    ];
  });

  console.table(workspacePairs);

  const programsToSync = await prisma.program.findMany({
    where: {
      workspaceId: {
        in: workspacePairs.map(({ stagingWorkspaceId }) => stagingWorkspaceId),
      },
      environment: {
        not: WorkspaceEnvironment.staging,
      },
    },
    select: {
      id: true,
      slug: true,
      workspaceId: true,
      environment: true,
    },
  });

  console.table(programsToSync);

  if (DRY_RUN) {
    return;
  }

  for (const workspace of workspacePairs) {
    try {
      await linkStagingWorkspace(workspace);
      console.log(
        `Linked ${workspace.productionSlug} -> ${workspace.stagingSlug}`,
      );
    } catch (error) {
      console.error(
        `Failed to link ${workspace.productionSlug} -> ${workspace.stagingSlug}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

// Point the production workspace at the manual staging workspace and mark it (and its programs) as staging.
async function linkStagingWorkspace({
  productionWorkspaceId,
  productionSlug,
  stagingWorkspaceId,
  stagingSlug,
}: {
  productionWorkspaceId: string;
  productionSlug: string;
  stagingWorkspaceId: string;
  stagingSlug: string;
}) {
  await prisma.$transaction(async (tx) => {
    const production = await tx.project.updateMany({
      where: {
        id: productionWorkspaceId,
        environment: WorkspaceEnvironment.production,
        stagingWorkspaceId: null,
      },
      data: {
        stagingWorkspaceId,
      },
    });

    if (production.count === 0) {
      throw new Error(
        `${productionSlug} is not a production workspace or is already linked.`,
      );
    }

    const staging = await tx.project.updateMany({
      where: {
        id: stagingWorkspaceId,
        environment: {
          not: WorkspaceEnvironment.sandbox,
        },
        stagingWorkspaceId: null,
      },
      data: {
        environment: WorkspaceEnvironment.staging,
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
      },
    });

    if (staging.count === 0) {
      throw new Error(
        `${stagingSlug} is a sandbox workspace or has its own staging workspace.`,
      );
    }

    await tx.program.updateMany({
      where: {
        workspaceId: stagingWorkspaceId,
        environment: {
          not: WorkspaceEnvironment.staging,
        },
      },
      data: {
        environment: WorkspaceEnvironment.staging,
      },
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
